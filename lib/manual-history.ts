// Optional: hand-entered history for seasons that predate this league's
// Sleeper record (e.g. a league that used to run somewhere else). Sleeper
// history (via previous_league_id) is preferred and used automatically
// when available -- this is only shown if there's nothing to chain to.
//
// Add entries like:
// { season: "2019", champion: "Dave's Dynasty", note: "Beat Mike in the final" },

export type ManualHistoryEntry = {
  season: string;
  champion: string;
  note?: string;
};

export const manualHistory: ManualHistoryEntry[] = [];
