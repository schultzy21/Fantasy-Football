import { NextRequest, NextResponse } from "next/server";
import { getSupabase, isSupabaseConfigured, getMissingSupabaseEnvVars } from "@/lib/supabase";
import { EMPLOYEE_NAMES } from "@/lib/employees";
import type { NewPtoEntry } from "@/lib/types";

// This route reads live data and env state on every request -- never
// statically cache it.
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      entries: [],
      configured: false,
      missingVars: getMissingSupabaseEnvVars(),
    });
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("pto_entries")
    .select("*")
    .order("start_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ entries: data, configured: true });
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured yet. See README.md." },
      { status: 503 }
    );
  }

  let body: NewPtoEntry;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { employee_name, start_date, end_date, note } = body;

  if (!employee_name || !EMPLOYEE_NAMES.includes(employee_name)) {
    return NextResponse.json({ error: "Choose a valid team member." }, { status: 400 });
  }
  if (!start_date || !end_date || !/^\d{4}-\d{2}-\d{2}$/.test(start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
    return NextResponse.json({ error: "Start and end dates are required." }, { status: 400 });
  }
  if (end_date < start_date) {
    return NextResponse.json({ error: "End date can't be before the start date." }, { status: 400 });
  }
  if (note && note.length > 500) {
    return NextResponse.json({ error: "Note is too long (500 characters max)." }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("pto_entries")
    .insert({
      employee_name,
      start_date,
      end_date,
      note: note?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ entry: data }, { status: 201 });
}
