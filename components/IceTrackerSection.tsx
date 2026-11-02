import type { TeamIceRecord } from "@/lib/ice-tracker";

export default function IceTrackerSection({
  iceTracker,
  hasSeasonStarted,
}: {
  iceTracker: TeamIceRecord[];
  hasSeasonStarted: boolean;
}) {
  const teamsWithIces = iceTracker.filter((r) => r.events.length > 0);

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

            {teamsWithIces.length > 0 && (
              <>
                <h3 style={{ margin: "22px 0 10px", fontSize: 14, color: "var(--muted)", textTransform: "uppercase" }}>
                  Full Ice Log
                </h3>
                {teamsWithIces.map((r) => (
                  <details key={r.team.rosterId} className="record-row">
                    <summary>
                      <span style={{ flex: 1 }}>{r.team.teamName}</span>
                      <span className="tnum ice-count" style={{ fontWeight: 700 }}>
                        {r.totalIces} {"\u{1F9CA}"}
                      </span>
                    </summary>
                    <div className="lineup-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Wk</th>
                            <th>Player</th>
                            <th>Pos</th>
                            <th className="num">Pts</th>
                            <th className="num">Ices</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.events.map((e, j) => (
                            <tr key={`${e.playerId}-${e.week}-${j}`}>
                              <td className="muted">{e.week}</td>
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
