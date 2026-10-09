import { statPoints } from "./scoring";
import * as sleeper from "./sleeper";
import type { Team } from "./standings";
import type { SleeperLeague, SleeperMatchup, WeeklyStatsMap } from "./types";

export type LiveOddsSide = {
  team: Team;
  actualPoints: number; // live score so far
  remainingProjected: number; // projected points still "on the board" for starters who haven't exceeded their projection yet
  projectedFinal: number; // actualPoints + remainingProjected
  winProb: number; // 0-1
  moneyline: number; // American odds, e.g. -150 or +130, derived from winProb for display only
};

export type LiveOddsMatchup = {
  matchupId: number;
  teamA: LiveOddsSide;
  teamB: LiveOddsSide;
};

// How decisive a projected-points gap is: lower = a smaller gap swings the
// odds more. Scales up with how many points are still unsettled between
// both sides, so the line is near a coin flip early (most points still
// projected, not real) and sharpens toward 100/0 as the week plays out and
// actual results replace projections.
const BASE_K = 4;
const UNSETTLED_K_FACTOR = 0.5;

function moneylineFor(winProb: number): number {
  const p = Math.min(0.99, Math.max(0.01, winProb));
  return p >= 0.5 ? Math.round((-100 * p) / (1 - p)) : Math.round((100 * (1 - p)) / p);
}

function computeSide(team: Team, m: SleeperMatchup, projections: WeeklyStatsMap, scoring: Record<string, number>) {
  const actualPoints = m.points;
  const starters = (m.starters ?? []).filter((id) => id && id !== "0");
  const playerPoints = m.players_points ?? {};

  let remainingProjected = 0;
  for (const playerId of starters) {
    const projected = statPoints(projections[playerId], scoring);
    const actual = playerPoints[playerId] ?? 0;
    remainingProjected += Math.max(0, projected - actual);
  }

  return { team, actualPoints, remainingProjected, projectedFinal: actualPoints + remainingProjected };
}

// Live, self-updating odds for one in-progress week -- "projected final" per
// team is their current score plus whatever's left on the board for
// starters who haven't yet matched their weekly projection. Returns null
// once every matchup that week is fully played (the line closes), or if the
// week hasn't been scheduled yet.
export async function computeLiveOdds(
  league: SleeperLeague,
  week: number,
  weekMatchups: SleeperMatchup[],
  teamsByRoster: Map<number, Team>,
): Promise<LiveOddsMatchup[] | null> {
  if (weekMatchups.length === 0) return null;
  const isWeekComplete = weekMatchups.every((m) => m.points > 0);
  if (isWeekComplete) return null;

  const projections = await sleeper.getProjections(league.season, week).catch(() => ({}) as WeeklyStatsMap);
  const scoring = league.scoring_settings;

  const byMatchupId = new Map<number, SleeperMatchup[]>();
  for (const m of weekMatchups) {
    if (m.matchup_id == null) continue;
    const arr = byMatchupId.get(m.matchup_id) ?? [];
    arr.push(m);
    byMatchupId.set(m.matchup_id, arr);
  }

  const results: LiveOddsMatchup[] = [];
  for (const [matchupId, pair] of byMatchupId) {
    if (pair.length !== 2) continue;
    const [m1, m2] = pair;
    const t1 = teamsByRoster.get(m1.roster_id);
    const t2 = teamsByRoster.get(m2.roster_id);
    if (!t1 || !t2) continue;

    const side1 = computeSide(t1, m1, projections, scoring);
    const side2 = computeSide(t2, m2, projections, scoring);

    const diff = side1.projectedFinal - side2.projectedFinal;
    const unsettled = side1.remainingProjected + side2.remainingProjected;
    const K = BASE_K + unsettled * UNSETTLED_K_FACTOR;
    const winProb1 = 1 / (1 + Math.pow(10, -diff / K));

    results.push({
      matchupId,
      teamA: { ...side1, winProb: winProb1, moneyline: moneylineFor(winProb1) },
      teamB: { ...side2, winProb: 1 - winProb1, moneyline: moneylineFor(1 - winProb1) },
    });
  }

  return results.length > 0 ? results : null;
}
