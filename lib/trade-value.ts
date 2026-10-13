import { statPoints } from "./scoring";
import * as sleeper from "./sleeper";
import type { Team } from "./standings";
import type { PlayersMap, SleeperLeague, WeeklyStatsMap } from "./types";

export type PlayerValue = {
  playerId: string;
  name: string;
  position: string;
  nflTeam: string | null;
  injuryStatus: string | null;
  rosterId: number;
  ownerTeamName: string;
  rosProjPoints: number; // rest-of-season, scored to this league's exact settings, playoff weeks weighted
  snapShare: number | null; // most recent game with snap data, 0-1
  snapShareTrend: "up" | "down" | "flat" | null;
  recentPpgTrend: "up" | "down" | "flat" | null; // robust recent actual output vs. the model's own expectation
  consistency: "steady" | "boom-bust" | null; // season-long week-to-week variance
  missedGamesThisSeason: number;
  value: number; // 0-100
};

const SCORED_POSITIONS = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);
const LAST_WEEK_OF_SEASON = 17;
const SNAP_TREND_WEEKS = 4;
const SNAP_TREND_THRESHOLD = 0.05;
const PPG_TREND_WEEKS = 5;
// Last season's robust PPG only gets blended in when it's within this much
// of this season's -- otherwise the situation looks different (new role,
// new team, whatever the reason) and last season is dropped entirely.
const PPG_SAME_SITUATION_GAP = 0.35;
const PPG_TREND_CLAMP = 0.15; // the trend signal can move value by at most +/-15%
const PPG_TREND_FLAT_BAND = 0.05;
// This league's fantasy playoffs (weeks 15-17) are what the season is
// actually won or lost on, so they count for more than a garbage-time
// regular-season week.
const PLAYOFF_WEEK_MULTIPLIER = 1.5;
const INJURY_DISCOUNT_PER_GAME = 0.02; // -2% value per game already missed this season
const MAX_INJURY_DISCOUNT = 0.2;
const BOOM_BUST_CV_THRESHOLD = 0.45; // coefficient of variation at/above this reads as "boom-bust"

// How a FLEX slot's demand is typically split across eligible positions --
// a standard assumption (RB/WR lean, a little TE), used only to size each
// position's replacement-level baseline below.
const FLEX_SHARE: Record<string, number> = { RB: 0.4, WR: 0.45, TE: 0.15 };

function countStarterSlots(rosterPositions: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const slot of rosterPositions) {
    if (slot === "BN" || slot === "IR" || slot === "TAXI") continue;
    counts[slot] = (counts[slot] ?? 0) + 1;
  }
  return counts;
}

// Drops the single highest and lowest value before averaging, so one
// outlier game (a shutout or a fluke boom week) doesn't swing the trend
// signal on its own.
function trimmedMean(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length < 4) return values.reduce((a, b) => a + b, 0) / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const trimmed = sorted.slice(1, -1);
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
}

function coefficientOfVariation(values: number[]): number | null {
  if (values.length < 4) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean <= 0) return null;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

// Rest-of-season player values (0-100) for every player rostered in this
// league, built entirely from this league's own real settings and Sleeper's
// data -- no external market-consensus feed:
//   - Rest-of-season projected points, scored with this exact league's
//     scoring_settings, with this league's fantasy playoff weeks weighted
//     1.5x (that's what the season is actually won on).
//   - Positional scarcity: value over replacement, where "replacement
//     level" is this league's own starter counts (incl. FLEX demand split
//     across RB/WR/TE), not a one-size-fits-all baseline.
//   - Recent snap-share trend, as a small modifier for emerging/fading role.
//   - Recent actual-points trend vs. what the projection model itself
//     expects, as a small modifier -- see computeTrend below for how
//     outliers and new-situation players are handled.
//   - A discount for games already missed to injury this season (from this
//     app's own injury tracking), since recurrence risk is real.
// Note: true strength-of-schedule isn't included -- Sleeper's public API
// doesn't expose an NFL schedule or opponent-defense data to compute it from.
export async function computePlayerValues(
  league: SleeperLeague,
  teams: Team[],
  currentWeek: number,
  previousSeason: string | null,
  players: PlayersMap,
  missedGamesByPlayer: Map<string, number>,
): Promise<PlayerValue[]> {
  const season = league.season;
  const playoffWeekStart = league.settings.playoff_week_start ?? LAST_WEEK_OF_SEASON + 1;
  const remainingWeeks = Array.from(
    { length: Math.max(LAST_WEEK_OF_SEASON - currentWeek + 1, 0) },
    (_, i) => currentWeek + i,
  );
  const playedWeeks = Array.from({ length: Math.max(currentWeek - 1, 0) }, (_, i) => i + 1);
  const recentPlayedWeeks = playedWeeks.slice(-PPG_TREND_WEEKS);
  const recentSnapWeeks = playedWeeks.slice(-SNAP_TREND_WEEKS);
  const lastSeasonWeeks = Array.from({ length: LAST_WEEK_OF_SEASON }, (_, i) => i + 1);

  const [projByWeek, thisSeasonStatsByWeek, lastSeasonStatsByWeek] = await Promise.all([
    Promise.all(remainingWeeks.map((w) => sleeper.getProjections(season, w).catch(() => ({}) as WeeklyStatsMap))),
    Promise.all(playedWeeks.map((w) => sleeper.getStats(season, w).catch(() => ({}) as WeeklyStatsMap))),
    previousSeason
      ? Promise.all(lastSeasonWeeks.map((w) => sleeper.getStats(previousSeason, w).catch(() => ({}) as WeeklyStatsMap)))
      : Promise.resolve([] as WeeklyStatsMap[]),
  ]);
  const statsByWeekNumber = new Map(playedWeeks.map((w, i) => [w, thisSeasonStatsByWeek[i]]));

  const rosterIdByPlayer = new Map<string, number>();
  for (const t of teams) {
    for (const pid of t.players) rosterIdByPlayer.set(pid, t.rosterId);
  }
  const teamsByRoster = new Map(teams.map((t) => [t.rosterId, t]));
  const scoring = league.scoring_settings;

  const rows: PlayerValue[] = [];
  const trendModifierByPlayer = new Map<string, number>();

  for (const [playerId, rosterId] of rosterIdByPlayer) {
    const meta = players[playerId];
    const position = meta?.position ?? meta?.fantasy_positions?.[0] ?? null;
    // DEF has no player metadata entry -- its "player_id" is the team code.
    const isDef = /^[A-Z]{2,4}$/.test(playerId) && !meta;
    if (!isDef && !meta) continue;
    const resolvedPosition = isDef ? "DEF" : position;
    if (!resolvedPosition || !SCORED_POSITIONS.has(resolvedPosition)) continue;

    let rosProjPoints = 0;
    let rawProjSum = 0;
    for (let i = 0; i < remainingWeeks.length; i++) {
      const pts = statPoints(projByWeek[i][playerId], scoring);
      rawProjSum += pts;
      rosProjPoints += remainingWeeks[i] >= playoffWeekStart ? pts * PLAYOFF_WEEK_MULTIPLIER : pts;
    }
    const avgProjectedPerWeek = remainingWeeks.length > 0 ? rawProjSum / remainingWeeks.length : 0;

    const snapShares = recentSnapWeeks
      .map((w) => statsByWeekNumber.get(w)?.[playerId])
      .filter(
        (s): s is Record<string, number> =>
          !!s && typeof s.off_snp === "number" && typeof s.tm_off_snp === "number" && s.tm_off_snp > 0,
      )
      .map((s) => s.off_snp / s.tm_off_snp);
    const snapShare = snapShares[snapShares.length - 1] ?? null;
    let snapShareTrend: PlayerValue["snapShareTrend"] = null;
    if (snapShares.length >= 2) {
      const diff = snapShares[snapShares.length - 1] - snapShares[0];
      snapShareTrend = diff > SNAP_TREND_THRESHOLD ? "up" : diff < -SNAP_TREND_THRESHOLD ? "down" : "flat";
    }

    const actualPointsFor = (weeks: number[], statsLookup: (w: number, i: number) => Record<string, number> | undefined) =>
      weeks
        .map((w, i) => statsLookup(w, i))
        .filter((line): line is Record<string, number> => !!line && (line.gp ?? 0) > 0)
        .map((line) => statPoints(line, scoring));

    const recentActualPoints = actualPointsFor(recentPlayedWeeks, (w) => statsByWeekNumber.get(w)?.[playerId]);
    const allSeasonActualPoints = actualPointsFor(playedWeeks, (w) => statsByWeekNumber.get(w)?.[playerId]);
    const lastSeasonActualPoints = previousSeason
      ? actualPointsFor(lastSeasonWeeks, (_, i) => lastSeasonStatsByWeek[i]?.[playerId])
      : [];

    let recentPpgTrend: PlayerValue["recentPpgTrend"] = null;
    let trendModifier = 1;
    if (recentActualPoints.length > 0 && avgProjectedPerWeek > 0) {
      const thisSeasonRobust = trimmedMean(recentActualPoints);
      let baseline = thisSeasonRobust;
      if (lastSeasonActualPoints.length >= 4) {
        const lastSeasonRobust = trimmedMean(lastSeasonActualPoints);
        const gap = lastSeasonRobust > 0 ? Math.abs(thisSeasonRobust - lastSeasonRobust) / lastSeasonRobust : 1;
        // Only trust last season as a baseline when this season corroborates
        // it (a similar rate) -- a big gap itself is the signal that the
        // situation (role, team, offense, whatever) has changed, and last
        // season's production shouldn't carry weight in that case.
        if (gap <= PPG_SAME_SITUATION_GAP) {
          baseline = thisSeasonRobust * 0.7 + lastSeasonRobust * 0.3;
        }
      }
      const rawModifier = baseline / avgProjectedPerWeek - 1;
      trendModifier = 1 + Math.max(-PPG_TREND_CLAMP, Math.min(PPG_TREND_CLAMP, rawModifier));
      recentPpgTrend = rawModifier > PPG_TREND_FLAT_BAND ? "up" : rawModifier < -PPG_TREND_FLAT_BAND ? "down" : "flat";
    }
    trendModifierByPlayer.set(playerId, trendModifier);

    const cv = coefficientOfVariation(allSeasonActualPoints);
    const consistency: PlayerValue["consistency"] = cv == null ? null : cv >= BOOM_BUST_CV_THRESHOLD ? "boom-bust" : "steady";

    rows.push({
      playerId,
      name: isDef ? `${playerId} D/ST` : meta!.full_name ?? `${meta!.first_name ?? ""} ${meta!.last_name ?? ""}`.trim(),
      position: resolvedPosition,
      nflTeam: isDef ? playerId : meta!.team ?? null,
      injuryStatus: isDef ? null : meta!.injury_status ?? null,
      rosterId,
      ownerTeamName: teamsByRoster.get(rosterId)?.teamName ?? "Unknown",
      rosProjPoints,
      snapShare,
      snapShareTrend,
      recentPpgTrend,
      consistency,
      missedGamesThisSeason: missedGamesByPlayer.get(playerId) ?? 0,
      value: 0,
    });
  }

  // Replacement rank per position = this league's own starter demand.
  const starterCounts = countStarterSlots(league.roster_positions);
  const numTeams = teams.length;
  const flexSlots = starterCounts.FLEX ?? 0;
  const replacementRank: Record<string, number> = {};
  for (const pos of SCORED_POSITIONS) {
    const direct = starterCounts[pos] ?? 0;
    const flexShare = FLEX_SHARE[pos] ?? 0;
    replacementRank[pos] = Math.max(1, Math.round(numTeams * direct + numTeams * flexSlots * flexShare));
  }

  const byPosition = new Map<string, PlayerValue[]>();
  for (const r of rows) {
    const arr = byPosition.get(r.position) ?? [];
    arr.push(r);
    byPosition.set(r.position, arr);
  }

  const vorpByPlayer = new Map<string, number>();
  for (const [pos, list] of byPosition) {
    const sorted = [...list].sort((a, b) => b.rosProjPoints - a.rosProjPoints);
    const rank = replacementRank[pos] ?? sorted.length;
    const replacementPoints = sorted[Math.min(rank, sorted.length - 1)]?.rosProjPoints ?? 0;
    for (const r of sorted) vorpByPlayer.set(r.playerId, r.rosProjPoints - replacementPoints);
  }

  const maxVorp = Math.max(1, ...Array.from(vorpByPlayer.values()));
  for (const r of rows) {
    const vorp = Math.max(0, vorpByPlayer.get(r.playerId) ?? 0);
    let score = 100 * Math.sqrt(vorp / maxVorp);
    if (r.snapShareTrend === "up") score *= 1.05;
    if (r.snapShareTrend === "down") score *= 0.95;
    score *= trendModifierByPlayer.get(r.playerId) ?? 1;
    const injuryModifier = 1 - Math.min(MAX_INJURY_DISCOUNT, r.missedGamesThisSeason * INJURY_DISCOUNT_PER_GAME);
    score *= injuryModifier;
    r.value = Math.round(Math.min(100, Math.max(0, score)));
  }

  return rows.sort((a, b) => b.value - a.value);
}
