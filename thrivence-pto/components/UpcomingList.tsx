"use client";

import { formatShortDate, toISODate } from "@/lib/dates";
import type { PtoEntry } from "@/lib/types";

export default function UpcomingList({ entries }: { entries: PtoEntry[] }) {
  const todayIso = toISODate(new Date());
  const upcoming = entries
    .filter((e) => e.end_date >= todayIso)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  return (
    <section className="card">
      <div className="card-accent" />
      <div className="card-body">
        <p className="section-eyebrow">Quick reference</p>
        <h2>All upcoming time off</h2>
        {upcoming.length === 0 ? (
          <p className="empty-state">No upcoming time off has been entered yet.</p>
        ) : (
          <table className="upcoming-table">
            <thead>
              <tr>
                <th>Team member</th>
                <th>Dates</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((e) => (
                <tr key={e.id}>
                  <td className="name-pill">{e.employee_name}</td>
                  <td>
                    {e.start_date === e.end_date
                      ? formatShortDate(e.start_date)
                      : `${formatShortDate(e.start_date)} – ${formatShortDate(e.end_date)}`}
                  </td>
                  <td>{e.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
