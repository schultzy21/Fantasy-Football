// Dot-products a raw per-category stat/projection line against this
// league's own scoring_settings -- Sleeper's stats, projections, and
// scoring_settings all share the same stat-key vocabulary (rec, rec_yd,
// pass_td, ...), so this works for any position (including DEF/K) without
// special-casing.
export function statPoints(statLine: Record<string, number> | undefined, scoring: Record<string, number>): number {
  if (!statLine) return 0;
  let total = 0;
  for (const [key, weight] of Object.entries(scoring)) {
    const v = statLine[key];
    if (typeof v === "number") total += v * weight;
  }
  return total;
}
