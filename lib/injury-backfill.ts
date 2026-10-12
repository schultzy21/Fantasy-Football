import type { Team } from "./standings";
import type { PlayersMap, SleeperTransaction, WeeklyStatsMap } from "./types";

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

// Reconstructs each roster's full player set -- starters, bench, and IR
// slot all together, since Sleeper's roster.players (what Team.players
// comes from) already includes all three -- as of the end of every week
// from 1 to throughWeek. Works backward from today's actual roster,
// undoing this league's real transactions in reverse chronological order.
// This is an exact reconstruction, not a guess: it only uses real
// adds/drops/trades that actually happened.
function reconstructRosterHistory(
  teams: Team[],
  weeklyTransactions: SleeperTransaction[][], // index 0 = week 1
  throughWeek: number,
): Map<number, Map<number, Set<string>>> {
  // rosterId -> week -> player set as of the end of that week
  const history = new Map<number, Map<number, Set<string>>>();

  for (const team of teams) {
    const rosterId = team.rosterId;
    const set = new Set(team.players);
    const weekSnapshots = new Map<number, Set<string>>();

    for (let week = weeklyTransactions.length; week >= 1; week--) {
      const weekTxns = (weeklyTransactions[week - 1] ?? [])
        .filter((t) => t.status === "complete" && t.roster_ids.includes(rosterId))
        .sort((a, b) => b.created - a.created);

      for (const t of weekTxns) {
        for (const [pid, rid] of Object.entries(t.adds ?? {})) {
          if (rid === rosterId) set.delete(pid); // undo: they weren't there yet
        }
        for (const [pid, rid] of Object.entries(t.drops ?? {})) {
          if (rid === rosterId) set.add(pid); // undo: they hadn't been dropped yet
        }
      }

      const snapshotWeek = week - 1;
      if (snapshotWeek >= 1 && snapshotWeek <= throughWeek) {
        weekSnapshots.set(snapshotWeek, new Set(set));
      }
    }

    history.set(rosterId, weekSnapshots);
  }

  return history;
}

// Best-effort reconstruction of "games missed due to injury" for weeks
// before this feature existed -- Sleeper's API only exposes injury status
// live, not historically. Checks every player on the full historical
// roster (starters, bench, IR slot), using two signals in priority order:
//  1. A sparse but reliable per-week override Sleeper stores on some
//     players (metadata.injury_override_regular_<season>_<week>) -- when
//     present, trust it outright.
//  2. Otherwise, infer: the player recorded no stats that week, while
//     their own NFL team clearly did play (at least one teammate recorded
//     stats that week) -- which rules out bye weeks. This can also flag a
//     healthy player who simply didn't see the field (e.g. buried on a
//     depth chart), so it's labeled "approximate" in the UI, not fact.
export function computeBackfillInjuryEvents(
  season: string,
  teams: Team[],
  weeklyTransactions: SleeperTransaction[][], // index 0 = week 1
  weeklyStats: WeeklyStatsMap[], // index 0 = week 1
  players: PlayersMap,
  throughWeek: number,
): BackfillInjuryEvent[] {
  const events: BackfillInjuryEvent[] = [];
  if (throughWeek <= 0) return events;

  const rosterHistory = reconstructRosterHistory(teams, weeklyTransactions, throughWeek);

  for (let week = 1; week <= throughWeek; week++) {
    const stats = weeklyStats[week - 1] ?? {};
    const overrideKey = `injury_override_regular_${season}_${week}`;

    const teamsThatPlayed = new Set<string>();
    for (const [pid, line] of Object.entries(stats)) {
      if ((line.gp ?? 0) > 0) {
        const nflTeam = players[pid]?.team;
        if (nflTeam) teamsThatPlayed.add(nflTeam);
      }
    }

    for (const team of teams) {
      const rosterPlayers = rosterHistory.get(team.rosterId)?.get(week);
      if (!rosterPlayers) continue;

      for (const playerId of rosterPlayers) {
        if (isDefId(playerId)) continue;
        const meta = players[playerId];
        const override = meta?.metadata?.[overrideKey];

        if (override && INJURY_STATUSES.has(override)) {
          events.push({
            season,
            week,
            playerId,
            playerName: playerNameFor(playerId, players),
            status: override,
            rosterId: team.rosterId,
            confirmed: true,
          });
          continue;
        }

        const played = (stats[playerId]?.gp ?? 0) > 0;
        const nflTeam = meta?.team;
        const teamPlayed = nflTeam ? teamsThatPlayed.has(nflTeam) : false;

        if (!played && teamPlayed) {
          events.push({
            season,
            week,
            playerId,
            playerName: playerNameFor(playerId, players),
            status: "Out",
            rosterId: team.rosterId,
            confirmed: false,
          });
        }
      }
    }
  }

  return events;
}
