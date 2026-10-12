import type { BackfillInjuryEvent } from "./injury-backfill";
import type { Team } from "./standings";
import { supabase, type InjuryEventRow } from "./supabase";

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
};

export async function fetchLoggedInjuryEvents(season: string): Promise<InjuryEventRow[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("injury_events").select("*").eq("season", season);
  return (data as InjuryEventRow[]) ?? [];
}

export function buildInjuryLeaderboard(
  backfillEvents: BackfillInjuryEvent[],
  loggedEvents: InjuryEventRow[],
  teams: Team[],
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
      return { team, count: events.length, events };
    })
    .sort((a, b) => b.count - a.count || a.team.teamName.localeCompare(b.team.teamName));
}
