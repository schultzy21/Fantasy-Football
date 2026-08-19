import { computeDraftStrength } from "./draft-strength";
import type { PowerRank } from "./power-rankings";
import type { PredictionsOutlook } from "./predictions";
import type { Team } from "./standings";
import type { SleeperDraftPick, SleeperMatchup } from "./types";

// Before any games are played, "power" can only mean draft capital: how good
// the roster looks on paper. Ranked purely by average draft-pick value.
export function computePreseasonPowerRankings(
  teams: Team[],
  draftPicks: (SleeperDraftPick & { playerName: string })[],
): PowerRank[] {
  if (teams.length === 0) return [];
  const teamsByRoster = new Map(teams.map((t) => [t.rosterId, t]));
  const strength = computeDraftStrength(draftPicks, teamsByRoster);

  const scored = teams.map((t) => ({ team: t, score: strength.get(t.rosterId)?.score ?? 50 }));
  scored.sort((a, b) => b.score - a.score);

  return scored.map((s, i) => ({ team: s.team, rank: i + 1, score: s.score, trend: "new" as const }));
}

// Projects the season using draft-capital scores as team strength and the
// real schedule Sleeper generates before any scores exist (matchup_id
// pairings per week). Each matchup's win probability comes from an Elo-style
// logistic on the strength gap; a team's projected record is the sum of
// those probabilities across every scheduled game.
export function computePreseasonPredictions(
  preseasonPowerRankings: PowerRank[],
  playoffTeamsCount: number,
  weeklyMatchups: SleeperMatchup[][],
): PredictionsOutlook & { projectedWins: Map<number, number> } {
  const scoreByRoster = new Map(preseasonPowerRankings.map((pr) => [pr.team.rosterId, pr.score]));
  const expectedWins = new Map<number, number>();
  for (const pr of preseasonPowerRankings) expectedWins.set(pr.team.rosterId, 0);

  const K = 15; // controls how decisive a strength gap is; lower = more decisive
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
      const [a, b] = pair;
      const scoreA = scoreByRoster.get(a.roster_id) ?? 50;
      const scoreB = scoreByRoster.get(b.roster_id) ?? 50;
      const pA = 1 / (1 + Math.pow(10, -(scoreA - scoreB) / K));
      expectedWins.set(a.roster_id, (expectedWins.get(a.roster_id) ?? 0) + pA);
      expectedWins.set(b.roster_id, (expectedWins.get(b.roster_id) ?? 0) + (1 - pA));
    }
  }

  const byProjectedRecord = [...preseasonPowerRankings].sort((a, b) => {
    const winsDiff = (expectedWins.get(b.team.rosterId) ?? 0) - (expectedWins.get(a.team.rosterId) ?? 0);
    if (Math.abs(winsDiff) > 1e-9) return winsDiff;
    return b.score - a.score;
  });

  const cutoff = Math.min(playoffTeamsCount || 6, byProjectedRecord.length);
  const inTheHunt = byProjectedRecord.slice(0, cutoff);
  const bubbleWatch = byProjectedRecord.slice(cutoff, cutoff + 2);
  const onTheOutside = byProjectedRecord.slice(cutoff + 2);
  const favorite = byProjectedRecord[0] ?? null;

  // Darkhorses: teams just outside the cutoff whose projected win total is
  // close to the last playoff spot -- i.e. a real shot, not a long one.
  const bubbleLine = expectedWins.get(byProjectedRecord[cutoff - 1]?.team.rosterId ?? -1) ?? 0;
  const darkhorses = byProjectedRecord
    .slice(cutoff)
    .filter((pr) => bubbleLine - (expectedWins.get(pr.team.rosterId) ?? 0) <= 1.5)
    .slice(0, 2);

  const lastPlacePace = byProjectedRecord[byProjectedRecord.length - 1] ?? null;

  return {
    hasEnoughData: true,
    inTheHunt,
    bubbleWatch,
    onTheOutside,
    favorite,
    darkhorses,
    lastPlacePace,
    projectedWins: expectedWins,
  };
}
