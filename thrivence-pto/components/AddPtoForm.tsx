"use client";

import { useState } from "react";
import { toISODate, addMonths } from "@/lib/dates";
import { EMPLOYEE_NAMES } from "@/lib/employees";

export default function AddPtoForm({
  onAdded,
}: {
  onAdded: () => void;
}) {
  const today = toISODate(new Date());
  const maxDate = toISODate(addMonths(new Date(), 12));

  const [employee, setEmployee] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<
    { type: "idle" } | { type: "saving" } | { type: "error"; msg: string } | { type: "success" }
  >({ type: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employee) {
      setStatus({ type: "error", msg: "Choose your name first." });
      return;
    }
    if (endDate < startDate) {
      setStatus({ type: "error", msg: "End date can't be before the start date." });
      return;
    }
    setStatus({ type: "saving" });
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_name: employee,
          start_date: startDate,
          end_date: endDate,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: "error", msg: data.error || "Something went wrong." });
        return;
      }
      setStatus({ type: "success" });
      setNote("");
      onAdded();
    } catch {
      setStatus({ type: "error", msg: "Network error -- please try again." });
    }
  }

  return (
    <section className="card">
      <div className="card-accent" />
      <div className="card-body">
        <p className="section-eyebrow">Add time off</p>
        <h2>I&apos;ll be out of office</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="employee">Your name</label>
              <select
                id="employee"
                value={employee}
                onChange={(e) => setEmployee(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select your name&hellip;
                </option>
                {EMPLOYEE_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="start">First day out</label>
              <input
                id="start"
                type="date"
                value={startDate}
                min={today}
                max={maxDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value > endDate) setEndDate(e.target.value);
                }}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="end">Last day out</label>
              <input
                id="end"
                type="date"
                value={endDate}
                min={startDate}
                max={maxDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            <div className="field field-note">
              <label htmlFor="note">Note (optional)</label>
              <input
                id="note"
                type="text"
                placeholder="e.g. Reachable by email, or fully offline"
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={status.type === "saving"}>
                {status.type === "saving" ? "Adding..." : "Add to calendar"}
              </button>
              {status.type === "error" && (
                <span className="form-msg error">{status.msg}</span>
              )}
              {status.type === "success" && (
                <span className="form-msg success">Added -- thanks for the heads-up!</span>
              )}
            </div>
          </div>
        </form>
        <p className="helper-text">
          You can enter time off up to 12 months in advance. Single day or a
          multi-week stretch -- just set the first and last day you&apos;ll be
          out (both inclusive).
        </p>
      </div>
    </section>
  );
}
