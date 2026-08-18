"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  buildMonthGrid,
  entryCoversDate,
  formatMonthLabel,
} from "@/lib/dates";
import type { PtoEntry } from "@/lib/types";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const VISIBLE_MONTHS = 3;
const MAX_MONTHS_AHEAD = 12;

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export default function CalendarView({ entries }: { entries: PtoEntry[] }) {
  const today = useMemo(() => new Date(), []);
  const [offset, setOffset] = useState(0);

  const maxOffset = MAX_MONTHS_AHEAD - VISIBLE_MONTHS;
  const baseMonth = addMonths(today, offset);

  const months = Array.from({ length: VISIBLE_MONTHS }, (_, i) =>
    addMonths(baseMonth, i)
  );

  const monthOptions = Array.from({ length: maxOffset + 1 }, (_, i) => {
    const d = addMonths(today, i);
    return { offset: i, label: formatMonthLabel(d) };
  });

  return (
    <section className="card">
      <div className="card-accent" />
      <div className="card-body">
        <div className="calendar-toolbar">
          <div>
            <p className="section-eyebrow">Team calendar</p>
            <h2 style={{ marginBottom: 0 }}>Upcoming time off</h2>
          </div>
          <div className="calendar-nav">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setOffset((o) => Math.max(0, o - VISIBLE_MONTHS))}
              disabled={offset === 0}
              aria-label="Previous months"
            >
              &#8249;
            </button>
            <select
              className="month-select"
              value={offset}
              onChange={(e) => setOffset(Number(e.target.value))}
            >
              {monthOptions.map((opt) => (
                <option key={opt.offset} value={opt.offset}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="icon-btn"
              onClick={() =>
                setOffset((o) => Math.min(maxOffset, o + VISIBLE_MONTHS))
              }
              disabled={offset >= maxOffset}
              aria-label="Next months"
            >
              &#8250;
            </button>
          </div>
        </div>
        <p className="months-scope">
          Showing {formatMonthLabel(months[0])} &ndash;{" "}
          {formatMonthLabel(months[months.length - 1])}. Time off can be entered
          up to {MAX_MONTHS_AHEAD} months in advance using the form below.
        </p>

        <div className="months-row">
          {months.map((month) => (
            <div className="month-block" key={month.toISOString()}>
              <h3>{formatMonthLabel(month)}</h3>
              <div className="weekday-row">
                {WEEKDAY_LABELS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="day-grid">
                {buildMonthGrid(month).map((day) => {
                  const dayEntries = entries.filter((e) =>
                    entryCoversDate(e, day.iso)
                  );
                  const maxShown = 3;
                  const cellClass = [
                    "day-cell",
                    !day.inMonth && "out-of-month",
                    day.inMonth && day.isWeekend && "weekend",
                    day.isToday && "is-today",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <div className={cellClass} key={day.iso} title={
                      dayEntries.length
                        ? dayEntries.map((e) => e.employee_name).join(", ")
                        : undefined
                    }>
                      <div className="day-num">{day.date.getDate()}</div>
                      {day.inMonth &&
                        dayEntries.slice(0, maxShown).map((e) => (
                          <span className="day-chip" key={e.id}>
                            {initials(e.employee_name)} &middot;{" "}
                            {e.employee_name.split(" ")[0]}
                          </span>
                        ))}
                      {day.inMonth && dayEntries.length > maxShown && (
                        <span className="day-chip-more">
                          +{dayEntries.length - maxShown} more
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
