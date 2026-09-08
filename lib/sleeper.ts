// Thin client for the public Sleeper API (read-only, no key required).
// https://docs.sleeper.com
//
// Every call goes through Next.js `fetch`, which caches responses on the
// server between page loads (see the `revalidate` seconds on each call).
// That keeps us well under Sleeper's 1000 requests/minute limit even
// though the page can be viewed by the whole league.

import type {
  SleeperBracketMatch,
  SleeperDraft,
  SleeperDraftPick,
  SleeperLeague,
  SleeperMatchup,
  SleeperRoster,
  SleeperState,
  SleeperTransaction,
  SleeperUser,
  PlayersMap,
} from "./types";

const BASE = "https://api.sleeper.app/v1";

// Baruka Ta Adenine's current league ID, used if SLEEPER_LEAGUE_ID isn't
// set as an environment variable -- keeps the site working out of the box.
const DEFAULT_LEAGUE_ID = "1389331489925132288";

export function getLeagueId(): string {
  return process.env.SLEEPER_LEAGUE_ID ?? DEFAULT_LEAGUE_ID;
}

async function getJson<T>(path: string, revalidateSeconds: number): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    next: { revalidate: revalidateSeconds },
  });
  if (!res.ok) {
    throw new Error(`Sleeper API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// Current NFL week/season. Changes at most a few times a week -> short cache.
export function getState(): Promise<SleeperState> {
  return getJson<SleeperState>(`/state/nfl`, 300);
}

export function getLeague(leagueId: string): Promise<SleeperLeague> {
  return getJson<SleeperLeague>(`/league/${leagueId}`, 300);
}

export function getUsers(leagueId: string): Promise<SleeperUser[]> {
  return getJson<SleeperUser[]>(`/league/${leagueId}/users`, 300);
}

export function getRosters(leagueId: string): Promise<SleeperRoster[]> {
  return getJson<SleeperRoster[]>(`/league/${leagueId}/rosters`, 300);
}

export function getMatchups(leagueId: string, week: number): Promise<SleeperMatchup[]> {
  // Past weeks are final and effectively immutable; a 1-hour cache keeps us
  // well under rate limits without ever showing stale "current week" scores
  // for more than an hour.
  return getJson<SleeperMatchup[]>(`/league/${leagueId}/matchups/${week}`, 3600);
}

export function getWinnersBracket(leagueId: string): Promise<SleeperBracketMatch[]> {
  return getJson<SleeperBracketMatch[]>(`/league/${leagueId}/winners_bracket`, 3600);
}

export function getLosersBracket(leagueId: string): Promise<SleeperBracketMatch[]> {
  return getJson<SleeperBracketMatch[]>(`/league/${leagueId}/losers_bracket`, 3600);
}

export function getDrafts(leagueId: string): Promise<SleeperDraft[]> {
  return getJson<SleeperDraft[]>(`/league/${leagueId}/drafts`, 3600);
}

export function getDraftPicks(draftId: string): Promise<SleeperDraftPick[]> {
  return getJson<SleeperDraftPick[]>(`/draft/${draftId}/picks`, 3600);
}

// "round" here is the week number for a redraft league's regular season.
export function getTransactions(leagueId: string, round: number): Promise<SleeperTransaction[]> {
  return getJson<SleeperTransaction[]>(`/league/${leagueId}/transactions/${round}`, 3600);
}

// The full player dictionary is ~20MB -- too big for Next.js's built-in fetch
// data cache (2MB item limit), so we hand-roll a simple in-memory cache here
// instead. Sleeper asks that this endpoint be fetched at most once a day;
// this cache lives for the lifetime of the server process, which in practice
// means well under one fetch/day for a low-traffic league site.
let playersCache: { data: PlayersMap; fetchedAt: number } | null = null;
const PLAYERS_CACHE_MS = 24 * 60 * 60 * 1000;

export async function getPlayers(): Promise<PlayersMap> {
  if (playersCache && Date.now() - playersCache.fetchedAt < PLAYERS_CACHE_MS) {
    return playersCache.data;
  }
  const res = await fetch(`${BASE}/players/nfl`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Sleeper API /players/nfl failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as PlayersMap;
  playersCache = { data, fetchedAt: Date.now() };
  return data;
}
