import { NextRequest, NextResponse } from "next/server";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { EMPLOYEES } from "@/lib/employees";
import { countBusinessDays, toISODate } from "@/lib/dates";
import type { EmployeeSummary, PtoEntry } from "@/lib/types";

// The password check happens here, server-side, so it's never shipped to
// the browser in the page's JavaScript. Change PTO_SUMMARY_PASSWORD in the
// environment variables (Vercel -> Project -> Settings -> Environment
// Variables) any time -- no code changes needed. Defaults to "Thrivence"
// if not set.
export async function POST(req: NextRequest) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const expected = process.env.PTO_SUMMARY_PASSWORD || "Thrivence";
  if (!body.password || body.password !== expected) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ summary: [], configured: false });
  }

  const now = new Date();
  const yearStart = `${now.getFullYear()}-01-01`;
  const yearEnd = `${now.getFullYear()}-12-31`;
  const todayIso = toISODate(now);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("pto_entries")
    .select("*")
    .lte("start_date", yearEnd)
    .gte("end_date", yearStart);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const entries = (data || []) as PtoEntry[];

  const summary: EmployeeSummary[] = EMPLOYEES.map((employee) => {
    const daysTakenYtd = entries
      .filter((e) => e.employee_name === employee.name)
      .reduce((total, e) => {
        // Clip to this year and to today, so "taken" only counts PTO
        // that has actually happened (year to date), not future entries.
        const start = e.start_date < yearStart ? yearStart : e.start_date;
        const rawEnd = e.end_date > todayIso ? todayIso : e.end_date;
        if (rawEnd < start) return total;
        return total + countBusinessDays(start, rawEnd);
      }, 0);

    return {
      name: employee.name,
      annualDays: employee.annualDays,
      daysTakenYtd,
      daysLeft: Math.max(employee.annualDays - daysTakenYtd, 0),
    };
  });

  return NextResponse.json({ summary, configured: true, year: now.getFullYear() });
}
