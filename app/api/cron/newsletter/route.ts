import { NextRequest, NextResponse } from "next/server";
import { generateNewsletter } from "@/lib/claude";
import { computeLineupEfficiency } from "@/lib/lineup-efficiency";
import { buildLatestCompletedRecap } from "@/lib/recap";
import * as sleeper from "@/lib/sleeper";
import { buildTeams } from "@/lib/standings";
import { supabase } from "@/lib/supabase";
import { buildNewsletterBrief, summarizeTransactions } from "@/lib/newsletter-brief";
import type { SleeperMatchup } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_REGULAR_SEASON_WEEKS = 14;
const MAX_WEEKS = 18;

// Fires every Tuesday morning (see vercel.json) -- after Monday Night
// Football has wrapped, so the prior week is fully final. Also callable by
// hand (e.g. `curl -X POST .../api/cron/newsletter`) if a run needs a retry.
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

  const leagueId = process.env.SLEEPER_LEAGUE_ID;
  if (!leagueId) {
    return NextResponse.json({ error: "SLEEPER_LEAGUE_ID is not set." }, { status: 500 });
  }

  try {
    const [league, state, users, rosters] = await Promise.all([
      sleeper.getLeague(leagueId),
      sleeper.getState(),
      sleeper.getUsers(leagueId),
      sleeper.getRosters(leagueId),
    ]);

    const teams = buildTeams(league, users, rosters);
    const teamsByRoster = new Map(teams.map((t) => [t.rosterId, t]));

    const lastRegularWeek = Math.min(
      (league.settings.playoff_week_start ?? DEFAULT_REGULAR_SEASON_WEEKS + 1) - 1,
      MAX_WEEKS,
    );
    const weekNumbers = Array.from({ length: Math.max(lastRegularWeek, 1) }, (_, i) => i + 1);
    const weeklyMatchups: SleeperMatchup[][] = await Promise.all(
      weekNumbers.map((w) => sleeper.getMatchups(leagueId, w).catch(() => [] as SleeperMatchup[])),
    );

    const recap = buildLatestCompletedRecap(weeklyMatchups, teamsByRoster);
    const isPreseason = !recap;
    const targetWeek = recap?.week ?? state.week;

    // Idempotent: don't regenerate (and re-spend on web search) if this
    // week's issue already exists.
    const { data: existing } = await supabase
      .from("generated_content")
      .select("newsletter_article")
      .eq("season", league.season)
      .eq("week", targetWeek)
      .maybeSingle();
    if (existing?.newsletter_article) {
      return NextResponse.json({ skipped: `Newsletter for ${league.season} week ${targetWeek} already exists.` });
    }

    let draftHighlights: string[] = [];
    let transactionsSummary: ReturnType<typeof summarizeTransactions> = [];
    let lineupEfficiency: ReturnType<typeof computeLineupEfficiency> = [];

    if (isPreseason) {
      try {
        const drafts = await sleeper.getDrafts(leagueId);
        const draft = drafts[0];
        if (draft) {
          const picks = await sleeper.getDraftPicks(draft.draft_id);
          const players = await sleeper.getPlayers();
          draftHighlights = picks
            .sort((a, b) => a.pick_no - b.pick_no)
            .slice(0, 20)
            .map((p) => {
              const name =
                p.metadata?.first_name && p.metadata?.last_name
                  ? `${p.metadata.first_name} ${p.metadata.last_name}`
                  : players[p.player_id]?.full_name ?? "Unknown Player";
              const team = teamsByRoster.get(p.roster_id)?.teamName ?? `Roster ${p.roster_id}`;
              return `Pick ${p.pick_no}: ${team} took ${name} (${p.metadata?.position ?? ""})`;
            });
        }
      } catch {
        // Fine to run without draft highlights if this fails.
      }
    } else {
      const players = await sleeper.getPlayers();
      const weekIndex = targetWeek - 1;
      const weekMatchups = weeklyMatchups[weekIndex] ?? [];

      lineupEfficiency = computeLineupEfficiency(weekMatchups, teamsByRoster, league.roster_positions, players);

      const weekPointsByPlayer = new Map<string, number>();
      for (const m of weekMatchups) {
        for (const [playerId, pts] of Object.entries(m.players_points ?? {})) {
          weekPointsByPlayer.set(playerId, pts);
        }
      }

      const transactions = await sleeper.getTransactions(leagueId, targetWeek).catch(() => []);
      transactionsSummary = summarizeTransactions(transactions, teamsByRoster, players, weekPointsByPlayer);
    }

    const newsletterBrief = buildNewsletterBrief({
      leagueName: league.name.trim(),
      season: league.season,
      week: targetWeek,
      isPreseason,
      recap,
      transactions: transactionsSummary,
      lineupEfficiency,
      draftHighlights,
    });

    const generated = await generateNewsletter(newsletterBrief);
    if (!generated) {
      return NextResponse.json({ error: "Claude did not return a usable newsletter." }, { status: 502 });
    }

    await supabase.from("generated_content").upsert(
      {
        season: league.season,
        week: targetWeek,
        newsletter_headline: generated.headline,
        newsletter_article: generated.article,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "season,week" },
    );

    return NextResponse.json({ ok: true, season: league.season, week: targetWeek, headline: generated.headline });
  } catch (err) {
    console.error("newsletter cron failed", err);
    return NextResponse.json({ error: "Something went wrong generating the newsletter." }, { status: 500 });
  }
}
