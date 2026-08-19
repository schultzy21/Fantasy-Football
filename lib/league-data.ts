import { buildBrief } from "./brief";
import { getLeagueHistory, type LeagueRecords, type SeasonSummary } from "./history";
import { computePositionStrength, type PositionStrength } from "./positions";
import { computePowerRankings, type PowerRank } from "./power-rankings";
import { computePredictions, type PredictionsOutlook } from "./predictions";
import { computePreseasonPowerRankings, computePreseasonPredictions } from "./preseason";
import { buildLatestCompletedRecap, type WeeklyRecap } from "./recap";
import { computeRankingsHistory, type RankingsHistoryPoint } from "./rankings-history";
import * as sleeper from "./sleeper";
import { buildTeams, sortByStandings, type Team } from "./standings";
import type { SleeperDraftPick, SleeperMatchup, SleeperState } from "./types";

export type LeagueData = {
  leagueName: string;
  season: string;
  state: SleeperState;
  isPreDraft: boolean;
  hasSeasonStarted: boolean;
  standings: Team[];
  powerRankings: PowerRank[];
  rankingsAreProjected: boolean;
  rankingsHistory: RankingsHistoryPoint[];
  recap: WeeklyRecap | null;
  positions: PositionStrength[];
  predictions: PredictionsOutlook;
  history: { seasons: SeasonSummary[]; records: LeagueRecords };
  draftPicks: (SleeperDraftPick & { playerName: string })[];
  brief: string;
};

const DEFAULT_REGULAR_SEASON_WEEKS = 14;
const MAX_WEEKS = 18;

export async function getLeagueData(leagueId: string): Promise<LeagueData> {
  const [league, state, users, rosters] = await Promise.all([
    sleeper.getLeague(leagueId),
    sleeper.getState(),
    sleeper.getUsers(leagueId),
    sleeper.getRosters(leagueId),
  ]);

  const teams = buildTeams(league, users, rosters);
  const standings = sortByStandings(teams);
  const teamsByRoster = new Map(teams.map((t) => [t.rosterId, t]));

  const lastRegularWeek = Math.min(
    (league.settings.playoff_week_start ?? DEFAULT_REGULAR_SEASON_WEEKS + 1) - 1,
    MAX_WEEKS,
  );
  const weekNumbers = Array.from({ length: Math.max(lastRegularWeek, 1) }, (_, i) => i + 1);
  const weeklyMatchups: SleeperMatchup[][] = await Promise.all(
    weekNumbers.map((w) => sleeper.getMatchups(leagueId, w).catch(() => [] as SleeperMatchup[])),
  );

  const hasSeasonStarted = weeklyMatchups.some((week) => week.some((m) => m.points > 0));

  const recap = buildLatestCompletedRecap(weeklyMatchups, teamsByRoster);

  // "Recent form" = average points over the last up-to-3 completed weeks.
  const recentAvgByRoster = new Map<number, number>();
  if (hasSeasonStarted) {
    const completedWeeks = weeklyMatchups.filter((w) => w.length > 0 && w.every((m) => m.points > 0));
    const lastThree = completedWeeks.slice(-3);
    for (const t of teams) {
      const pts = lastThree
        .map((w) => w.find((m) => m.roster_id === t.rosterId)?.points)
        .filter((p): p is number => typeof p === "number");
      if (pts.length > 0) recentAvgByRoster.set(t.rosterId, pts.reduce((a, b) => a + b, 0) / pts.length);
    }
  }

  let positions: PositionStrength[] = [];
  if (hasSeasonStarted) {
    const players = await sleeper.getPlayers();
    positions = computePositionStrength(teamsByRoster, weeklyMatchups, players);
  }

  // Draft results (useful pre-season, and the input for projected rankings).
  let draftPicks: (SleeperDraftPick & { playerName: string })[] = [];
  try {
    const drafts = await sleeper.getDrafts(leagueId);
    const draft = drafts[0];
    if (draft) {
      const picks = await sleeper.getDraftPicks(draft.draft_id);
      if (picks.length > 0) {
        const players = await sleeper.getPlayers();
        draftPicks = picks
          .sort((a, b) => a.pick_no - b.pick_no)
          .map((p) => {
            const player = players[p.player_id];
            const name =
              p.metadata?.first_name && p.metadata?.last_name
                ? `${p.metadata.first_name} ${p.metadata.last_name}`
                : player?.full_name ?? "Unknown Player";
            return { ...p, playerName: name };
          });
      }
    }
  } catch {
    // Draft not run yet, or Sleeper hiccuped -- fine to show nothing here.
  }

  const rankingsAreProjected = !hasSeasonStarted && draftPicks.length > 0;

  const powerRankings = rankingsAreProjected
    ? computePreseasonPowerRankings(teams, draftPicks)
    : computePowerRankings(teams, hasSeasonStarted ? recentAvgByRoster : undefined);

  const predictions = rankingsAreProjected
    ? computePreseasonPredictions(powerRankings, league.settings.playoff_teams ?? 6, weeklyMatchups)
    : computePredictions(powerRankings, teams, league.settings.playoff_teams ?? 6, weeklyMatchups, state.week);

  const preseasonRanksForHistory = rankingsAreProjected
    ? new Map(powerRankings.map((pr) => [pr.team.rosterId, pr.rank]))
    : draftPicks.length > 0
      ? new Map(
          computePreseasonPowerRankings(teams, draftPicks).map((pr) => [pr.team.rosterId, pr.rank]),
        )
      : undefined;
  const rankingsHistory = computeRankingsHistory(teams, weeklyMatchups, preseasonRanksForHistory);

  const history = league.previous_league_id
    ? await getLeagueHistory(league).catch(() => ({ seasons: [], records: { highestSingleWeekScore: null } }))
    : { seasons: [], records: { highestSingleWeekScore: null } };

  const brief = buildBrief({
    leagueName: league.name.trim(),
    season: league.season,
    week: state.week,
    seasonType: state.season_type,
    standings,
    powerRankings,
    rankingsAreProjected,
    recap,
    positions,
    predictions,
    draftPicks,
  });

  return {
    leagueName: league.name.trim(),
    season: league.season,
    state,
    isPreDraft: league.status === "pre_draft",
    hasSeasonStarted,
    standings,
    powerRankings,
    rankingsAreProjected,
    rankingsHistory,
    recap,
    positions,
    predictions,
    history,
    draftPicks,
    brief,
  };
}
