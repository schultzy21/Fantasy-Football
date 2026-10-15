import type { Team } from "./standings";
import type { SleeperMatchup } from "./types";

export type Record3 = { wins: number; losses: number; ties: number };

export type LuckEntry = {
  team: Team;
  actual: Record3;
  allPlay: Record3; // this team's score vs. every other team's score, every played week
  luckWins: number; // actual wins - "expected" wins implied by the all-play record
};

function recordPct(r: Record3): number {
  const games = r.wins + r.losses + r.ties;
  if (games === 0) return 0;
  return (r.wins + r.ties * 0.5) / games;
}

// For every completed week, compares each team's score against every other
// team's score that week (not just their actual opponent) and tallies the
// result -- "what's my record if I played the whole league every week?".
// The gap between this and a team's real record is the honest way to tell
// a well-built team that's been getting beat by the schedule from a team
// that's genuinely riding a hot streak.
export function computeLuckTable(teams: Team[], weeklyMatchups: SleeperMatchup[][]): LuckEntry[] {
  const allPlayByRoster = new Map<number, Record3>();
  for (const t of teams) allPlayByRoster.set(t.rosterId, { wins: 0, losses: 0, ties: 0 });

  for (const week of weeklyMatchups) {
    const played = week.filter((m) => m.points > 0);
    if (played.length < 2) continue; // week not complete (or a true bye week)
    for (const me of played) {
      const rec = allPlayByRoster.get(me.roster_id);
      if (!rec) continue;
      for (const opp of played) {
        if (opp.roster_id === me.roster_id) continue;
        if (me.points > opp.points) rec.wins++;
        else if (me.points < opp.points) rec.losses++;
        else rec.ties++;
      }
    }
  }

  return teams
    .map((team) => {
      const allPlay = allPlayByRoster.get(team.rosterId) ?? { wins: 0, losses: 0, ties: 0 };
      const actual: Record3 = { wins: team.wins, losses: team.losses, ties: team.ties };
      const gamesPlayed = actual.wins + actual.losses + actual.ties;
      const luckWins = Math.round((recordPct(actual) - recordPct(allPlay)) * gamesPlayed * 10) / 10;
      return { team, actual, allPlay, luckWins };
    })
    .sort((a, b) => b.luckWins - a.luckWins);
}
