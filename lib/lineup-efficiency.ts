import type { Team } from "./standings";
import type { PlayersMap, SleeperMatchup } from "./types";

export type LineupEfficiency = {
  team: Team;
  actualPoints: number;
  optimalPoints: number;
  pointsLeftOnBench: number;
  // The single biggest miss: a bench player who outscored a starter at the
  // same eligible position.
  worstMiss: { benchedPlayerName: string; benchedPoints: number; starterPlayerName: string; starterPoints: number } | null;
};

const FLEX_ELIGIBLE = ["RB", "WR", "TE"];
const SUPERFLEX_ELIGIBLE = ["QB", "RB", "WR", "TE"];

function slotCounts(rosterPositions: string[]): { fixed: Record<string, number>; flex: number; superflex: number } {
  const fixed: Record<string, number> = {};
  let flex = 0;
  let superflex = 0;
  for (const pos of rosterPositions) {
    if (pos === "BN" || pos === "IR" || pos === "TAXI") continue;
    if (pos === "FLEX") flex++;
    else if (pos === "SUPER_FLEX") superflex++;
    else fixed[pos] = (fixed[pos] ?? 0) + 1;
  }
  return { fixed, flex, superflex };
}

// Greedy optimal lineup: fill fixed positional slots with the best players at
// that position, then FLEX/SUPER_FLEX with the best remaining eligible
// players. Good enough for standard single-FLEX leagues (this is not a
// perfect assignment solver for exotic multi-flex setups, but it's close).
function computeOptimalPoints(
  playersOnRoster: { playerId: string; position: string; points: number }[],
  rosterPositions: string[],
): number {
  const { fixed, flex, superflex } = slotCounts(rosterPositions);
  const used = new Set<string>();
  let total = 0;

  for (const [pos, count] of Object.entries(fixed)) {
    const pool = playersOnRoster
      .filter((p) => p.position === pos && !used.has(p.playerId))
      .sort((a, b) => b.points - a.points)
      .slice(0, count);
    for (const p of pool) {
      used.add(p.playerId);
      total += p.points;
    }
  }

  for (let i = 0; i < flex; i++) {
    const best = playersOnRoster
      .filter((p) => FLEX_ELIGIBLE.includes(p.position) && !used.has(p.playerId))
      .sort((a, b) => b.points - a.points)[0];
    if (best) {
      used.add(best.playerId);
      total += best.points;
    }
  }

  for (let i = 0; i < superflex; i++) {
    const best = playersOnRoster
      .filter((p) => SUPERFLEX_ELIGIBLE.includes(p.position) && !used.has(p.playerId))
      .sort((a, b) => b.points - a.points)[0];
    if (best) {
      used.add(best.playerId);
      total += best.points;
    }
  }

  return Math.round(total * 10) / 10;
}

export function computeLineupEfficiency(
  week: SleeperMatchup[],
  teamsByRoster: Map<number, Team>,
  rosterPositions: string[],
  players: PlayersMap,
): LineupEfficiency[] {
  const results: LineupEfficiency[] = [];

  for (const m of week) {
    const team = teamsByRoster.get(m.roster_id);
    if (!team) continue;
    const pointsByPlayer = m.players_points ?? {};
    const allPlayerIds = Object.keys(pointsByPlayer);
    const starters = new Set(m.starters ?? []);

    const roster = allPlayerIds.map((id) => ({
      playerId: id,
      position: players[id]?.position ?? "",
      points: pointsByPlayer[id] ?? 0,
    }));

    const optimalPoints = computeOptimalPoints(roster, rosterPositions);
    const actualPoints = Math.round((m.starters ?? []).reduce((sum, id) => sum + (pointsByPlayer[id] ?? 0), 0) * 10) / 10;

    // Biggest single miss: highest-scoring benched player who beat the
    // lowest-scoring starter at an eligible position.
    const benched = roster.filter((p) => !starters.has(p.playerId)).sort((a, b) => b.points - a.points);
    const startersList = roster.filter((p) => starters.has(p.playerId)).sort((a, b) => a.points - b.points);
    let worstMiss: LineupEfficiency["worstMiss"] = null;
    for (const bench of benched) {
      const eligibleStarter = startersList.find(
        (s) => s.points < bench.points && (s.position === bench.position || FLEX_ELIGIBLE.includes(bench.position)),
      );
      if (eligibleStarter) {
        worstMiss = {
          benchedPlayerName: players[bench.playerId]?.full_name ?? bench.playerId,
          benchedPoints: bench.points,
          starterPlayerName: players[eligibleStarter.playerId]?.full_name ?? eligibleStarter.playerId,
          starterPoints: eligibleStarter.points,
        };
        break;
      }
    }

    results.push({
      team,
      actualPoints,
      optimalPoints,
      pointsLeftOnBench: Math.round((optimalPoints - actualPoints) * 10) / 10,
      worstMiss,
    });
  }

  return results.sort((a, b) => b.pointsLeftOnBench - a.pointsLeftOnBench);
}
