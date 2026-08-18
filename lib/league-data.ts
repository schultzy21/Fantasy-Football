import { buildBrief } from "./brief";
import { getLeagueHistory, type LeagueRecords, type SeasonSummary } from "./history";
import { computePositionStrength, type PositionStrength } from "./positions";
import { computePowerRankings, type PowerRank } from "./power-rankings";
import { computePredictions, type PredictionsOutlook } from "./predictions";
import { buildLatestCompletedRecap, type WeeklyRecap } from "./recap";
import * as sleeper from "./sleeper";
import { buildTeams, sortByStandings, type Team } from "./standings";
import { supabase } from "./supabase";
import type { BanterEntry } from "./supabase";
import type { SleeperDraftPick, SleeperMatchup, SleeperState } from "./types";

export type LeagueData = {
  leagueName: string;
  season: string;
  state: SleeperState;
  isPreDraft: boolean;
  hasSeasonStarted: boolean;
  standings: Team[];
  powerRankings: PowerRank[];
  recap: WeeklyRecap | null;
  positions: PositionStrength[];
  predictions: PredictionsOutlook;
  history: { seasons: SeasonSummary[]; records: LeagueRecords };
  draftPicks: (SleeperDraftPick & { playerName: string })[];
  banter: BanterEntry[];
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

  const powerRankings = computePowerRankings(teams, hasSeasonStarted ? recentAvgByRoster : undefined);

  let positions: PositionStrength[] = [];
  if (hasSeasonStarted) {
    const players = await sleeper.getPlayers();
    positions = computePositionStrength(teamsByRoster, weeklyMatchups, players);
  }

  const predictions = computePredictions(
    powerRankings,
    teams,
    league.settings.playoff_teams ?? 6,
    weeklyMatchups,
    state.week,
  );

  const history = league.previous_league_id
    ? await getLeagueHistory(league).catch(() => ({ seasons: [], records: { highestSingleWeekScore: null } }))
    : { seasons: [], records: { highestSingleWeekScore: null } };

  // Draft results (useful pre-season, when there are no games to recap yet).
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

  const banter = await getBanter(league.season, state.week);

  const brief = buildBrief({
    leagueName: league.name.trim(),
    season: league.season,
    week: state.week,
    seasonType: state.season_type,
    standings,
    powerRankings,
    recap,
    positions,
    predictions,
    banter,
  });

  return {
    leagueName: league.name.trim(),
    season: league.season,
    state,
    isPreDraft: league.status === "pre_draft",
    hasSeasonStarted,
    standings,
    powerRankings,
    recap,
    positions,
    predictions,
    history,
    draftPicks,
    banter,
    brief,
  };
}

async function getBanter(season: string, week: number): Promise<BanterEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("banter_entries")
    .select("*")
    .eq("season", season)
    .eq("week", week)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data as BanterEntry[];
}
