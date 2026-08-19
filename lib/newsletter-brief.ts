import type { LineupEfficiency } from "./lineup-efficiency";
import type { WeeklyRecap } from "./recap";
import type { Team } from "./standings";
import type { PlayersMap, SleeperTransaction } from "./types";

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
