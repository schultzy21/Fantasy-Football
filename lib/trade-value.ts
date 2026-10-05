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
  rosProjPoints: number; // rest-of-season, scored to this league's exact settings
  snapShare: number | null; // most recent game with snap data, 0-1
  snapShareTrend: "up" | "down" | "flat" | null;
  value: number; // 0-100
};

const SCORED_POSITIONS = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);
const LAST_WEEK_OF_SEASON = 17;
const SNAP_TREND_WEEKS = 4;
const SNAP_TREND_THRESHOLD = 0.05;

// How a FLEX slot's demand is typically split across eligible positions --
// a standard assumption (RB/WR lean, a little TE), used only to size each
// position's replacement-level baseline below.
const FLEX_SHARE: Record<string, number> = { RB: 0.4, WR: 0.45, TE: 0.15 };

function statPoints(statLine: Record<string, number> | undefined, scoring: Record<string, number>): number {
  if (!statLine) return 0;
  let total = 0;
  for (const [key, weight] of Object.entries(scoring)) {
    const v = statLine[key];
    if (typeof v === "number") total += v * weight;
  }
  return total;
}

function countStarterSlots(rosterPositions: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const slot of rosterPositions) {
    if (slot === "BN" || slot === "IR" || slot === "TAXI") continue;
    counts[slot] = (counts[slot] ?? 0) + 1;
  }
  return counts;
}

// Rest-of-season player values (0-100) for every player rostered in this
// league, built entirely from this league's own real settings and Sleeper's
// data -- no external market-consensus feed:
//   - Rest-of-season projected points, scored with this exact league's
//     scoring_settings (not a generic PPR/standard guess).
//   - Positional scarcity: value over replacement, where "replacement
//     level" is this league's own starter counts (incl. FLEX demand split
//     across RB/WR/TE), not a one-size-fits-all baseline.
//   - Recent snap-share trend, as a small modifier for emerging/fading role.
// Note: true strength-of-schedule isn't included -- Sleeper's public API
// doesn't expose an NFL schedule or opponent-defense data to compute it from.
export async function computePlayerValues(
  league: SleeperLeague,
  teams: Team[],
  currentWeek: number,
  players: PlayersMap,
): Promise<PlayerValue[]> {
  const season = league.season;
  const remainingWeeks = Array.from(
    { length: Math.max(LAST_WEEK_OF_SEASON - currentWeek + 1, 0) },
    (_, i) => currentWeek + i,
  );
  const recentWeeks = Array.from({ length: SNAP_TREND_WEEKS }, (_, i) => currentWeek - 1 - i).filter((w) => w >= 1);

  const [projByWeek, statsByWeek] = await Promise.all([
    Promise.all(remainingWeeks.map((w) => sleeper.getProjections(season, w).catch(() => ({}) as WeeklyStatsMap))),
    Promise.all(recentWeeks.map((w) => sleeper.getStats(season, w).catch(() => ({}) as WeeklyStatsMap))),
  ]);

  const rosterIdByPlayer = new Map<string, number>();
  for (const t of teams) {
    for (const pid of t.players) rosterIdByPlayer.set(pid, t.rosterId);
  }
  const teamsByRoster = new Map(teams.map((t) => [t.rosterId, t]));
  const scoring = league.scoring_settings;

  const rows: PlayerValue[] = [];
  for (const [playerId, rosterId] of rosterIdByPlayer) {
    const meta = players[playerId];
    const position = meta?.position ?? meta?.fantasy_positions?.[0] ?? null;
    // DEF has no player metadata entry -- its "player_id" is the team code.
    const isDef = /^[A-Z]{2,4}$/.test(playerId) && !meta;
    if (!isDef && !meta) continue;
    const resolvedPosition = isDef ? "DEF" : position;
    if (!resolvedPosition || !SCORED_POSITIONS.has(resolvedPosition)) continue;

    const rosProjPoints = remainingWeeks.reduce((sum, _, i) => sum + statPoints(projByWeek[i][playerId], scoring), 0);

    const snapShares = recentWeeks
      .map((_, i) => statsByWeek[i][playerId])
      .filter(
        (s): s is Record<string, number> =>
          !!s && typeof s.off_snp === "number" && typeof s.tm_off_snp === "number" && s.tm_off_snp > 0,
      )
      .map((s) => s.off_snp / s.tm_off_snp);
    const snapShare = snapShares[0] ?? null; // recentWeeks counts backward from last week, so index 0 is most recent
    let snapShareTrend: PlayerValue["snapShareTrend"] = null;
    if (snapShares.length >= 2) {
      const diff = snapShares[0] - snapShares[snapShares.length - 1];
      snapShareTrend = diff > SNAP_TREND_THRESHOLD ? "up" : diff < -SNAP_TREND_THRESHOLD ? "down" : "flat";
    }

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
    r.value = Math.round(Math.min(100, Math.max(0, score)));
  }

  return rows.sort((a, b) => b.value - a.value);
}
