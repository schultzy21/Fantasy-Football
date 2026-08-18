import type { SleeperLeague, SleeperRoster, SleeperUser } from "./types";

export type Team = {
  rosterId: number;
  ownerId: string | null;
  teamName: string;
  ownerName: string;
  avatar: string | null;
  wins: number;
  losses: number;
  ties: number;
  fpts: number;
  fptsAgainst: number;
  players: string[];
  starters: string[];
};

export function buildTeams(
  league: SleeperLeague,
  users: SleeperUser[],
  rosters: SleeperRoster[],
): Team[] {
  const usersById = new Map(users.map((u) => [u.user_id, u]));

  return rosters.map((r) => {
    const user = r.owner_id ? usersById.get(r.owner_id) : undefined;
    const teamName =
      user?.metadata?.team_name?.trim() || user?.display_name || `Roster ${r.roster_id}`;
    const fptsDec = (r.settings.fpts_decimal ?? 0) / 100;
    const fptsAgainstDec = (r.settings.fpts_against_decimal ?? 0) / 100;

    return {
      rosterId: r.roster_id,
      ownerId: r.owner_id,
      teamName,
      ownerName: user?.display_name ?? "Unknown",
      avatar: user?.avatar ?? null,
      wins: r.settings.wins ?? 0,
      losses: r.settings.losses ?? 0,
      ties: r.settings.ties ?? 0,
      fpts: (r.settings.fpts ?? 0) + fptsDec,
      fptsAgainst: (r.settings.fpts_against ?? 0) + fptsAgainstDec,
      players: r.players ?? [],
      starters: r.starters ?? [],
    };
  });
}

export function winPct(t: Team): number {
  const games = t.wins + t.losses + t.ties;
  if (games === 0) return 0;
  return (t.wins + t.ties * 0.5) / games;
}

// Standard Sleeper tiebreak: record first, points for as the tiebreaker.
export function sortByStandings(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => {
    const pctDiff = winPct(b) - winPct(a);
    if (Math.abs(pctDiff) > 1e-9) return pctDiff;
    return b.fpts - a.fpts;
  });
}
