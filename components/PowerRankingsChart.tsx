"use client";

import { useMemo, useState } from "react";
import type { RankingsHistoryPoint } from "@/lib/rankings-history";

type TeamRef = { rosterId: number; teamName: string };

// Extended qualitative set for up to ~12 lines. Past 8 series no categorical
// palette can guarantee full colorblind-safe separation between every pair,
// so identity here doesn't rely on color alone -- every line ends in a
// direct team-name label, which is the accessible fallback.
const LINE_COLORS = [
  "#2ee4ff", // cyan
  "#ff3d5e", // flag red
  "#ffd23f", // gold
  "#2fe08a", // turf green
  "#b967ff", // arcade purple
  "#ff8c1a", // orange
  "#ff5fd2", // hot pink
  "#baff29", // lime
  "#4d7aff", // electric blue
  "#ffea00", // bright yellow
  "#ff6b6b", // coral
  "#7fffd4", // aquamarine
];

const WIDTH = 900;
const HEIGHT = 420;
const PAD_LEFT = 34;
const PAD_RIGHT = 132;
const PAD_TOP = 20;
const PAD_BOTTOM = 34;

export default function PowerRankingsChart({
  history,
  teams,
}: {
  history: RankingsHistoryPoint[];
  teams: TeamRef[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const highlighted = active ?? pinned;

  const plot = useMemo(() => {
    if (history.length === 0 || teams.length === 0) return null;

    const n = teams.length;
    const innerW = WIDTH - PAD_LEFT - PAD_RIGHT;
    const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;

    const xFor = (i: number) => (history.length === 1 ? PAD_LEFT + innerW / 2 : PAD_LEFT + (i / (history.length - 1)) * innerW);
    const yFor = (rank: number) => (n === 1 ? PAD_TOP + innerH / 2 : PAD_TOP + ((rank - 1) / (n - 1)) * innerH);

    const colorByRoster = new Map(teams.map((t, i) => [t.rosterId, LINE_COLORS[i % LINE_COLORS.length]]));

    const lines = teams.map((t) => {
      const pts = history
        .map((h, i) => {
          const rank = h.ranksByRoster.get(t.rosterId);
          return rank == null ? null : { x: xFor(i), y: yFor(rank), rank };
        })
        .filter((p): p is { x: number; y: number; rank: number } => p !== null);
      return { team: t, color: colorByRoster.get(t.rosterId)!, pts };
    });

    // Direct end-labels, spaced apart so they don't overlap when teams tie.
    const minGap = 15;
    const endLabels = lines
      .filter((l) => l.pts.length > 0)
      .map((l) => ({ team: l.team, color: l.color, y: l.pts[l.pts.length - 1].y }))
      .sort((a, b) => a.y - b.y);
    for (let i = 1; i < endLabels.length; i++) {
      if (endLabels[i].y - endLabels[i - 1].y < minGap) {
        endLabels[i].y = endLabels[i - 1].y + minGap;
      }
    }

    return { lines, endLabels, xFor, yFor, innerW, innerH, n };
  }, [history, teams]);

  if (!plot) return <p className="muted">Not enough data yet to chart a trend.</p>;

  const weekTicks = history.map((h) => h.label);

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ width: "100%", minWidth: 560, height: "auto" }} role="img" aria-label="Power ranking by week for each team">
          {/* y gridlines + rank labels */}
          {Array.from({ length: plot.n }, (_, i) => i + 1).map((rank) => (
            <g key={rank}>
              <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={plot.yFor(rank)} y2={plot.yFor(rank)} stroke="var(--line)" strokeWidth={1} />
              <text x={PAD_LEFT - 10} y={plot.yFor(rank) + 4} textAnchor="end" fontSize={13} fill="var(--muted)">
                {rank}
              </text>
            </g>
          ))}
          {/* x labels */}
          {weekTicks.map((label, i) => (
            <text key={label + i} x={plot.xFor(i)} y={HEIGHT - PAD_BOTTOM + 20} textAnchor="middle" fontSize={13} fill="var(--muted)">
              {label}
            </text>
          ))}

          {/* lines */}
          {plot.lines.map((l) => {
            const isDim = highlighted != null && highlighted !== l.team.rosterId;
            const isOn = highlighted === l.team.rosterId;
            const d = l.pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
            return (
              <g key={l.team.rosterId}>
                <path
                  d={d}
                  fill="none"
                  stroke={l.color}
                  strokeWidth={isOn ? 3.5 : 2}
                  opacity={isDim ? 0.18 : 1}
                  style={{ cursor: "pointer", transition: "opacity 120ms, stroke-width 120ms" }}
                  onMouseEnter={() => setActive(l.team.rosterId)}
                  onMouseLeave={() => setActive(null)}
                  onClick={() => setPinned((p) => (p === l.team.rosterId ? null : l.team.rosterId))}
                />
                {l.pts.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={isOn ? 4 : 2.5}
                    fill={l.color}
                    opacity={isDim ? 0.18 : 1}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setActive(l.team.rosterId)}
                    onMouseLeave={() => setActive(null)}
                  >
                    <title>
                      {l.team.teamName}: rank {p.rank} ({weekTicks[i]})
                    </title>
                  </circle>
                ))}
              </g>
            );
          })}

          {/* direct end labels */}
          {plot.endLabels.map((el) => {
            const isDim = highlighted != null && highlighted !== el.team.rosterId;
            return (
              <text
                key={el.team.rosterId}
                x={WIDTH - PAD_RIGHT + 10}
                y={el.y + 4}
                fontSize={13}
                fontWeight={highlighted === el.team.rosterId ? 800 : 600}
                fill={isDim ? "var(--muted)" : "var(--chalk)"}
                opacity={isDim ? 0.5 : 1}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setActive(el.team.rosterId)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setPinned((p) => (p === el.team.rosterId ? null : el.team.rosterId))}
              >
                {el.team.teamName}
              </text>
            );
          })}
        </svg>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
        {teams.map((t, i) => {
          const color = LINE_COLORS[i % LINE_COLORS.length];
          const isOn = highlighted === t.rosterId;
          return (
            <button
              key={t.rosterId}
              className="btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                fontSize: 12,
                borderColor: isOn ? color : undefined,
              }}
              onMouseEnter={() => setActive(t.rosterId)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setPinned((p) => (p === t.rosterId ? null : t.rosterId))}
            >
              <span style={{ width: 10, height: 10, borderRadius: 99, background: color, display: "inline-block" }} />
              {t.teamName}
            </button>
          );
        })}
      </div>

      <details style={{ marginTop: 14 }}>
        <summary className="muted" style={{ cursor: "pointer", fontSize: 13 }}>
          View as table
        </summary>
        <div style={{ overflowX: "auto", marginTop: 10 }}>
          <table>
            <thead>
              <tr>
                <th>Team</th>
                {weekTicks.map((label) => (
                  <th key={label} className="num">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.rosterId}>
                  <td>{t.teamName}</td>
                  {history.map((h, i) => (
                    <td key={i} className="num tnum">
                      {h.ranksByRoster.get(t.rosterId) ?? "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
