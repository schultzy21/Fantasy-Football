import type { RosterInjuryEntry } from "@/lib/injuries";

export default function InjuriesSection({ entries }: { entries: RosterInjuryEntry[] }) {
  const hasAny = entries.some((e) => e.count > 0);

  return (
    <section id="injuries" className="view" data-yard="OPP 35">
      <div className="card">
        <div className="eyebrow">Season-Long</div>
        <h2 className="sec">Injury Report</h2>
        <p className="lead">
          Games missed to injury (Out or IR) while rostered on that team, by owner. Click a name for the full list.
          Weeks 1-4 are approximated from Sleeper&apos;s historical data (marked <i>approx.</i> below); Week 5
          onward is tracked directly as it happens.
        </p>

        {!hasAny && <p className="muted">No tracked injuries yet.</p>}

        {hasAny && (
          <table>
            <thead>
              <tr>
                <th>Team</th>
                <th className="num">Games Missed</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.team.rosterId}>
                  <td colSpan={2} style={{ padding: 0 }}>
                    <details>
                      <summary
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          padding: "10px 0",
                          listStyle: "none",
                        }}
                      >
                        <span>{entry.team.teamName}</span>
                        <span className="num tnum">{entry.count}</span>
                      </summary>

                      {entry.events.length > 0 && (
                        <table style={{ margin: "0 0 10px" }}>
                          <thead>
                            <tr>
                              <th>Week</th>
                              <th>Player</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entry.events.map((e, i) => (
                              <tr key={i}>
                                <td className="muted">{e.week}</td>
                                <td>{e.playerName}</td>
                                <td className="muted">
                                  {e.status}
                                  {!e.confirmed && <i> (approx.)</i>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
