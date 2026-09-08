import { computeLineupEfficiency, type LineupEfficiency } from "./lineup-efficiency";
import { buildLatestCompletedRecap, type WeeklyRecap } from "./recap";
import * as sleeper from "./sleeper";
import { buildTeams, type Team } from "./standings";
import type { PlayersMap, SleeperMatchup, SleeperTransaction } from "./types";

const DEFAULT_REGULAR_SEASON_WEEKS = 14;
const MAX_WEEKS = 18;

export type TransactionSummary = {
  teamName: string;
  adds: { playerName: string; points: number | null }[];
  drops: string[];
};

export function summarizeTransactions(
  transactions: SleeperTransaction[],
  teamsByRoster: Map<number, Team>,
  players: PlayersMap,
  weekPointsByPlayer: Map<string, number>,
): TransactionSummary[] {
  const byRoster = new Map<number, TransactionSummary>();

  const nameFor = (playerId: string) => {
    if (players[playerId]) return players[playerId].full_name ?? playerId;
    // DEF slots use the team abbreviation directly as the "player id".
    if (/^[A-Z]{2,4}$/.test(playerId)) return `${playerId} D/ST`;
    return playerId;
  };

  for (const t of transactions) {
    if (t.status !== "complete") continue;
    for (const [playerId, rosterId] of Object.entries(t.adds ?? {})) {
      const team = teamsByRoster.get(rosterId);
      if (!team) continue;
      const entry = byRoster.get(rosterId) ?? { teamName: team.teamName, adds: [], drops: [] };
      entry.adds.push({ playerName: nameFor(playerId), points: weekPointsByPlayer.get(playerId) ?? null });
      byRoster.set(rosterId, entry);
    }
    for (const [playerId, rosterId] of Object.entries(t.drops ?? {})) {
      const team = teamsByRoster.get(rosterId);
      if (!team) continue;
      const entry = byRoster.get(rosterId) ?? { teamName: team.teamName, adds: [], drops: [] };
      entry.drops.push(nameFor(playerId));
      byRoster.set(rosterId, entry);
    }
  }

  return Array.from(byRoster.values());
}

// Richer brief than the numeric one -- built specifically for the automated
// weekly newsletter, which also gets real NFL news via Claude's web search.
export function buildNewsletterBrief(input: {
  leagueName: string;
  season: string;
  week: number;
  isPreseason: boolean;
  recap: WeeklyRecap | null;
  transactions: TransactionSummary[];
  lineupEfficiency: LineupEfficiency[];
  draftHighlights: string[]; // used only in preseason mode
}): string {
  const { leagueName, season, week, isPreseason, recap, transactions, lineupEfficiency, draftHighlights } = input;
  const lines: string[] = [];

  lines.push(`League: ${leagueName} -- ${season} season.`);

  if (isPreseason) {
    lines.push("STATUS: preseason -- the draft has happened but no real games have been played yet.");
    if (draftHighlights.length > 0) {
      lines.push("NOTABLE DRAFT PICKS:");
      draftHighlights.forEach((h) => lines.push(`  ${h}`));
    }
    return lines.join("\n");
  }

  lines.push(`This issue covers Week ${week}.`);
  lines.push("");

  if (recap) {
    lines.push("MATCHUP RESULTS:");
    for (const m of recap.matchups) {
      const result = m.winner === null ? "TIE" : `${m.winner.teamName} won`;
      lines.push(
        `  ${m.teamA.team.teamName} ${m.teamA.points.toFixed(1)} vs ${m.teamB.team.teamName} ${m.teamB.points.toFixed(1)} -- ${result}`,
      );
    }
    if (recap.highScorer) lines.push(`  Top score: ${recap.highScorer.team.teamName} (${recap.highScorer.points.toFixed(1)})`);
    if (recap.lowScorer) lines.push(`  Lowest score: ${recap.lowScorer.team.teamName} (${recap.lowScorer.points.toFixed(1)})`);
  }
  lines.push("");

  lines.push("LINEUP DECISIONS (points left on the bench, worst first):");
  lineupEfficiency.slice(0, 6).forEach((le) => {
    lines.push(
      `  ${le.team.teamName}: started ${le.actualPoints.toFixed(1)}, optimal lineup would have been ${le.optimalPoints.toFixed(1)} (${le.pointsLeftOnBench.toFixed(1)} left on the bench)` +
        (le.worstMiss
          ? ` -- benched ${le.worstMiss.benchedPlayerName} (${le.worstMiss.benchedPoints.toFixed(1)} pts) over ${le.worstMiss.starterPlayerName} (${le.worstMiss.starterPoints.toFixed(1)} pts)`
          : ""),
    );
  });
  lines.push("");

  if (transactions.length > 0) {
    lines.push("WAIVER/FREE AGENT MOVES THIS WEEK:");
    for (const t of transactions) {
      const addStr = t.adds.map((a) => `${a.playerName}${a.points != null ? ` (scored ${a.points.toFixed(1)} for them this week)` : ""}`).join(", ");
      const dropStr = t.drops.join(", ");
      lines.push(`  ${t.teamName}: added ${addStr || "none"}; dropped ${dropStr || "none"}`);
    }
  } else {
    lines.push("WAIVER/FREE AGENT MOVES THIS WEEK: none.");
  }

  return lines.join("\n");
}

export type NewsletterBriefContext = {
  season: string;
  targetWeek: number;
  isPreseason: boolean;
  brief: string;
};

// All the data-gathering behind the newsletter brief, shared by the
// automatic cron route (app/api/cron/newsletter) and the plain-text
// on-demand endpoint (app/api/newsletter-brief) used for the manual
// "ask Claude to write this week's newsletter" workflow.
export async function getNewsletterBriefContext(leagueId: string): Promise<NewsletterBriefContext> {
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

  let draftHighlights: string[] = [];
  let transactionsSummary: TransactionSummary[] = [];
  let lineupEfficiency: LineupEfficiency[] = [];

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

  const brief = buildNewsletterBrief({
    leagueName: league.name.trim(),
    season: league.season,
    week: targetWeek,
    isPreseason,
    recap,
    transactions: transactionsSummary,
    lineupEfficiency,
    draftHighlights,
  });

  return { season: league.season, targetWeek, isPreseason, brief };
}
