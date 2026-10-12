import { NextRequest, NextResponse } from "next/server";
import * as sleeper from "@/lib/sleeper";
import { buildTeams } from "@/lib/standings";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Runs daily (see vercel.json) -- snapshots every currently-rostered player
// marked Out or IR and logs one row per player per week. Catches mid-week
// status changes (Questionable -> Out, Out -> IR) by upserting on
// (season, week, player_id, roster_id): later runs overwrite that week's
// status instead of creating duplicate rows.
export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured -- nowhere to log injury events." }, { status: 500 });
  }

  try {
    const leagueId = sleeper.getLeagueId();
    const [league, state, users, rosters, players] = await Promise.all([
      sleeper.getLeague(leagueId),
      sleeper.getState(),
      sleeper.getUsers(leagueId),
      sleeper.getRosters(leagueId),
      sleeper.getPlayers(),
    ]);

    const teams = buildTeams(league, users, rosters);

    const rows: {
      season: string;
      week: number;
      player_id: string;
      player_name: string;
      roster_id: number;
      status: string;
    }[] = [];

    for (const team of teams) {
      for (const playerId of team.players) {
        const meta = players[playerId];
        const status = meta?.injury_status;
        if (status !== "Out" && status !== "IR") continue;
        rows.push({
          season: league.season,
          week: state.week,
          player_id: playerId,
          player_name: meta?.full_name ?? playerId,
          roster_id: team.rosterId,
          status,
        });
      }
    }

    if (rows.length > 0) {
      const { error } = await supabase
        .from("injury_events")
        .upsert(rows, { onConflict: "season,week,player_id,roster_id" });
      if (error) {
        console.error("injury cron upsert failed", error);
        return NextResponse.json({ error: "Failed to save injury events." }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, season: league.season, week: state.week, logged: rows.length });
  } catch (err) {
    console.error("injury cron failed", err);
    return NextResponse.json({ error: "Something went wrong logging injuries." }, { status: 500 });
  }
}
