// Shared types for Sleeper API responses we use.
// Sleeper's API is loosely typed / not versioned, so these only declare
// the fields this app actually reads.

export type SleeperLeague = {
  league_id: string;
  name: string;
  season: string;
  season_type: string;
  status: string;
  previous_league_id: string | null;
  draft_id: string | null;
  total_rosters: number;
  roster_positions: string[];
  settings: {
    playoff_week_start?: number;
    playoff_teams?: number;
    num_teams?: number;
    leg?: number;
  };
};

export type SleeperUser = {
  user_id: string;
  display_name: string;
  metadata?: { team_name?: string | null; avatar?: string | null } | null;
  avatar?: string | null;
};

export type SleeperRoster = {
  roster_id: number;
  owner_id: string | null;
  co_owners?: string[] | null;
  players?: string[] | null;
  starters?: string[] | null;
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
    fpts_decimal?: number;
    fpts_against?: number;
    fpts_against_decimal?: number;
    waiver_position?: number;
    streak?: string;
  };
};

export type SleeperMatchup = {
  matchup_id: number | null;
  roster_id: number;
  points: number;
  starters?: string[] | null;
  players_points?: Record<string, number> | null;
  starters_points?: number[] | null;
};

export type SleeperBracketMatch = {
  r: number; // round
  m: number; // match id
  t1: number | null; // roster id or ref to prior match winner
  t2: number | null;
  w?: number | null; // winner roster id
  l?: number | null; // loser roster id
  t1_from?: { w?: number; l?: number };
  t2_from?: { w?: number; l?: number };
};

export type SleeperDraft = {
  draft_id: string;
  status: string;
  season: string;
  type: string;
};

export type SleeperDraftPick = {
  round: number;
  pick_no: number;
  roster_id: number;
  player_id: string;
  picked_by: string;
  metadata?: { first_name?: string; last_name?: string; position?: string; team?: string };
};

export type SleeperTransaction = {
  transaction_id: string;
  type: string; // "free_agent" | "waiver" | "trade"
  status: string; // "complete" | "failed" | ...
  roster_ids: number[];
  adds: Record<string, number> | null; // player_id -> roster_id
  drops: Record<string, number> | null; // player_id -> roster_id
  created: number; // epoch ms
};

export type SleeperState = {
  week: number;
  season: string;
  season_type: "pre" | "regular" | "post" | string;
  display_week: number;
  league_season: string;
  previous_season: string;
};

export type SleeperPlayer = {
  player_id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string | null;
  team?: string | null;
  fantasy_positions?: string[] | null;
};

export type PlayersMap = Record<string, SleeperPlayer>;
