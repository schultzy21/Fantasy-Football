import { NextResponse } from "next/server";
import { claudeConfigured, generateWriteups } from "@/lib/claude";
import { getLeagueData } from "@/lib/league-data";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!claudeConfigured()) {
    return NextResponse.json(
      { error: "No ANTHROPIC_API_KEY is configured on this deployment." },
      { status: 400 },
    );
  }

  const leagueId = process.env.SLEEPER_LEAGUE_ID;
  if (!leagueId) {
    return NextResponse.json({ error: "SLEEPER_LEAGUE_ID is not set." }, { status: 500 });
  }

  try {
    const data = await getLeagueData(leagueId);
    const generated = await generateWriteups(data.brief);
    if (!generated) {
      return NextResponse.json({ error: "Claude did not return a usable response." }, { status: 502 });
    }

    if (supabase) {
      await supabase.from("generated_content").upsert(
        {
          season: data.season,
          week: data.state.week,
          weekly_recap: generated.weeklyRecap,
          power_ranking_blurbs: generated.powerRankingBlurbs,
          predictions_outlook: generated.predictionsOutlook,
          banter_roast: generated.banterRoast,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "season,week" },
      );
    }

    return NextResponse.json({ generated });
  } catch (err) {
    console.error("generate route failed", err);
    return NextResponse.json({ error: "Something went wrong generating the write-up." }, { status: 500 });
  }
}
