import { buildWeeklyIceLog, type TeamIceRecord } from "@/lib/ice-tracker";

export default function IceTrackerSection({
  iceTracker,
  hasSeasonStarted,
}: {
  iceTracker: TeamIceRecord[];
  hasSeasonStarted: boolean;
}) {
  const weeklyLog = buildWeeklyIceLog(iceTracker);

  return (
    <section id="ice-tracker" className="view" data-yard="OWN 15">
      <div className="card">
        <div className="eyebrow">House Rule</div>
        <h2 className="sec">{"\u{1F9CA}"} The Ice Tracker</h2>
        <p className="lead">
          One Smirnoff Ice for every starter who scores exactly <b>0</b> points in a week. <b>Two</b> ices if they
          go negative -- a defense that gives up a pick-six, a kicker who gets blocked, the works. Tallied across
          every played week this season. The freezer never forgets.
        </p>

        {!hasSeasonStarted && <p className="lead">Nobody&apos;s on the board yet -- the season hasn&apos;t started.</p>}

        {hasSeasonStarted && (
          <>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Team</th>
                    <th className="num">Ices</th>
                  </tr>
                </thead>
                <tbody>
                  {iceTracker.map((r, i) => (
                    <tr key={r.team.rosterId}>
                      <td className="tnum">
                        {i === 0 && r.totalIces > 0 ? <span className="pill ice">Frostiest</span> : i + 1}
                      </td>
                      <td>{r.team.teamName}</td>
                      <td className="num tnum ice-count">
                        <b>{r.totalIces}</b> {r.totalIces > 0 ? "\u{1F9CA}" : ""}
                      </td>
                    </tr>
                  ))}
                  {iceTracker.length === 0 && (
                    <tr>
                      <td colSpan={3} className="muted">
                        No teams yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {weeklyLog.size > 0 && (
              <>
                <h3 style={{ margin: "22px 0 10px", fontSize: 14, color: "var(--muted)", textTransform: "uppercase" }}>
                  Weekly Ice Log
                </h3>
                {[...weeklyLog.entries()].map(([week, entries]) => (
                  <details key={week} className="record-row">
                    <summary>
                      <span style={{ flex: 1 }}>Week {week}</span>
                      <span className="tnum ice-count" style={{ fontWeight: 700 }}>
                        {entries.length} {entries.length === 1 ? "player" : "players"} iced
                      </span>
                    </summary>
                    <div className="lineup-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Team</th>
                            <th>Player</th>
                            <th>Pos</th>
                            <th className="num">Pts</th>
                            <th className="num">Ices</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map((e, j) => (
                            <tr key={`${e.teamName}-${e.playerName}-${j}`}>
                              <td className="muted">{e.teamName}</td>
                              <td>{e.playerName}</td>
                              <td className="muted">{e.position}</td>
                              <td className="num tnum">{e.points.toFixed(1)}</td>
                              <td className="num tnum">{"\u{1F9CA}".repeat(e.ices)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
