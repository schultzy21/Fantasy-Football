"use client";

import { useMemo, useState } from "react";
import type { PlayerValue } from "@/lib/trade-value";

type TeamRef = { rosterId: number; teamName: string };

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "K", "DEF"] as const;

function InjuryPill({ status }: { status: string | null }) {
  if (!status) return null;
  const severe = status === "Out" || status === "IR" || status === "Doubtful";
  return <span className={`pill ${severe ? "flag" : "bubble"}`} style={{ marginLeft: 8 }}>{status}</span>;
}

function TrendArrow({ trend }: { trend: PlayerValue["snapShareTrend"] }) {
  if (trend === "up") return <span style={{ color: "var(--turf)" }}> &#9650;</span>;
  if (trend === "down") return <span style={{ color: "var(--flag)" }}> &#9660;</span>;
  return null;
}

function TradeSide({
  label,
  teams,
  rosterId,
  onRosterChange,
  roster,
  selected,
  onToggle,
}: {
  label: string;
  teams: TeamRef[];
  rosterId: number;
  onRosterChange: (id: number) => void;
  roster: PlayerValue[];
  selected: Set<string>;
  onToggle: (playerId: string) => void;
}) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </div>
      <select
        className="select"
        value={rosterId}
        onChange={(e) => onRosterChange(Number(e.target.value))}
        style={{ width: "100%", marginBottom: 10 }}
      >
        {teams.map((t) => (
          <option key={t.rosterId} value={t.rosterId}>
            {t.teamName}
          </option>
        ))}
      </select>
      <div style={{ maxHeight: 220, overflowY: "auto", border: "2px solid var(--line)", padding: "4px 10px" }}>
        {roster.length === 0 && <p className="muted" style={{ fontSize: 13 }}>No rostered players.</p>}
        {roster.map((p) => (
          <label
            key={p.playerId}
            style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", fontSize: 14, cursor: "pointer" }}
          >
            <input type="checkbox" checked={selected.has(p.playerId)} onChange={() => onToggle(p.playerId)} />
            <span style={{ flex: 1 }}>{p.name}</span>
            <span className="muted tnum">{p.value}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function TradeAnalyzerSection({
  playerValues,
  teams,
}: {
  playerValues: PlayerValue[];
  teams: TeamRef[];
}) {
  const [query, setQuery] = useState("");
  const [posFilter, setPosFilter] = useState<(typeof POSITIONS)[number]>("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return playerValues.filter((p) => {
      if (posFilter !== "ALL" && p.position !== posFilter) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.ownerTeamName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [playerValues, query, posFilter]);

  const [rosterA, setRosterA] = useState(teams[0]?.rosterId ?? 0);
  const [rosterB, setRosterB] = useState(teams[1]?.rosterId ?? 0);
  const [selectedA, setSelectedA] = useState<Set<string>>(new Set());
  const [selectedB, setSelectedB] = useState<Set<string>>(new Set());

  const rosterAPlayers = useMemo(
    () => playerValues.filter((p) => p.rosterId === rosterA).sort((a, b) => b.value - a.value),
    [playerValues, rosterA],
  );
  const rosterBPlayers = useMemo(
    () => playerValues.filter((p) => p.rosterId === rosterB).sort((a, b) => b.value - a.value),
    [playerValues, rosterB],
  );

  function toggle(selected: Set<string>, setSelected: (s: Set<string>) => void, playerId: string) {
    const next = new Set(selected);
    if (next.has(playerId)) next.delete(playerId);
    else next.add(playerId);
    setSelected(next);
  }

  const valueById = useMemo(() => new Map(playerValues.map((p) => [p.playerId, p.value])), [playerValues]);
  const totalA = [...selectedA].reduce((sum, id) => sum + (valueById.get(id) ?? 0), 0);
  const totalB = [...selectedB].reduce((sum, id) => sum + (valueById.get(id) ?? 0), 0);
  const hasOffer = selectedA.size > 0 || selectedB.size > 0;
  const diff = totalA - totalB;

  return (
    <section id="trade-analyzer" className="view" data-yard="OPP 25">
      <div className="card">
        <div className="eyebrow">Trade Tools</div>
        <h2 className="sec">Trade Analyzer</h2>
        <p className="lead">
          Value score (0-100) for every rostered player, built from this league&apos;s own data: rest-of-season
          projected points scored to this league&apos;s exact settings, value over replacement for this
          league&apos;s roster format (starters + FLEX), and a small bump for recent snap-share trend.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search player or team..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ maxWidth: 240 }}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {POSITIONS.map((p) => (
              <button
                key={p}
                className="btn"
                style={{ padding: "7px 10px", fontSize: 10, borderColor: posFilter === p ? "var(--cyan)" : undefined }}
                onClick={() => setPosFilter(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div style={{ maxHeight: 420, overflowY: "auto", border: "2px solid var(--line)" }}>
          <table>
            <thead>
              <tr>
                <th className="num">Value</th>
                <th>Player</th>
                <th>Pos</th>
                <th>NFL</th>
                <th>Fantasy Owner</th>
                <th className="num">ROS Pts</th>
                <th className="num">Snap%</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.playerId}>
                  <td className="num tnum">
                    <b>{p.value}</b>
                  </td>
                  <td>
                    {p.name}
                    <InjuryPill status={p.injuryStatus} />
                  </td>
                  <td className="muted">{p.position}</td>
                  <td className="muted">{p.nflTeam ?? "-"}</td>
                  <td className="muted">{p.ownerTeamName}</td>
                  <td className="num tnum">{p.rosProjPoints.toFixed(1)}</td>
                  <td className="num tnum">
                    {p.snapShare != null ? `${Math.round(p.snapShare * 100)}%` : "-"}
                    <TrendArrow trend={p.snapShareTrend} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    No players match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <h3 style={{ margin: "22px 0 10px", fontSize: 14, color: "var(--muted)", textTransform: "uppercase" }}>
          Compare a Trade
        </h3>
        <div className="trade-grid">
          <TradeSide
            label="Side A"
            teams={teams}
            rosterId={rosterA}
            onRosterChange={(id) => {
              setRosterA(id);
              setSelectedA(new Set());
            }}
            roster={rosterAPlayers}
            selected={selectedA}
            onToggle={(id) => toggle(selectedA, setSelectedA, id)}
          />
          <TradeSide
            label="Side B"
            teams={teams}
            rosterId={rosterB}
            onRosterChange={(id) => {
              setRosterB(id);
              setSelectedB(new Set());
            }}
            roster={rosterBPlayers}
            selected={selectedB}
            onToggle={(id) => toggle(selectedB, setSelectedB, id)}
          />
        </div>

        {hasOffer && (
          <div className={`callout ${diff === 0 ? "" : diff > 0 ? "high" : "low"}`} style={{ marginTop: 14 }}>
            Side A: <b>{totalA}</b> total value &middot; Side B: <b>{totalB}</b> total value
            {diff === 0 && " -- dead even."}
            {diff > 0 && ` -- Side A gets the better end by ${diff}.`}
            {diff < 0 && ` -- Side B gets the better end by ${-diff}.`}
          </div>
        )}
      </div>
    </section>
  );
}
