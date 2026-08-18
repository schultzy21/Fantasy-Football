import type { PowerRank } from "./power-rankings";
import type { Team } from "./standings";
import { winPct } from "./standings";
import type { SleeperMatchup } from "./types";

export type PredictionsOutlook = {
  hasEnoughData: boolean;
  inTheHunt: PowerRank[];
  bubbleWatch: PowerRank[];
  onTheOutside: PowerRank[];
  favorite: PowerRank | null;
  darkhorses: PowerRank[];
  lastPlacePace: PowerRank | null;
};

// weeklyMatchups covers every regular-season week, whether it's been
// played yet or not -- Sleeper generates the full schedule (matchup_id
// pairings) up front, it just has no points until the games happen.
export function computePredictions(
  powerRankings: PowerRank[],
  teams: Team[],
  playoffTeamsCount: number,
  weeklyMatchups: SleeperMatchup[][],
  currentWeek: number,
): PredictionsOutlook {
  const gamesPlayed = teams.reduce((sum, t) => sum + t.wins + t.losses + t.ties, 0);
  const hasEnoughData = gamesPlayed >= teams.length; // roughly one full week done

  if (!hasEnoughData || powerRankings.length === 0) {
    return {
      hasEnoughData: false,
      inTheHunt: [],
      bubbleWatch: [],
      onTheOutside: [],
      favorite: null,
      darkhorses: [],
      lastPlacePace: null,
    };
  }

  const byStandings = [...powerRankings].sort((a, b) => {
    const pctDiff = winPct(b.team) - winPct(a.team);
    if (Math.abs(pctDiff) > 1e-9) return pctDiff;
    return b.team.fpts - a.team.fpts;
  });

  const cutoff = Math.min(playoffTeamsCount || 6, byStandings.length);
  const inTheHunt = byStandings.slice(0, cutoff);
  const bubbleWatch = byStandings.slice(cutoff, cutoff + 2);
  const onTheOutside = byStandings.slice(cutoff + 2);

  // Remaining strength of schedule: average win% of a team's not-yet-played
  // opponents, using current standings as the best available proxy.
  const winPctByRoster = new Map(teams.map((t) => [t.rosterId, winPct(t)]));
  const sosByRoster = new Map<number, number>();
  for (const week of weeklyMatchups) {
    const byMatchupId = new Map<number, SleeperMatchup[]>();
    for (const m of week) {
      if (m.matchup_id == null) continue;
      const arr = byMatchupId.get(m.matchup_id) ?? [];
      arr.push(m);
      byMatchupId.set(m.matchup_id, arr);
    }
    for (const pair of byMatchupId.values()) {
      if (pair.length !== 2) continue;
      const alreadyPlayed = pair.some((m) => m.points > 0);
      if (alreadyPlayed) continue;
      const [a, b] = pair;
      sosByRoster.set(a.roster_id, (sosByRoster.get(a.roster_id) ?? 0) + (winPctByRoster.get(b.roster_id) ?? 0));
      sosByRoster.set(b.roster_id, (sosByRoster.get(b.roster_id) ?? 0) + (winPctByRoster.get(a.roster_id) ?? 0));
    }
  }

  const favorite =
    inTheHunt.find((pr) => pr.rank === byStandings[0]?.rank) ?? byStandings[0] ?? null;

  // Darkhorses: teams outside the top of the pack but scoring well relative
  // to their record (i.e. unlucky so far, or a weak remaining schedule).
  const darkhorses = byStandings
    .slice(cutoff)
    .map((pr) => {
      const avgSos = (sosByRoster.get(pr.team.rosterId) ?? 0.5 * teams.length) / Math.max(teams.length, 1);
      const pointsRank = [...teams].sort((a, b) => b.fpts - a.fpts).findIndex((t) => t.rosterId === pr.team.rosterId);
      return { pr, avgSos, pointsRank };
    })
    .filter((x) => x.pointsRank <= Math.ceil(teams.length / 2)) // decent scoring output
    .sort((a, b) => a.avgSos - b.avgSos || a.pointsRank - b.pointsRank)
    .slice(0, 2)
    .map((x) => x.pr);

  const lastPlacePace = byStandings[byStandings.length - 1] ?? null;

  return { hasEnoughData: true, inTheHunt, bubbleWatch, onTheOutside, favorite, darkhorses, lastPlacePace };
}
