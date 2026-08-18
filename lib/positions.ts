import type { Team } from "./standings";
import type { PlayersMap, SleeperMatchup } from "./types";

export type PositionStrength = {
  position: string;
  leaderboard: { team: Team; points: number }[];
};

const TRACKED_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];

// Sums the points each team's *starters* scored, grouped by the player's
// real NFL position, across every week played so far. Using starters
// (not the whole bench) reflects production the team actually used.
export function computePositionStrength(
  teamsByRoster: Map<number, Team>,
  weeklyMatchups: SleeperMatchup[][],
  players: PlayersMap,
): PositionStrength[] {
  const totals = new Map<string, Map<number, number>>(); // position -> rosterId -> points
  for (const pos of TRACKED_POSITIONS) totals.set(pos, new Map());

  for (const week of weeklyMatchups) {
    for (const m of week) {
      const starters = m.starters ?? [];
      const pointsByPlayer = m.players_points ?? {};
      for (const playerId of starters) {
        if (!playerId || playerId === "0") continue;
        const player = players[playerId];
        const pos = player?.position;
        if (!pos || !TRACKED_POSITIONS.includes(pos)) continue;
        const pts = pointsByPlayer[playerId] ?? 0;
        const rosterMap = totals.get(pos)!;
        rosterMap.set(m.roster_id, (rosterMap.get(m.roster_id) ?? 0) + pts);
      }
    }
  }

  return TRACKED_POSITIONS.map((pos) => {
    const rosterMap = totals.get(pos)!;
    const leaderboard = Array.from(rosterMap.entries())
      .map(([rosterId, points]) => {
        const team = teamsByRoster.get(rosterId);
        return team ? { team, points: Math.round(points * 10) / 10 } : null;
      })
      .filter((x): x is { team: Team; points: number } => x !== null)
      .sort((a, b) => b.points - a.points);
    return { position: pos, leaderboard };
  }).filter((p) => p.leaderboard.length > 0);
}
