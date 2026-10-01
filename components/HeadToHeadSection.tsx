"use client";

import { useMemo, useState } from "react";
import type { HeadToHeadGame } from "@/lib/history";

type Person = { ownerId: string; teamName: string };

export default function HeadToHeadSection({ people, games }: { people: Person[]; games: HeadToHeadGame[] }) {
  const [ownerA, setOwnerA] = useState(people[0]?.ownerId ?? "");
  const [ownerB, setOwnerB] = useState(people[1]?.ownerId ?? "");

  const nameFor = (ownerId: string) => people.find((p) => p.ownerId === ownerId)?.teamName ?? ownerId;

  const record = useMemo(() => {
    if (!ownerA || !ownerB || ownerA === ownerB) return null;
    const meetings = games
      .filter(
        (g) =>
          (g.ownerIdA === ownerA && g.ownerIdB === ownerB) || (g.ownerIdA === ownerB && g.ownerIdB === ownerA),
      )
      .map((g) => {
        const aPoints = g.ownerIdA === ownerA ? g.pointsA : g.pointsB;
        const bPoints = g.ownerIdA === ownerA ? g.pointsB : g.pointsA;
        return { season: g.season, week: g.week, aPoints, bPoints };
      })
      .sort((m1, m2) => m2.season.localeCompare(m1.season) || m2.week - m1.week);

    let winsA = 0;
    let winsB = 0;
    let ties = 0;
    for (const m of meetings) {
      if (m.aPoints > m.bPoints) winsA++;
      else if (m.bPoints > m.aPoints) winsB++;
      else ties++;
    }
    return { meetings, winsA, winsB, ties };
  }, [games, ownerA, ownerB]);

  function handleChangeA(value: string) {
    setOwnerA(value);
    if (value === ownerB) setOwnerB(ownerA);
  }

  function handleChangeB(value: string) {
    setOwnerB(value);
    if (value === ownerA) setOwnerA(ownerB);
  }

  return (
    <section id="head-to-head" className="view" data-yard="OPP 15">
      <div className="card">
        <div className="eyebrow">Rivalries</div>
        <h2 className="sec">Matchup History</h2>

        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
          <select className="select" value={ownerA} onChange={(e) => handleChangeA(e.target.value)}>
            {people.map((p) => (
              <option key={p.ownerId} value={p.ownerId}>
                {p.teamName}
              </option>
            ))}
          </select>
          <span className="muted">vs</span>
          <select className="select" value={ownerB} onChange={(e) => handleChangeB(e.target.value)}>
            {people.map((p) => (
              <option key={p.ownerId} value={p.ownerId}>
                {p.teamName}
              </option>
            ))}
          </select>
        </div>

        {!record && <p className="lead">Pick two different teams to see their head-to-head record.</p>}

        {record && record.meetings.length === 0 && (
          <p className="lead">
            {nameFor(ownerA)} and {nameFor(ownerB)} haven&apos;t played each other yet.
          </p>
        )}

        {record && record.meetings.length > 0 && (
          <>
            <div className="callout high" style={{ marginBottom: 14 }}>
              <b>{nameFor(ownerA)}</b> leads {record.winsA}-{record.winsB}
              {record.ties ? `-${record.ties}` : ""} vs <b>{nameFor(ownerB)}</b>
              {record.winsA === record.winsB ? " (series tied)" : ""}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Season</th>
                  <th>Week</th>
                  <th className="num">{nameFor(ownerA)}</th>
                  <th className="num">{nameFor(ownerB)}</th>
                </tr>
              </thead>
              <tbody>
                {record.meetings.map((m, i) => (
                  <tr key={i}>
                    <td>{m.season}</td>
                    <td>{m.week}</td>
                    <td className="num tnum">{m.aPoints > m.bPoints ? <b>{m.aPoints.toFixed(1)}</b> : m.aPoints.toFixed(1)}</td>
                    <td className="num tnum">{m.bPoints > m.aPoints ? <b>{m.bPoints.toFixed(1)}</b> : m.bPoints.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </section>
  );
}
