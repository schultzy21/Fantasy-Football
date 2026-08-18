import type { Team } from "./standings";
import type { SleeperMatchup } from "./types";

export type MatchupResult = {
  matchupId: number;
  teamA: { team: Team; points: number };
  teamB: { team: Team; points: number };
  winner: Team | null;
};

export type WeeklyRecap = {
  week: number;
  matchups: MatchupResult[];
  highScorer: { team: Team; points: number } | null;
  lowScorer: { team: Team; points: number } | null;
};

// Finds the most recent week where every matchup has a nonzero score,
// i.e. the last fully completed week. Returns null before Week 1 finishes.
export function buildLatestCompletedRecap(
  weeklyMatchups: SleeperMatchup[][], // index 0 = week 1
  teamsByRoster: Map<number, Team>,
): WeeklyRecap | null {
  for (let i = weeklyMatchups.length - 1; i >= 0; i--) {
    const week = weeklyMatchups[i];
    if (week.length === 0) continue;
    const complete = week.every((m) => m.points > 0);
    if (!complete) continue;

    const byMatchupId = new Map<number, SleeperMatchup[]>();
    for (const m of week) {
      if (m.matchup_id == null) continue;
      const arr = byMatchupId.get(m.matchup_id) ?? [];
      arr.push(m);
      byMatchupId.set(m.matchup_id, arr);
    }

    const matchups: MatchupResult[] = [];
    let highScorer: { team: Team; points: number } | null = null;
    let lowScorer: { team: Team; points: number } | null = null;

    for (const [matchupId, pair] of byMatchupId.entries()) {
      if (pair.length !== 2) continue;
      const [m1, m2] = pair;
      const t1 = teamsByRoster.get(m1.roster_id);
      const t2 = teamsByRoster.get(m2.roster_id);
      if (!t1 || !t2) continue;

      const winner = m1.points === m2.points ? null : m1.points > m2.points ? t1 : t2;
      matchups.push({
        matchupId,
        teamA: { team: t1, points: m1.points },
        teamB: { team: t2, points: m2.points },
        winner,
      });

      for (const [team, points] of [
        [t1, m1.points],
        [t2, m2.points],
      ] as const) {
        if (!highScorer || points > highScorer.points) highScorer = { team, points };
        if (!lowScorer || points < lowScorer.points) lowScorer = { team, points };
      }
    }

    if (matchups.length === 0) continue;
    return { week: i + 1, matchups, highScorer, lowScorer };
  }
  return null;
}
