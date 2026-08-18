import type { PowerRank } from "./power-rankings";
import type { PositionStrength } from "./positions";
import type { PredictionsOutlook } from "./predictions";
import type { WeeklyRecap } from "./recap";
import type { Team } from "./standings";
import type { BanterEntry } from "./supabase";

// Builds a clean plain-text summary of the week's numbers. This is shown
// directly to the user to paste into Claude by hand when no API key is
// configured, and is also what we send to Claude when a key IS configured
// -- so the automatic write-ups are grounded in exactly this data.
export function buildBrief(input: {
  leagueName: string;
  season: string;
  week: number;
  seasonType: string;
  standings: Team[];
  powerRankings: PowerRank[];
  recap: WeeklyRecap | null;
  positions: PositionStrength[];
  predictions: PredictionsOutlook;
  banter: BanterEntry[];
}): string {
  const { leagueName, season, week, seasonType, standings, powerRankings, recap, positions, predictions, banter } =
    input;

  const lines: string[] = [];
  lines.push(`League: ${leagueName} -- ${season} season, week ${week} (${seasonType}).`);
  lines.push("");

  lines.push("STANDINGS (record, points for, points against):");
  standings.forEach((t, i) => {
    lines.push(
      `${i + 1}. ${t.teamName} (${t.ownerName}) -- ${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ""}, ` +
        `${t.fpts.toFixed(1)} PF, ${t.fptsAgainst.toFixed(1)} PA. [rosterId=${t.rosterId}]`,
    );
  });
  lines.push("");

  lines.push("POWER RANKINGS (blend of record + scoring, 0-100 score):");
  powerRankings.forEach((pr) => {
    lines.push(`${pr.rank}. ${pr.team.teamName} -- score ${pr.score}. [rosterId=${pr.team.rosterId}]`);
  });
  lines.push("");

  if (recap) {
    lines.push(`MOST RECENT COMPLETED WEEK: Week ${recap.week}`);
    for (const m of recap.matchups) {
      const result =
        m.winner === null
          ? "TIE"
          : `${m.winner.teamName} won`;
      lines.push(
        `  ${m.teamA.team.teamName} ${m.teamA.points.toFixed(1)} vs ${m.teamB.team.teamName} ${m.teamB.points.toFixed(1)} -- ${result}`,
      );
    }
    if (recap.highScorer) lines.push(`  High scorer: ${recap.highScorer.team.teamName} (${recap.highScorer.points.toFixed(1)})`);
    if (recap.lowScorer) lines.push(`  Low scorer: ${recap.lowScorer.team.teamName} (${recap.lowScorer.points.toFixed(1)})`);
  } else {
    lines.push("MOST RECENT COMPLETED WEEK: none yet -- season hasn't produced a finished week.");
  }
  lines.push("");

  if (positions.length > 0) {
    lines.push("BEST POSITION GROUPS (starter points by position, season to date):");
    for (const p of positions) {
      const top = p.leaderboard[0];
      if (top) lines.push(`  ${p.position}: ${top.team.teamName} leads (${top.points.toFixed(1)} pts)`);
    }
  } else {
    lines.push("BEST POSITION GROUPS: no games played yet.");
  }
  lines.push("");

  if (predictions.hasEnoughData) {
    lines.push("PREDICTIONS INPUTS:");
    lines.push(`  In the playoff picture: ${predictions.inTheHunt.map((p) => p.team.teamName).join(", ") || "none"}`);
    lines.push(`  Bubble watch: ${predictions.bubbleWatch.map((p) => p.team.teamName).join(", ") || "none"}`);
    lines.push(`  Current favorite: ${predictions.favorite?.team.teamName ?? "unclear"}`);
    lines.push(`  Darkhorses: ${predictions.darkhorses.map((p) => p.team.teamName).join(", ") || "none"}`);
    lines.push(`  Pacing for last place: ${predictions.lastPlacePace?.team.teamName ?? "unclear"}`);
  } else {
    lines.push("PREDICTIONS INPUTS: not enough games played yet to project the season.");
  }
  lines.push("");

  if (banter.length > 0) {
    lines.push("BANTER SUBMITTED BY THE LEAGUE THIS WEEK:");
    for (const b of banter) {
      lines.push(`  - "${b.quote}"${b.author ? ` -- ${b.author}` : ""}`);
    }
  } else {
    lines.push("BANTER SUBMITTED THIS WEEK: none.");
  }

  return lines.join("\n");
}
