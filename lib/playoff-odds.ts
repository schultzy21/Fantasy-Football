import type { Team } from "./standings";
import type { SleeperMatchup } from "./types";

export type PlayoffOddsEntry = {
  team: Team;
  pct: number; // 0-100
};

type RosterStats = { mean: number; stdev: number };

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// Box-Muller transform -- no external RNG library needed for a normal
// sample out of Math.random()'s uniform distribution.
function sampleNormal(m: number, sd: number): number {
  if (sd <= 0) return m;
  const u1 = Math.max(Math.random(), 1e-9);
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return m + z * sd;
}

function recordPct(wins: number, losses: number, ties: number): number {
  const games = wins + losses + ties;
  if (games === 0) return 0;
  return (wins + ties * 0.5) / games;
}

const TRIALS = 3000;

// Monte Carlo playoff-odds simulation: each team's remaining games are
// simulated TRIALS times, drawing a random score from that team's own
// mean/stdev of games already played this season (falling back to the
// league-wide distribution for a team with too little data). After each
// simulated trial plays out every remaining regular-season matchup, final
// standings are ranked the same way the real standings are (record, then
// points-for as the tiebreak) and the top playoffTeamsCount teams are
// marked as "made it" for that trial. The percentage of trials a team made
// the cut is its estimated playoff odds.
export function simulatePlayoffOdds(
  teams: Team[],
  weeklyMatchups: SleeperMatchup[][], // index 0 = week 1, full regular season (played + remaining)
  playoffTeamsCount: number,
): PlayoffOddsEntry[] {
  if (teams.length === 0) return [];

  const scoresByRoster = new Map<number, number[]>();
  for (const t of teams) scoresByRoster.set(t.rosterId, []);
  for (const week of weeklyMatchups) {
    for (const m of week) {
      if (m.points > 0 && scoresByRoster.has(m.roster_id)) {
        scoresByRoster.get(m.roster_id)!.push(m.points);
      }
    }
  }

  const allPlayedScores = Array.from(scoresByRoster.values()).flat();
  const leagueMean = allPlayedScores.length > 0 ? mean(allPlayedScores) : 100;
  const leagueStdev = allPlayedScores.length > 1 ? stdev(allPlayedScores, leagueMean) : 20;

  const statsByRoster = new Map<number, RosterStats>();
  for (const [rosterId, scores] of scoresByRoster) {
    if (scores.length >= 2) {
      const m = mean(scores);
      statsByRoster.set(rosterId, { mean: m, stdev: stdev(scores, m) || leagueStdev * 0.5 });
    } else if (scores.length === 1) {
      statsByRoster.set(rosterId, { mean: scores[0], stdev: leagueStdev * 0.6 });
    } else {
      statsByRoster.set(rosterId, { mean: leagueMean, stdev: leagueStdev });
    }
  }

  // Remaining (not-yet-played) matchup pairs, grouped by week.
  const remainingPairs: { rosterA: number; rosterB: number }[] = [];
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
      if (pair.some((m) => m.points > 0)) continue; // already played
      remainingPairs.push({ rosterA: pair[0].roster_id, rosterB: pair[1].roster_id });
    }
  }

  const madePlayoffs = new Map<number, number>();
  for (const t of teams) madePlayoffs.set(t.rosterId, 0);

  for (let trial = 0; trial < TRIALS; trial++) {
    const simWins = new Map<number, number>();
    const simLosses = new Map<number, number>();
    const simTies = new Map<number, number>();
    const simFpts = new Map<number, number>();
    for (const t of teams) {
      simWins.set(t.rosterId, t.wins);
      simLosses.set(t.rosterId, t.losses);
      simTies.set(t.rosterId, t.ties);
      simFpts.set(t.rosterId, t.fpts);
    }

    for (const { rosterA, rosterB } of remainingPairs) {
      const statsA = statsByRoster.get(rosterA);
      const statsB = statsByRoster.get(rosterB);
      if (!statsA || !statsB) continue;
      const scoreA = Math.max(0, sampleNormal(statsA.mean, statsA.stdev));
      const scoreB = Math.max(0, sampleNormal(statsB.mean, statsB.stdev));
      simFpts.set(rosterA, (simFpts.get(rosterA) ?? 0) + scoreA);
      simFpts.set(rosterB, (simFpts.get(rosterB) ?? 0) + scoreB);
      if (scoreA > scoreB) {
        simWins.set(rosterA, (simWins.get(rosterA) ?? 0) + 1);
        simLosses.set(rosterB, (simLosses.get(rosterB) ?? 0) + 1);
      } else if (scoreB > scoreA) {
        simWins.set(rosterB, (simWins.get(rosterB) ?? 0) + 1);
        simLosses.set(rosterA, (simLosses.get(rosterA) ?? 0) + 1);
      } else {
        simTies.set(rosterA, (simTies.get(rosterA) ?? 0) + 1);
        simTies.set(rosterB, (simTies.get(rosterB) ?? 0) + 1);
      }
    }

    const finalOrder = [...teams].sort((a, b) => {
      const pctDiff =
        recordPct(simWins.get(b.rosterId) ?? 0, simLosses.get(b.rosterId) ?? 0, simTies.get(b.rosterId) ?? 0) -
        recordPct(simWins.get(a.rosterId) ?? 0, simLosses.get(a.rosterId) ?? 0, simTies.get(a.rosterId) ?? 0);
      if (Math.abs(pctDiff) > 1e-9) return pctDiff;
      return (simFpts.get(b.rosterId) ?? 0) - (simFpts.get(a.rosterId) ?? 0);
    });

    for (const team of finalOrder.slice(0, playoffTeamsCount)) {
      madePlayoffs.set(team.rosterId, (madePlayoffs.get(team.rosterId) ?? 0) + 1);
    }
  }

  return teams
    .map((team) => ({ team, pct: Math.round(((madePlayoffs.get(team.rosterId) ?? 0) / TRIALS) * 1000) / 10 }))
    .sort((a, b) => b.pct - a.pct);
}
