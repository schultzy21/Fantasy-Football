import * as sleeper from "./sleeper";
import type { Team } from "./standings";
import type { SleeperDraftPick, SleeperLeague, SleeperTransaction, WeeklyStatsMap } from "./types";

export type DraftPickInsight = {
  currentRosterId: number | null; // null = not on any current roster (free agent)
  droppedByDrafter: boolean; // cut loose (waiver/free-agent drop) by whoever drafted them
  draftRank: number; // = pick_no, their value at draft time
  currentRank: number | null; // rank among this draft class by rest-of-season outlook now, 1 = best
};

const LAST_WEEK_OF_SEASON = 17;

function statPoints(statLine: Record<string, number> | undefined, scoring: Record<string, number>): number {
  if (!statLine) return 0;
  let total = 0;
  for (const [key, weight] of Object.entries(scoring)) {
    const v = statLine[key];
    if (typeof v === "number") total += v * weight;
  }
  return total;
}

// For every drafted player: who currently rosters them, whether the team
// that drafted them later cut them loose, and how their rest-of-season
// outlook now ranks against the rest of their own draft class -- so a
// "dropped #14, now projects #78" bust is easy to spot at a glance.
export async function computeDraftInsights(
  league: SleeperLeague,
  draftPicks: (SleeperDraftPick & { playerName: string })[],
  teams: Team[],
  transactions: SleeperTransaction[],
  currentWeek: number,
): Promise<Record<string, DraftPickInsight>> {
  const insights: Record<string, DraftPickInsight> = {};
  if (draftPicks.length === 0) return insights;

  const currentRosterIdByPlayer = new Map<string, number>();
  for (const t of teams) {
    for (const pid of t.players) currentRosterIdByPlayer.set(pid, t.rosterId);
  }

  // "Dropped" = waived/cut, not traded away -- a trade isn't a bust signal.
  const droppedByRosterForPlayer = new Map<string, Set<number>>();
  for (const t of transactions) {
    if (t.type === "trade" || !t.drops) continue;
    for (const [playerId, rosterId] of Object.entries(t.drops)) {
      const set = droppedByRosterForPlayer.get(playerId) ?? new Set<number>();
      set.add(rosterId);
      droppedByRosterForPlayer.set(playerId, set);
    }
  }

  const remainingWeeks = Array.from(
    { length: Math.max(LAST_WEEK_OF_SEASON - currentWeek + 1, 0) },
    (_, i) => currentWeek + i,
  );
  const projByWeek = await Promise.all(
    remainingWeeks.map((w) => sleeper.getProjections(league.season, w).catch(() => ({}) as WeeklyStatsMap)),
  );
  const scoring = league.scoring_settings;

  const rosProjByPlayer = new Map<string, number>();
  for (const p of draftPicks) {
    const pts = remainingWeeks.reduce((sum, _, i) => sum + statPoints(projByWeek[i][p.player_id], scoring), 0);
    rosProjByPlayer.set(p.player_id, pts);
  }

  const currentRankByPlayer = new Map<string, number>();
  [...draftPicks]
    .sort((a, b) => (rosProjByPlayer.get(b.player_id) ?? 0) - (rosProjByPlayer.get(a.player_id) ?? 0))
    .forEach((p, i) => currentRankByPlayer.set(p.player_id, i + 1));

  for (const p of draftPicks) {
    insights[p.player_id] = {
      currentRosterId: currentRosterIdByPlayer.get(p.player_id) ?? null,
      droppedByDrafter: droppedByRosterForPlayer.get(p.player_id)?.has(p.roster_id) ?? false,
      draftRank: p.pick_no,
      currentRank: currentRankByPlayer.get(p.player_id) ?? null,
    };
  }

  return insights;
}
