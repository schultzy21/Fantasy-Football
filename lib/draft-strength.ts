import type { Team } from "./standings";
import type { SleeperDraftPick } from "./types";

export type DraftStrength = {
  rosterId: number;
  score: number; // 0-100, higher = stronger draft capital
  topPicks: { playerName: string; position: string; pickNo: number }[];
};

// Crude but defensible proxy for "how good is this roster" before any games
// are played: earlier picks are worth more, on a straight linear taper from
// 100 (1st overall) to ~0 (last pick). Teams with no picks recorded (e.g. an
// all-keeper roster in a supplemental-only draft) get the league-average
// score so a data gap doesn't read as "this team is bad."
export function computeDraftStrength(
  draftPicks: (SleeperDraftPick & { playerName: string })[],
  teamsByRoster: Map<number, Team>,
): Map<number, DraftStrength> {
  const result = new Map<number, DraftStrength>();
  if (draftPicks.length === 0) return result;

  const totalPicks = Math.max(...draftPicks.map((p) => p.pick_no));
  const valueForPick = (pickNo: number) => Math.max(0, 100 - ((pickNo - 1) / Math.max(totalPicks - 1, 1)) * 100);

  const byRoster = new Map<number, (SleeperDraftPick & { playerName: string })[]>();
  for (const p of draftPicks) {
    const arr = byRoster.get(p.roster_id) ?? [];
    arr.push(p);
    byRoster.set(p.roster_id, arr);
  }

  const scores: number[] = [];
  for (const [rosterId, picks] of byRoster.entries()) {
    const total = picks.reduce((sum, p) => sum + valueForPick(p.pick_no), 0);
    const score = Math.round((total / picks.length) * 10) / 10; // avg pick value, 0-100
    scores.push(score);
    const topPicks = [...picks]
      .sort((a, b) => a.pick_no - b.pick_no)
      .slice(0, 3)
      .map((p) => ({ playerName: p.playerName, position: p.metadata?.position ?? "", pickNo: p.pick_no }));
    result.set(rosterId, { rosterId, score, topPicks });
  }

  const leagueAvg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 50;
  for (const rosterId of teamsByRoster.keys()) {
    if (!result.has(rosterId)) {
      result.set(rosterId, { rosterId, score: Math.round(leagueAvg * 10) / 10, topPicks: [] });
    }
  }

  return result;
}
