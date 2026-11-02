import type { Team } from "./standings";
import type { PlayersMap, SleeperMatchup, WeeklyStatsMap } from "./types";

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
  weeklyStats: WeeklyStatsMap[], // same indexing -- real per-player "did they play" signal
  teamsByRoster: Map<number, Team>,
  rosterPositions: string[],
  players: PlayersMap,
): TeamIceRecord[] {
  const starterSlots = rosterPositions.filter((p) => p !== "BN" && p !== "IR" && p !== "TAXI");
  const eventsByRoster = new Map<number, IceEvent[]>();

  weeklyMatchups.forEach((week, i) => {
    const weekNum = i + 1;
    const statsThisWeek = weeklyStats[i] ?? {};
    for (const m of week) {
      if (m.points <= 0) continue; // week not played (yet) for this team
      const starters = m.starters ?? [];
      const pointsByPlayer = m.players_points ?? {};

      starters.forEach((pid, idx) => {
        if (!pid || pid === "0") return; // empty slot
        // A player mid-game or not yet kicked off can sit at 0 in the live
        // matchup feed -- only a confirmed "played" stat line (gp > 0) earns
        // an ice, so stars who just haven't played yet this week don't get
        // wrongly iced. DEF has no gp stat but is scored directly off the
        // game, so it's exempt from this check.
        const meta = players[pid];
        const isDef = /^[A-Z]{2,4}$/.test(pid) && !meta;
        if (!isDef && (statsThisWeek[pid]?.gp ?? 0) <= 0) return;
        const pts = pointsByPlayer[pid] ?? 0;
        if (pts > 0) return; // no ice earned

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

export type WeeklyIceLogEntry = {
  week: number;
  teamName: string;
  playerName: string;
  position: string;
  points: number;
  ices: number;
};

// The "who got iced this week" view -- every team's events flattened and
// grouped by week, with no running/season total attached, as opposed to
// the season-long leaderboard above.
export function buildWeeklyIceLog(records: TeamIceRecord[]): Map<number, WeeklyIceLogEntry[]> {
  const byWeek = new Map<number, WeeklyIceLogEntry[]>();
  for (const r of records) {
    for (const e of r.events) {
      const entry: WeeklyIceLogEntry = {
        week: e.week,
        teamName: r.team.teamName,
        playerName: e.playerName,
        position: e.position,
        points: e.points,
        ices: e.ices,
      };
      const arr = byWeek.get(e.week) ?? [];
      arr.push(entry);
      byWeek.set(e.week, arr);
    }
  }
  for (const arr of byWeek.values()) {
    arr.sort((a, b) => b.ices - a.ices || a.teamName.localeCompare(b.teamName));
  }
  return new Map([...byWeek.entries()].sort((a, b) => b[0] - a[0]));
}
