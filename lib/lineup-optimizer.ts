// Greedy optimal-lineup assignment, shared by weekly lineup efficiency
// (lib/lineup-efficiency.ts, actual single-week points) and the trade
// analyzer's season-end impact estimate (lib/trade-value.ts /
// TradeAnalyzerSection, rest-of-season projected points). Fill fixed
// positional slots with the best players at that position, then
// FLEX/SUPER_FLEX with the best remaining eligible players. Good enough for
// standard single-FLEX leagues (not a perfect assignment solver for exotic
// multi-flex setups, but close).

export type LineupCandidate = { playerId: string; position: string; points: number };

const FLEX_ELIGIBLE = ["RB", "WR", "TE"];
const SUPERFLEX_ELIGIBLE = ["QB", "RB", "WR", "TE"];

function slotCounts(rosterPositions: string[]): { fixed: Record<string, number>; flex: number; superflex: number } {
  const fixed: Record<string, number> = {};
  let flex = 0;
  let superflex = 0;
  for (const pos of rosterPositions) {
    if (pos === "BN" || pos === "IR" || pos === "TAXI") continue;
    if (pos === "FLEX") flex++;
    else if (pos === "SUPER_FLEX") superflex++;
    else fixed[pos] = (fixed[pos] ?? 0) + 1;
  }
  return { fixed, flex, superflex };
}

export function computeOptimalPoints(candidates: LineupCandidate[], rosterPositions: string[]): number {
  const { fixed, flex, superflex } = slotCounts(rosterPositions);
  const used = new Set<string>();
  let total = 0;

  for (const [pos, count] of Object.entries(fixed)) {
    const pool = candidates
      .filter((p) => p.position === pos && !used.has(p.playerId))
      .sort((a, b) => b.points - a.points)
      .slice(0, count);
    for (const p of pool) {
      used.add(p.playerId);
      total += p.points;
    }
  }

  for (let i = 0; i < flex; i++) {
    const best = candidates
      .filter((p) => FLEX_ELIGIBLE.includes(p.position) && !used.has(p.playerId))
      .sort((a, b) => b.points - a.points)[0];
    if (best) {
      used.add(best.playerId);
      total += best.points;
    }
  }

  for (let i = 0; i < superflex; i++) {
    const best = candidates
      .filter((p) => SUPERFLEX_ELIGIBLE.includes(p.position) && !used.has(p.playerId))
      .sort((a, b) => b.points - a.points)[0];
    if (best) {
      used.add(best.playerId);
      total += best.points;
    }
  }

  return Math.round(total * 10) / 10;
}
