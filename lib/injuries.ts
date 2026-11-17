import type { BackfillInjuryEvent } from "./injury-backfill";
import type { Team } from "./standings";
import { supabase, type InjuryEventRow } from "./supabase";
import type { PlayersMap } from "./types";

export type InjuryEvent = {
  season: string;
  week: number;
  playerId: string;
  playerName: string;
  status: string;
  confirmed: boolean; // false = best-effort backfill, not a confirmed Sleeper record
};

export type RosterInjuryEntry = {
  team: Team;
  count: number;
  events: InjuryEvent[]; // most recent week first
  averageAge: number | null; // current roster, defenses excluded; null if no ages known
};

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

// Exact age from birth date (so a roster average isn't a pile of rounded
// whole years); Sleeper's own whole-year `age` covers the few players
// that have no birth date on file.
function ageOf(player: PlayersMap[string], now: number): number | null {
  if (player.birth_date) {
    const born = Date.parse(`${player.birth_date}T00:00:00Z`);
    if (!Number.isNaN(born)) return (now - born) / MS_PER_YEAR;
  }
  return typeof player.age === "number" ? player.age : null;
}

// Team defenses are keyed by NFL team code and have no player record, so
// skipping ids with no record is what leaves them out of the average.
export function averageRosterAge(team: Team, players: PlayersMap, now = Date.now()): number | null {
  const ages: number[] = [];
  for (const id of team.players) {
    const player = players[id];
    if (!player) continue;
    const age = ageOf(player, now);
    if (age != null) ages.push(age);
  }
  return ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : null;
}

export async function fetchLoggedInjuryEvents(season: string): Promise<InjuryEventRow[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("injury_events").select("*").eq("season", season);
  return (data as InjuryEventRow[]) ?? [];
}

export function buildInjuryLeaderboard(
  backfillEvents: BackfillInjuryEvent[],
  loggedEvents: InjuryEventRow[],
  teams: Team[],
  players: PlayersMap,
): RosterInjuryEntry[] {
  const byRoster = new Map<number, InjuryEvent[]>();
  const push = (rosterId: number, e: InjuryEvent) => {
    const arr = byRoster.get(rosterId) ?? [];
    arr.push(e);
    byRoster.set(rosterId, arr);
  };

  for (const e of backfillEvents) {
    push(e.rosterId, {
      season: e.season,
      week: e.week,
      playerId: e.playerId,
      playerName: e.playerName,
      status: e.status,
      confirmed: e.confirmed,
    });
  }
  for (const row of loggedEvents) {
    push(row.roster_id, {
      season: row.season,
      week: row.week,
      playerId: row.player_id,
      playerName: row.player_name,
      status: row.status,
      confirmed: true,
    });
  }

  return teams
    .map((team) => {
      const events = (byRoster.get(team.rosterId) ?? []).sort(
        (a, b) => b.week - a.week || a.playerName.localeCompare(b.playerName),
      );
      return { team, count: events.length, events, averageAge: averageRosterAge(team, players) };
    })
    .sort((a, b) => b.count - a.count || a.team.teamName.localeCompare(b.team.teamName));
}
