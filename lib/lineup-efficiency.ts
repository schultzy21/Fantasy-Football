import { computeOptimalPoints } from "./lineup-optimizer";
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
