"use client";

import { useEffect, useState } from "react";
import type { EmployeeSummary } from "@/lib/types";

const SESSION_KEY = "thrivence-pto-leadership-pw";

export default function LeadershipSummary() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<EmployeeSummary[] | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [configured, setConfigured] = useState(true);

  async function fetchSummary(pw: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setUnlocked(false);
        sessionStorage.removeItem(SESSION_KEY);
        return;
      }
      setSummary(data.summary);
      setYear(data.year ?? null);
      setConfigured(data.configured !== false);
      setUnlocked(true);
      sessionStorage.setItem(SESSION_KEY, pw);
    } catch {
      setError("Network error -- please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) fetchSummary(saved);
  }, []);

  if (!unlocked) {
    return (
      <div className="gate-box">
        <h2>Leadership Summary</h2>
        <p style={{ fontSize: 14 }}>
          This view shows PTO taken and remaining for every team member.
          Enter the leadership password to continue.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchSummary(password);
          }}
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Checking..." : "View summary"}
          </button>
        </form>
        {error && <p className="form-msg error">{error}</p>}
      </div>
    );
  }

  if (!configured) {
    return (
      <section className="card">
        <div className="card-accent" />
        <div className="card-body">
          <h2>Supabase isn&apos;t connected yet</h2>
          <p>See README.md for the one-time setup steps.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="card-accent" />
      <div className="card-body">
        <p className="section-eyebrow">Leadership only</p>
        <h2>PTO taken vs. remaining{year ? ` -- ${year}` : ""}</h2>
        <p style={{ fontSize: 13, color: "var(--secondary-text)" }}>
          &ldquo;Taken&rdquo; counts business days (Mon&ndash;Fri) from entries
          on the calendar, year to date. Adjust anyone&apos;s annual allotment
          in <code>lib/employees.ts</code>.
        </p>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Team member</th>
              <th className="num">Annual days</th>
              <th className="num">Taken YTD</th>
              <th className="num">Remaining</th>
              <th style={{ width: 140 }}>Used</th>
            </tr>
          </thead>
          <tbody>
            {(summary || []).map((row) => {
              const pctUsed = row.annualDays
                ? Math.min(100, Math.round((row.daysTakenYtd / row.annualDays) * 100))
                : 0;
              return (
                <tr key={row.name}>
                  <td className="name-pill">{row.name}</td>
                  <td className="num">{row.annualDays}</td>
                  <td className="num">{row.daysTakenYtd}</td>
                  <td className="num">{row.daysLeft}</td>
                  <td>
                    <div className="bar-track">
                      <div
                        className={`bar-fill${pctUsed >= 90 ? " high" : ""}`}
                        style={{ width: `${pctUsed}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
