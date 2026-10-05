"use client";

import { useMemo, useState } from "react";
import InjuryPill from "./InjuryPill";
import type { DraftPickInsight } from "@/lib/draft-insights";
import type { SleeperDraftPick } from "@/lib/types";

type TeamRef = { rosterId: number; teamName: string };
type Pick = SleeperDraftPick & { playerName: string; injuryStatus: string | null };

export default function DraftSection({
  draftPicks,
  draftInsights,
  teams,
}: {
  draftPicks: Pick[];
  draftInsights: Record<string, DraftPickInsight>;
  teams: TeamRef[];
}) {
  const rounds = useMemo(
    () => Array.from(new Set(draftPicks.map((p) => p.round))).sort((a, b) => a - b),
    [draftPicks],
  );
  const [round, setRound] = useState<number | "ALL">(rounds[0] ?? "ALL");

  const nameByRoster = useMemo(() => new Map(teams.map((t) => [t.rosterId, t.teamName])), [teams]);

  const visible = round === "ALL" ? draftPicks : draftPicks.filter((p) => p.round === round);

  return (
    <section id="draft" className="view" data-yard="OPP 10">
      <div className="card">
        <div className="eyebrow">Draft Results</div>
        <h2 className="sec">The Draft</h2>

        {draftPicks.length === 0 && (
          <p className="lead">The draft hasn&apos;t happened yet. Picks will show up here once it does.</p>
        )}

        {draftPicks.length > 0 && (
          <>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {rounds.map((r) => (
                <button
                  key={r}
                  className="btn"
                  style={{ padding: "7px 10px", fontSize: 10, borderColor: round === r ? "var(--cyan)" : undefined }}
                  onClick={() => setRound(r)}
                >
                  Rd {r}
                </button>
              ))}
              <button
                className="btn"
                style={{ padding: "7px 10px", fontSize: 10, borderColor: round === "ALL" ? "var(--cyan)" : undefined }}
                onClick={() => setRound("ALL")}
              >
                ALL
              </button>
            </div>

            <table>
              <thead>
                <tr>
                  <th className="num">Pick</th>
                  <th className="num">Rd</th>
                  <th>Player</th>
                  <th>Pos</th>
                  <th>Team</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => {
                  const insight = draftInsights[p.player_id];
                  const draftedByRosterId = p.roster_id;
                  const currentRosterId = insight?.currentRosterId ?? null;
                  const hasNewOwner = currentRosterId !== null && currentRosterId !== draftedByRosterId;
                  const isFreeAgent = insight && currentRosterId === null;
                  const stillOnDraftTeam = !insight || currentRosterId === draftedByRosterId;

                  return (
                    <tr key={p.pick_no}>
                      <td className="num tnum">{p.pick_no}</td>
                      <td className="num tnum">{p.round}</td>
                      <td>
                        {p.playerName}
                        <InjuryPill status={p.injuryStatus} />
                        {insight?.droppedByDrafter && (
                          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                            Dropped by {nameByRoster.get(draftedByRosterId) ?? "original team"} -- drafted #
                            {insight.draftRank} overall, now projects #{insight.currentRank ?? "?"} in this draft
                            class rest-of-season.
                          </div>
                        )}
                        {hasNewOwner && (
                          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                            Now on {nameByRoster.get(currentRosterId!) ?? "a different team"}
                          </div>
                        )}
                        {isFreeAgent && !insight?.droppedByDrafter && (
                          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                            Free agent
                          </div>
                        )}
                      </td>
                      <td className="muted">{p.metadata?.position ?? ""}</td>
                      <td className={stillOnDraftTeam ? "muted" : "muted strike"}>
                        {nameByRoster.get(draftedByRosterId) ?? "Unknown"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </section>
  );
}
