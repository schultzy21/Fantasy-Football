"use client";

import { useMemo, useState } from "react";
import InjuryPill from "./InjuryPill";
import { computeOptimalPoints, type LineupCandidate } from "@/lib/lineup-optimizer";
import type { PlayerValue } from "@/lib/trade-value";

function toLineupCandidate(p: PlayerValue): LineupCandidate {
  return { playerId: p.playerId, position: p.position, points: p.rosProjPoints };
}

function formatDelta(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

type WaiverMatch = { incoming: PlayerValue; alt: PlayerValue | null };
type WaiverSummary = { matches: WaiverMatch[]; incomingValue: number; altValue: number; gap: number };

// For each incoming player, the best still-available free agent at the same
// position (greedily, so two incoming players at the same position don't
// both get matched to the same free agent) -- answers "what could I add for
// free instead of making this trade?"
function matchFreeAgents(incoming: PlayerValue[], freeAgentValues: PlayerValue[]): WaiverSummary {
  const pools = new Map<string, PlayerValue[]>();
  for (const fa of freeAgentValues) {
    const arr = pools.get(fa.position) ?? [];
    arr.push(fa);
    pools.set(fa.position, arr);
  }
  for (const arr of pools.values()) arr.sort((a, b) => b.value - a.value);

  const matches: WaiverMatch[] = [...incoming]
    .sort((a, b) => b.value - a.value)
    .map((p) => ({ incoming: p, alt: pools.get(p.position)?.shift() ?? null }));

  const incomingValue = incoming.reduce((sum, p) => sum + p.value, 0);
  const altValue = matches.reduce((sum, m) => sum + (m.alt?.value ?? 0), 0);
  return { matches, incomingValue, altValue, gap: incomingValue - altValue };
}

type Verdict = { label: string; tone: "good" | "bad" | "mixed"; reasons: string[] };

// Transparent, rule-based (not a black box): each of the three signals the
// user asked for -- lineup points added, net trade value, and the waiver
// alternative -- casts one vote toward or away from "make the trade."
function recommend(lineupDelta: number, netValue: number, waiverGap: number): Verdict {
  let score = 0;
  const reasons: string[] = [];

  if (lineupDelta > 0.5) {
    score++;
    reasons.push(`raises your optimal lineup total by ${Math.round(lineupDelta * 10) / 10} pts`);
  } else if (lineupDelta < -0.5) {
    score--;
    reasons.push(`lowers your optimal lineup total by ${Math.round(-lineupDelta * 10) / 10} pts`);
  }

  if (netValue > 0) {
    score++;
    reasons.push(`nets +${netValue} in trade value`);
  } else if (netValue < 0) {
    score--;
    reasons.push(`nets ${netValue} in trade value`);
  }

  if (waiverGap > 10) {
    score++;
    reasons.push(`beats the best free agent at those spots by ${Math.round(waiverGap)} value`);
  } else if (waiverGap <= 2) {
    score--;
    reasons.push("is barely ahead of what's sitting on waivers right now");
  }

  const label = score >= 2 ? "Make the trade" : score <= -2 ? "Skip it" : "Toss-up";
  const tone: Verdict["tone"] = score >= 2 ? "good" : score <= -2 ? "bad" : "mixed";
  return { label, tone, reasons };
}

type TeamRef = { rosterId: number; teamName: string };

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "K", "DEF"] as const;

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
  freeAgentValues,
  teams,
  rosterPositions,
}: {
  playerValues: PlayerValue[];
  freeAgentValues: PlayerValue[];
  teams: TeamRef[];
  rosterPositions: string[];
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
  // totalA/totalB are what each side GIVES UP, not what they receive.
  const totalA = [...selectedA].reduce((sum, id) => sum + (valueById.get(id) ?? 0), 0);
  const totalB = [...selectedB].reduce((sum, id) => sum + (valueById.get(id) ?? 0), 0);
  const hasOffer = selectedA.size > 0 || selectedB.size > 0;
  // Net value TO Side A = what A receives (totalB) minus what A gives up
  // (totalA). Positive means A comes out ahead.
  const netValueA = totalB - totalA;

  const incomingToA = useMemo(() => rosterBPlayers.filter((p) => selectedB.has(p.playerId)), [rosterBPlayers, selectedB]);
  const incomingToB = useMemo(() => rosterAPlayers.filter((p) => selectedA.has(p.playerId)), [rosterAPlayers, selectedA]);

  // Projected rest-of-season lineup impact: each team's own optimal-lineup
  // total, before vs. after swapping the selected players in/out. This is
  // independent of the 0-100 value score above -- a player who scores 0
  // there (below replacement league-wide) can still raise a thin team's
  // own optimal lineup if they're simply better than what that team
  // currently has at the position.
  const lineupImpact = useMemo(() => {
    if (!hasOffer) return null;
    const afterAPlayers = [...rosterAPlayers.filter((p) => !selectedA.has(p.playerId)), ...incomingToA];
    const afterBPlayers = [...rosterBPlayers.filter((p) => !selectedB.has(p.playerId)), ...incomingToB];

    const beforeA = computeOptimalPoints(rosterAPlayers.map(toLineupCandidate), rosterPositions);
    const afterA = computeOptimalPoints(afterAPlayers.map(toLineupCandidate), rosterPositions);
    const beforeB = computeOptimalPoints(rosterBPlayers.map(toLineupCandidate), rosterPositions);
    const afterB = computeOptimalPoints(afterBPlayers.map(toLineupCandidate), rosterPositions);

    return { beforeA, afterA, beforeB, afterB };
  }, [hasOffer, rosterAPlayers, rosterBPlayers, incomingToA, incomingToB, selectedA, selectedB, rosterPositions]);

  // What each side could add for free off waivers instead, at the same
  // positions they'd be receiving in this trade -- the "available points on
  // waivers" half of the final verdict.
  const waiverImpact = useMemo(() => {
    if (!hasOffer) return null;
    return {
      forA: matchFreeAgents(incomingToA, freeAgentValues),
      forB: matchFreeAgents(incomingToB, freeAgentValues),
    };
  }, [hasOffer, incomingToA, incomingToB, freeAgentValues]);

  const verdictA =
    lineupImpact && waiverImpact
      ? recommend(lineupImpact.afterA - lineupImpact.beforeA, netValueA, waiverImpact.forA.gap)
      : null;
  const verdictB =
    lineupImpact && waiverImpact
      ? recommend(lineupImpact.afterB - lineupImpact.beforeB, -netValueA, waiverImpact.forB.gap)
      : null;

  return (
    <section id="trade-analyzer" className="view" data-yard="OPP 25">
      <div className="card">
        <div className="eyebrow">Trade Tools</div>
        <h2 className="sec">Trade Analyzer</h2>
        <p className="lead">
          Value score (0-100) for every rostered player, built from this league&apos;s own data: rest-of-season
          projected points (scored to this league&apos;s exact settings, with this league&apos;s fantasy playoff
          weeks weighted 1.5x), value over replacement for this league&apos;s roster format (starters + FLEX),
          plus small adjustments for recent snap-share trend, recent actual output vs. projection, and games
          already missed to injury this season.
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
                <th className="num">Missed</th>
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
                  <td className="muted">
                    {p.position}
                    {p.consistency === "boom-bust" && (
                      <span className="pill bubble" style={{ marginLeft: 6 }}>
                        Boom/Bust
                      </span>
                    )}
                  </td>
                  <td className="muted">{p.nflTeam ?? "-"}</td>
                  <td className="muted">{p.ownerTeamName}</td>
                  <td className="num tnum">
                    {p.rosProjPoints.toFixed(1)}
                    <TrendArrow trend={p.recentPpgTrend} />
                  </td>
                  <td className="num tnum">
                    {p.snapShare != null ? `${Math.round(p.snapShare * 100)}%` : "-"}
                    <TrendArrow trend={p.snapShareTrend} />
                  </td>
                  <td className="num tnum">{p.missedGamesThisSeason || "-"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted">
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
          <div className={`callout ${netValueA === 0 ? "" : netValueA > 0 ? "high" : "low"}`} style={{ marginTop: 14 }}>
            Side A gives up <b>{totalA}</b> value, receives <b>{totalB}</b> value
            {netValueA === 0 && " -- dead even."}
            {netValueA > 0 && ` -- Side A gets the better end by ${netValueA}.`}
            {netValueA < 0 && ` -- Side B gets the better end by ${-netValueA}.`}
          </div>
        )}

        {hasOffer && lineupImpact && (
          <div className="callout" style={{ marginTop: 10 }}>
            <div style={{ marginBottom: 4 }}>
              <b>Projected rest-of-season lineup total</b> (each team&apos;s own best-starting-lineup total, this
              trade only):
            </div>
            Side A: {lineupImpact.beforeA.toFixed(1)} &rarr; {lineupImpact.afterA.toFixed(1)} pts (
            <b style={{ color: lineupImpact.afterA >= lineupImpact.beforeA ? "var(--turf)" : "var(--flag)" }}>
              {formatDelta(lineupImpact.afterA - lineupImpact.beforeA)}
            </b>
            ) &middot; Side B: {lineupImpact.beforeB.toFixed(1)} &rarr; {lineupImpact.afterB.toFixed(1)} pts (
            <b style={{ color: lineupImpact.afterB >= lineupImpact.beforeB ? "var(--turf)" : "var(--flag)" }}>
              {formatDelta(lineupImpact.afterB - lineupImpact.beforeB)}
            </b>
            )
          </div>
        )}

        {hasOffer && waiverImpact && (waiverImpact.forA.matches.length > 0 || waiverImpact.forB.matches.length > 0) && (
          <div className="callout" style={{ marginTop: 10 }}>
            <div style={{ marginBottom: 4 }}>
              <b>What&apos;s on waivers instead</b> (best free agent at each incoming player&apos;s position, right
              now):
            </div>
            {waiverImpact.forA.matches.length > 0 && (
              <div style={{ marginBottom: waiverImpact.forB.matches.length > 0 ? 6 : 0 }}>
                Side A would receive {waiverImpact.forA.incomingValue} value ({waiverImpact.forA.matches
                  .map((m) => m.incoming.name)
                  .join(", ")}) vs. <b>{waiverImpact.forA.altValue}</b> value sitting free right now (
                {waiverImpact.forA.matches.map((m) => m.alt?.name ?? "nobody at that position").join(", ")}) --
                trading gets Side A <b>{formatDelta(waiverImpact.forA.gap)}</b> more than waivers would.
              </div>
            )}
            {waiverImpact.forB.matches.length > 0 && (
              <div>
                Side B would receive {waiverImpact.forB.incomingValue} value ({waiverImpact.forB.matches
                  .map((m) => m.incoming.name)
                  .join(", ")}) vs. <b>{waiverImpact.forB.altValue}</b> value sitting free right now (
                {waiverImpact.forB.matches.map((m) => m.alt?.name ?? "nobody at that position").join(", ")}) --
                trading gets Side B <b>{formatDelta(waiverImpact.forB.gap)}</b> more than waivers would.
              </div>
            )}
          </div>
        )}

        {hasOffer && verdictA && verdictB && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <div className={`callout ${verdictA.tone === "good" ? "high" : verdictA.tone === "bad" ? "low" : ""}`}>
              <b>Side A: {verdictA.label}</b>
              {verdictA.reasons.length > 0 && <div style={{ marginTop: 4, fontSize: 13 }}>{verdictA.reasons.join("; ")}.</div>}
            </div>
            <div className={`callout ${verdictB.tone === "good" ? "high" : verdictB.tone === "bad" ? "low" : ""}`}>
              <b>Side B: {verdictB.label}</b>
              {verdictB.reasons.length > 0 && <div style={{ marginTop: 4, fontSize: 13 }}>{verdictB.reasons.join("; ")}.</div>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
