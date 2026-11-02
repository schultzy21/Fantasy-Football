import type { Team } from "./standings";
import type { PlayersMap, SleeperMatchup } from "./types";

export type IceEvent = {
  week: number;
  playerId: string;
  playerName: string;
  position: string;
  points: number;
  ices: number; // 1 for exactly 0, 2 for negative
};

export type TeamIceRecord = {
  team: Team;
  totalIces: number;
  events: IceEvent[]; // most recent week first
};

// The house rule: one Smirnoff Ice for every starter who scores exactly 0
// points in a week, two ices if they go negative (a defense that allows a
// pick-six, a kicker who gets blocked, etc.). Tallied across every played
// week this season, regular season and playoffs alike.
export function computeIceTracker(
  weeklyMatchups: SleeperMatchup[][], // index 0 = week 1
  teamsByRoster: Map<number, Team>,
  rosterPositions: string[],
  players: PlayersMap,
): TeamIceRecord[] {
  const starterSlots = rosterPositions.filter((p) => p !== "BN" && p !== "IR" && p !== "TAXI");
  const eventsByRoster = new Map<number, IceEvent[]>();

  weeklyMatchups.forEach((week, i) => {
    const weekNum = i + 1;
    for (const m of week) {
      if (m.points <= 0) continue; // week not played (yet) for this team
      const starters = m.starters ?? [];
      const pointsByPlayer = m.players_points ?? {};

      starters.forEach((pid, idx) => {
        if (!pid || pid === "0") return; // empty slot
        const pts = pointsByPlayer[pid] ?? 0;
        if (pts > 0) return; // no ice earned

        const meta = players[pid];
        const isDef = /^[A-Z]{2,4}$/.test(pid) && !meta;
        const event: IceEvent = {
          week: weekNum,
          playerId: pid,
          playerName: isDef ? `${pid} D/ST` : meta?.full_name ?? pid,
          position: starterSlots[idx] ?? meta?.position ?? "-",
          points: Math.round(pts * 10) / 10,
          ices: pts < 0 ? 2 : 1,
        };

        const arr = eventsByRoster.get(m.roster_id) ?? [];
        arr.push(event);
        eventsByRoster.set(m.roster_id, arr);
      });
    }
  });

  return Array.from(teamsByRoster.values())
    .map((team) => {
      const events = (eventsByRoster.get(team.rosterId) ?? []).sort((a, b) => b.week - a.week);
      const totalIces = events.reduce((sum, e) => sum + e.ices, 0);
      return { team, totalIces, events };
    })
    .sort((a, b) => b.totalIces - a.totalIces || a.team.teamName.localeCompare(b.team.teamName));
}
