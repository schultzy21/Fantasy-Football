// Date helpers. Dates are handled as plain YYYY-MM-DD strings (and
// noon-anchored Date objects) throughout the app to avoid timezone drift
// between the browser and the server.

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Parse a YYYY-MM-DD string into a local Date anchored at noon, so it never
// shifts to the previous/next day because of timezone rounding.
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function addMonths(d: Date, months: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + months, 1, 12, 0, 0);
}

export function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

// Business days (Mon-Fri) between two inclusive YYYY-MM-DD dates. This is
// what counts against someone's annual PTO allotment.
export function countBusinessDays(startISO: string, endISO: string): number {
  const start = parseISODate(startISO);
  const end = parseISODate(endISO);
  if (end < start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (!isWeekend(cur)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatShortDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatFullDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export interface CalendarDay {
  date: Date;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

// Builds a full 6-row (42 day) grid for the given month, padded with the
// trailing days of the previous month and leading days of the next month
// so every week row is complete (weeks start on Sunday).
export function buildMonthGrid(monthDate: Date): CalendarDay[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1, 12, 0, 0);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const gridStart = new Date(year, month, 1 - startOffset, 12, 0, 0);

  const todayIso = toISODate(new Date());
  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i,
      12,
      0,
      0
    );
    const iso = toISODate(date);
    days.push({
      date,
      iso,
      inMonth: date.getMonth() === month,
      isToday: iso === todayIso,
      isWeekend: isWeekend(date),
    });
  }
  return days;
}

export function entryCoversDate(
  entry: { start_date: string; end_date: string },
  iso: string
): boolean {
  return entry.start_date <= iso && iso <= entry.end_date;
}
