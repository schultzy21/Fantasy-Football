import { NextResponse } from "next/server";
import { claudeConfigured, generateWriteups } from "@/lib/claude";
import { getLeagueData } from "@/lib/league-data";
import { getLeagueId } from "@/lib/sleeper";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!claudeConfigured()) {
    return NextResponse.json(
      { error: "No ANTHROPIC_API_KEY is configured on this deployment." },
      { status: 400 },
    );
  }

  try {
    const data = await getLeagueData(getLeagueId());
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
          position_group_blurbs: generated.positionGroupBlurbs,
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
