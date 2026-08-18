import * as sleeper from "./sleeper";
import { buildTeams, sortByStandings } from "./standings";
import type { SleeperLeague } from "./types";

export type SeasonSummary = {
  season: string;
  leagueId: string;
  champion: string | null;
  runnerUp: string | null;
  standings: { teamName: string; wins: number; losses: number; ties: number; fpts: number }[];
};

export type LeagueRecords = {
  highestSingleWeekScore: { teamName: string; season: string; week: number; points: number } | null;
};

// Walks previous_league_id backwards from the current league. Capped so a
// very old league chain can't blow past Sleeper's rate limit or make the
// page slow to load.
const MAX_SEASONS_BACK = 10;

export async function getLeagueHistory(currentLeague: SleeperLeague): Promise<{
  seasons: SeasonSummary[];
  records: LeagueRecords;
}> {
  const seasons: SeasonSummary[] = [];
  let highest: LeagueRecords["highestSingleWeekScore"] = null;

  let previousId = currentLeague.previous_league_id;
  let hops = 0;

  while (previousId && hops < MAX_SEASONS_BACK) {
    hops++;
    let league: SleeperLeague;
    try {
      league = await sleeper.getLeague(previousId);
    } catch {
      break;
    }

    const [users, rosters, winnersBracket] = await Promise.all([
      sleeper.getUsers(previousId).catch(() => []),
      sleeper.getRosters(previousId).catch(() => []),
      sleeper.getWinnersBracket(previousId).catch(() => []),
    ]);

    const teams = buildTeams(league, users, rosters);
    const ranked = sortByStandings(teams);
    const teamsByRoster = new Map(teams.map((t) => [t.rosterId, t]));

    // Champion = winner of the final winners-bracket match, when available;
    // otherwise fall back to best regular-season record.
    let champion: string | null = null;
    let runnerUp: string | null = null;
    const finalRound = Math.max(0, ...winnersBracket.map((m) => m.r));
    const finalMatch = winnersBracket.find((m) => m.r === finalRound && m.w != null);
    if (finalMatch?.w != null) {
      champion = teamsByRoster.get(finalMatch.w)?.teamName ?? null;
      runnerUp = finalMatch.l != null ? teamsByRoster.get(finalMatch.l)?.teamName ?? null : null;
    } else if (ranked.length > 0) {
      champion = ranked[0].teamName;
      runnerUp = ranked[1]?.teamName ?? null;
    }

    seasons.push({
      season: league.season,
      leagueId: league.league_id,
      champion,
      runnerUp,
      standings: ranked.map((t) => ({
        teamName: t.teamName,
        wins: t.wins,
        losses: t.losses,
        ties: t.ties,
        fpts: Math.round(t.fpts * 10) / 10,
      })),
    });

    // Best-effort: scan a handful of weeks for a single-week high score.
    // Capped at 17 weeks and run in parallel to stay fast.
    try {
      const weeks = await Promise.all(
        Array.from({ length: 17 }, (_, i) => i + 1).map((w) =>
          sleeper.getMatchups(previousId!, w).catch(() => []),
        ),
      );
      weeks.forEach((week, weekIndex) => {
        for (const m of week) {
          if (m.points > 0 && (!highest || m.points > highest.points)) {
            const teamName = teamsByRoster.get(m.roster_id)?.teamName ?? "Unknown";
            highest = { teamName, season: league.season, week: weekIndex + 1, points: m.points };
          }
        }
      });
    } catch {
      // Skip records for this season if matchup fetches fail.
    }

    previousId = league.previous_league_id;
  }

  return { seasons, records: { highestSingleWeekScore: highest } };
}
