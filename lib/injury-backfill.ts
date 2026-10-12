import type { Team } from "./standings";
import type { PlayersMap, SleeperMatchup, WeeklyStatsMap } from "./types";

export type BackfillInjuryEvent = {
  season: string;
  week: number;
  playerId: string;
  playerName: string;
  status: string;
  rosterId: number;
  confirmed: boolean; // true = Sleeper's own per-week record; false = inferred
};

const INJURY_STATUSES = new Set(["Out", "IR"]);

function isDefId(playerId: string): boolean {
  return /^[A-Z]{2,4}$/.test(playerId);
}

function playerNameFor(playerId: string, players: PlayersMap): string {
  return players[playerId]?.full_name ?? playerId;
}

// Best-effort reconstruction of "games missed due to injury" for weeks
// before this feature existed -- Sleeper's API only exposes injury status
// live, not historically. Two signals, in priority order:
//  1. A sparse but reliable per-week override Sleeper stores on some
//     players (metadata.injury_override_regular_<season>_<week>) -- when
//     present, trust it outright.
//  2. Otherwise, infer: the player was in that week's STARTING lineup (the
//     one piece of historical roster data this API actually gives us),
//     recorded no stats that week, while their own NFL team clearly did
//     play (at least one teammate recorded stats that week) -- which rules
//     out bye weeks.
// Only starters are checked, not full benches, since per-week starting
// lineups are the one accurate historical roster signal available; a
// bench-stashed injury in a past week is not recoverable from this API and
// is undercounted here by design (labeled "approximate" in the UI).
export function computeBackfillInjuryEvents(
  season: string,
  teamsByRoster: Map<number, Team>,
  weeklyMatchups: SleeperMatchup[][], // index 0 = week 1
  weeklyStats: WeeklyStatsMap[], // same indexing, same length
  players: PlayersMap,
  throughWeek: number,
): BackfillInjuryEvent[] {
  const events: BackfillInjuryEvent[] = [];

  for (let week = 1; week <= throughWeek; week++) {
    const matchups = weeklyMatchups[week - 1] ?? [];
    const stats = weeklyStats[week - 1] ?? {};
    if (matchups.length === 0) continue;

    const teamsThatPlayed = new Set<string>();
    for (const [pid, line] of Object.entries(stats)) {
      if ((line.gp ?? 0) > 0) {
        const team = players[pid]?.team;
        if (team) teamsThatPlayed.add(team);
      }
    }

    const overrideKey = `injury_override_regular_${season}_${week}`;

    for (const m of matchups) {
      if (!teamsByRoster.has(m.roster_id)) continue;
      const starters = (m.starters ?? []).filter((id) => id && id !== "0" && !isDefId(id));

      for (const playerId of starters) {
        const meta = players[playerId];
        const override = meta?.metadata?.[overrideKey];

        if (override && INJURY_STATUSES.has(override)) {
          events.push({
            season,
            week,
            playerId,
            playerName: playerNameFor(playerId, players),
            status: override,
            rosterId: m.roster_id,
            confirmed: true,
          });
          continue;
        }

        const line = stats[playerId];
        const played = (line?.gp ?? 0) > 0 || (m.players_points?.[playerId] ?? 0) > 0;
        const nflTeam = meta?.team;
        const teamPlayed = nflTeam ? teamsThatPlayed.has(nflTeam) : false;

        if (!played && teamPlayed) {
          events.push({
            season,
            week,
            playerId,
            playerName: playerNameFor(playerId, players),
            status: "Out",
            rosterId: m.roster_id,
            confirmed: false,
          });
        }
      }
    }
  }

  return events;
}
