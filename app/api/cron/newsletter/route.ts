import { NextRequest, NextResponse } from "next/server";
import { generateNewsletter } from "@/lib/claude";
import { getNewsletterBriefContext } from "@/lib/newsletter-brief";
import { getLeagueId } from "@/lib/sleeper";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Only relevant if you've added an ANTHROPIC_API_KEY -- otherwise this
// route just no-ops. See /api/newsletter-brief for the key-free workflow
// (ask Claude to write the newsletter by hand each week).
// Fires every Tuesday morning (see vercel.json) -- after Monday Night
// Football has wrapped, so the prior week is fully final.
export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ skipped: "No ANTHROPIC_API_KEY configured -- newsletter generation is off." });
  }
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured, nowhere to save the newsletter." }, { status: 500 });
  }

  try {
    const { season, targetWeek, brief } = await getNewsletterBriefContext(getLeagueId());

    // Idempotent: don't regenerate (and re-spend on web search) if this
    // week's issue already exists.
    const { data: existing } = await supabase
      .from("generated_content")
      .select("newsletter_article")
      .eq("season", season)
      .eq("week", targetWeek)
      .maybeSingle();
    if (existing?.newsletter_article) {
      return NextResponse.json({ skipped: `Newsletter for ${season} week ${targetWeek} already exists.` });
    }

    const generated = await generateNewsletter(brief);
    if (!generated) {
      return NextResponse.json({ error: "Claude did not return a usable newsletter." }, { status: 502 });
    }

    await supabase.from("generated_content").upsert(
      {
        season,
        week: targetWeek,
        newsletter_headline: generated.headline,
        newsletter_article: generated.article,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "season,week" },
    );

    return NextResponse.json({ ok: true, season, week: targetWeek, headline: generated.headline });
  } catch (err) {
    console.error("newsletter cron failed", err);
    return NextResponse.json({ error: "Something went wrong generating the newsletter." }, { status: 500 });
  }
}
