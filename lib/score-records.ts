import type { Team } from "./standings";
import type { PlayersMap, SleeperBracketMatch, SleeperMatchup } from "./types";

export type LineupSlot = {
  playerId: string;
  playerName: string;
  position: string;
  points: number;
};

export type ScoreRecordEntry = {
  season: string;
  week: number;
  teamName: string;
  points: number;
  lineup: LineupSlot[];
};

// Every roster_id that ever shows up in the winners bracket -- as a known
// seed (t1/t2) or as a decided winner/loser (w/l) -- made the playoffs that
// season. Teams that don't appear at all were eliminated/missed out and
// instead play out a separate consolation schedule most leagues don't
// bother setting lineups for.
function qualifiedRosterIds(bracket: SleeperBracketMatch[]): Set<number> {
  const ids = new Set<number>();
  for (const m of bracket) {
    if (typeof m.t1 === "number") ids.add(m.t1);
    if (typeof m.t2 === "number") ids.add(m.t2);
    if (typeof m.w === "number") ids.add(m.w);
    if (typeof m.l === "number") ids.add(m.l);
  }
  return ids;
}

// Builds one ScoreRecordEntry per played matchup for a single season,
// skipping playoff-week (week >= playoffWeekStart) scores from teams that
// didn't make that season's playoff bracket -- those games are real, but
// an eliminated team benched/out-of-town fantasy manager usually isn't
// setting an optimal (or any) lineup, which would otherwise pollute both
// the all-time-high and all-time-low lists with noise.
export function buildScoreRecordEntries(
  season: string,
  weeklyMatchups: SleeperMatchup[][], // index 0 = week 1
  playoffWeekStart: number,
  winnersBracket: SleeperBracketMatch[],
  rosterPositions: string[],
  teamsByRoster: Map<number, Team>,
  players: PlayersMap,
): ScoreRecordEntry[] {
  const qualified = qualifiedRosterIds(winnersBracket);
  const starterSlots = rosterPositions.filter((p) => p !== "BN" && p !== "IR" && p !== "TAXI");
  const entries: ScoreRecordEntry[] = [];

  weeklyMatchups.forEach((week, i) => {
    const weekNum = i + 1;
    const isPlayoffWeek = weekNum >= playoffWeekStart;
    for (const m of week) {
      if (m.points <= 0) continue;
      if (isPlayoffWeek && qualified.size > 0 && !qualified.has(m.roster_id)) continue;
      const team = teamsByRoster.get(m.roster_id);
      if (!team) continue;

      const starters = m.starters ?? [];
      const pointsByPlayer = m.players_points ?? {};
      const lineup: LineupSlot[] = starters
        .map((pid, idx) => {
          if (!pid || pid === "0") return null; // empty slot, nobody started there
          const meta = players[pid];
          const isDef = /^[A-Z]{2,4}$/.test(pid) && !meta;
          return {
            playerId: pid,
            playerName: isDef ? `${pid} D/ST` : meta?.full_name ?? pid,
            position: starterSlots[idx] ?? meta?.position ?? "-",
            points: Math.round((pointsByPlayer[pid] ?? 0) * 10) / 10,
          };
        })
        .filter((slot): slot is LineupSlot => slot !== null);

      entries.push({
        season,
        week: weekNum,
        teamName: team.teamName,
        points: Math.round(m.points * 10) / 10,
        lineup,
      });
    }
  });

  return entries;
}

export function topAndBottom(
  entries: ScoreRecordEntry[],
  count = 5,
): { highest: ScoreRecordEntry[]; lowest: ScoreRecordEntry[] } {
  const descending = [...entries].sort((a, b) => b.points - a.points);
  const ascending = [...entries].sort((a, b) => a.points - b.points);
  return { highest: descending.slice(0, count), lowest: ascending.slice(0, count) };
}
