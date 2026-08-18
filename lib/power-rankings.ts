import type { Team } from "./standings";
import { winPct } from "./standings";

export type PowerRank = {
  team: Team;
  rank: number;
  score: number; // 0-100
  trend: "up" | "down" | "flat" | "new";
};

// Blend record and scoring output, not record alone. Both components are
// normalized 0-1 across the league so one gaudy blowout win can't fully
// dominate the ranking.
export function computePowerRankings(teams: Team[], recentAvgByRoster?: Map<number, number>): PowerRank[] {
  if (teams.length === 0) return [];

  const maxFpts = Math.max(...teams.map((t) => t.fpts), 1);
  const minFpts = Math.min(...teams.map((t) => t.fpts), 0);
  const fptsRange = maxFpts - minFpts || 1;

  const recentVals = teams.map((t) => recentAvgByRoster?.get(t.rosterId) ?? 0);
  const maxRecent = Math.max(...recentVals, 1);
  const minRecent = Math.min(...recentVals, 0);
  const recentRange = maxRecent - minRecent || 1;

  const scored = teams.map((t) => {
    const recordScore = winPct(t); // 0-1
    const pointsScore = (t.fpts - minFpts) / fptsRange; // 0-1
    const recentScore = recentAvgByRoster
      ? ((recentAvgByRoster.get(t.rosterId) ?? 0) - minRecent) / recentRange
      : pointsScore;

    // 50% record, 35% season scoring output, 15% recent form.
    const blended = 0.5 * recordScore + 0.35 * pointsScore + 0.15 * recentScore;
    return { team: t, score: Math.round(blended * 1000) / 10 };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.map((s, i) => ({
    team: s.team,
    rank: i + 1,
    score: s.score,
    trend: "flat" as const,
  }));
}
