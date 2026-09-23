import type { Team } from "./standings";
import type { PlayersMap, SleeperTransaction } from "./types";

export type TransactionMove = {
  playerName: string;
  // Only set for trades -- the team a traded player came from (for an add)
  // or went to (for a drop). Null for waiver/free-agent moves.
  otherTeamName: string | null;
};

export type TeamTransactionSummary = {
  team: Team;
  count: number;
  mostRecent: {
    date: string; // ISO timestamp
    type: string; // "trade" | "waiver" | "free_agent"
    added: TransactionMove[];
    dropped: TransactionMove[];
  } | null;
};

function playerNameFor(playerId: string, players: PlayersMap): string {
  if (players[playerId]) return players[playerId].full_name ?? playerId;
  // DEF slots use the team abbreviation directly as the "player id".
  if (/^[A-Z]{2,4}$/.test(playerId)) return `${playerId} D/ST`;
  return playerId;
}

// One row per team: how many completed transactions they've made this
// season, and the fullest detail (players in/out, trade partner, date) for
// whichever of those was most recent.
export function computeTransactionSummaries(
  transactions: SleeperTransaction[],
  teamsByRoster: Map<number, Team>,
  players: PlayersMap,
): TeamTransactionSummary[] {
  const completed = transactions.filter((t) => t.status === "complete");

  const counts = new Map<number, number>();
  const mostRecentByRoster = new Map<number, SleeperTransaction>();

  for (const t of completed) {
    for (const rosterId of t.roster_ids) {
      counts.set(rosterId, (counts.get(rosterId) ?? 0) + 1);
      const existing = mostRecentByRoster.get(rosterId);
      if (!existing || t.created > existing.created) {
        mostRecentByRoster.set(rosterId, t);
      }
    }
  }

  return Array.from(teamsByRoster.values()).map((team) => {
    const count = counts.get(team.rosterId) ?? 0;
    const t = mostRecentByRoster.get(team.rosterId);
    if (!t) return { team, count, mostRecent: null };

    const adds = Object.entries(t.adds ?? {});
    const drops = Object.entries(t.drops ?? {});

    const added: TransactionMove[] = adds
      .filter(([, rosterId]) => rosterId === team.rosterId)
      .map(([playerId]) => {
        const fromRoster = t.type === "trade" ? drops.find(([pid]) => pid === playerId)?.[1] : undefined;
        return {
          playerName: playerNameFor(playerId, players),
          otherTeamName: fromRoster != null ? teamsByRoster.get(fromRoster)?.teamName ?? null : null,
        };
      });

    const dropped: TransactionMove[] = drops
      .filter(([, rosterId]) => rosterId === team.rosterId)
      .map(([playerId]) => {
        const toRoster = t.type === "trade" ? adds.find(([pid]) => pid === playerId)?.[1] : undefined;
        return {
          playerName: playerNameFor(playerId, players),
          otherTeamName: toRoster != null ? teamsByRoster.get(toRoster)?.teamName ?? null : null,
        };
      });

    return {
      team,
      count,
      mostRecent: { date: new Date(t.created).toISOString(), type: t.type, added, dropped },
    };
  });
}
