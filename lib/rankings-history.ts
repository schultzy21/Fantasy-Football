import { computePowerRankings } from "./power-rankings";
import type { Team } from "./standings";
import type { SleeperMatchup } from "./types";

export type RankingsHistoryPoint = {
  label: string; // "Pre" or "Wk 3"
  ranksByRoster: Map<number, number>;
};

// Rebuilds each team's win/loss/points as of a given week from the raw
// matchup results, rather than trusting roster.settings (which only holds
// the *current*, final totals) -- that's what lets us re-run the power
// ranking formula "as of" any past week.
function teamsThroughWeek(baseTeams: Team[], weeklyMatchups: SleeperMatchup[][], throughIndex: number): Team[] {
  const byRoster = new Map(baseTeams.map((t) => [t.rosterId, { ...t, wins: 0, losses: 0, ties: 0, fpts: 0, fptsAgainst: 0 }]));

  for (let i = 0; i <= throughIndex; i++) {
    const week = weeklyMatchups[i];
    if (!week || week.length === 0) continue;
    const byMatchupId = new Map<number, SleeperMatchup[]>();
    for (const m of week) {
      if (m.matchup_id == null) continue;
      const arr = byMatchupId.get(m.matchup_id) ?? [];
      arr.push(m);
      byMatchupId.set(m.matchup_id, arr);
    }
    for (const pair of byMatchupId.values()) {
      if (pair.length !== 2) continue;
      const [a, b] = pair;
      if (a.points <= 0 && b.points <= 0) continue; // not played yet
      const ta = byRoster.get(a.roster_id);
      const tb = byRoster.get(b.roster_id);
      if (!ta || !tb) continue;
      ta.fpts += a.points;
      ta.fptsAgainst += b.points;
      tb.fpts += b.points;
      tb.fptsAgainst += a.points;
      if (a.points > b.points) {
        ta.wins++;
        tb.losses++;
      } else if (b.points > a.points) {
        tb.wins++;
        ta.losses++;
      } else {
        ta.ties++;
        tb.ties++;
      }
    }
  }

  return Array.from(byRoster.values());
}

export function computeRankingsHistory(
  baseTeams: Team[],
  weeklyMatchups: SleeperMatchup[][],
  preseasonRanks?: Map<number, number>,
): RankingsHistoryPoint[] {
  const points: RankingsHistoryPoint[] = [];

  if (preseasonRanks && preseasonRanks.size > 0) {
    points.push({ label: "Pre", ranksByRoster: preseasonRanks });
  }

  const completedWeekIndexes: number[] = [];
  weeklyMatchups.forEach((week, i) => {
    if (week.length > 0 && week.every((m) => m.points > 0)) completedWeekIndexes.push(i);
  });

  for (const idx of completedWeekIndexes) {
    const snapshot = teamsThroughWeek(baseTeams, weeklyMatchups, idx);

    const completedThroughIdx = completedWeekIndexes.filter((i) => i <= idx);
    const lastThree = completedThroughIdx.slice(-3);
    const recentAvg = new Map<number, number>();
    for (const t of snapshot) {
      const pts = lastThree
        .map((wIdx) => weeklyMatchups[wIdx].find((m) => m.roster_id === t.rosterId)?.points)
        .filter((p): p is number => typeof p === "number");
      if (pts.length > 0) recentAvg.set(t.rosterId, pts.reduce((a, b) => a + b, 0) / pts.length);
    }

    const ranked = computePowerRankings(snapshot, recentAvg);
    const ranksByRoster = new Map(ranked.map((pr) => [pr.team.rosterId, pr.rank]));
    points.push({ label: `Wk ${idx + 1}`, ranksByRoster });
  }

  return points;
}
