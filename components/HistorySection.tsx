import { manualHistory } from "@/lib/manual-history";
import type { LeagueRecords, SeasonSummary } from "@/lib/history";

export default function HistorySection({
  seasons,
  records,
}: {
  seasons: SeasonSummary[];
  records: LeagueRecords;
}) {
  return (
    <section id="history" className="view">
      <div className="card">
        <div className="eyebrow">League History</div>
        <h2 className="sec">Past Champions &amp; Records</h2>

        {seasons.length === 0 && manualHistory.length === 0 && (
          <p className="lead">
            History starts this season -- Sleeper has no prior league linked. If you want to note past
            champions from before this league existed on Sleeper, add them by editing{" "}
            <code>lib/manual-history.ts</code> (see the README).
          </p>
        )}

        {seasons.length === 0 && manualHistory.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Season</th>
                <th>Champion</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {manualHistory.map((h) => (
                <tr key={h.season}>
                  <td>{h.season}</td>
                  <td>{h.champion}</td>
                  <td className="muted">{h.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {seasons.length > 0 && (
          <>
            {records.highestSingleWeekScore && (
              <div className="callout high" style={{ marginBottom: 14 }}>
                <b>All-time single week high:</b> {records.highestSingleWeekScore.teamName} scored{" "}
                {records.highestSingleWeekScore.points.toFixed(1)} in Week {records.highestSingleWeekScore.week}
                {" "}({records.highestSingleWeekScore.season}).
              </div>
            )}
            {seasons.map((s) => (
              <div key={s.leagueId} className="card" style={{ background: "var(--panel2)", marginBottom: 12 }}>
                <div className="eyebrow">{s.season} Season</div>
                <p style={{ margin: "0 0 10px" }}>
                  <b>Champion:</b> {s.champion ?? "Unknown"}
                  {s.runnerUp ? ` -- runner-up: ${s.runnerUp}` : ""}
                </p>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Team</th>
                      <th className="num">Record</th>
                      <th className="num">PF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.standings.map((t, i) => (
                      <tr key={t.teamName + i}>
                        <td>{i + 1}</td>
                        <td>{t.teamName}</td>
                        <td className="num tnum">
                          {t.wins}-{t.losses}
                          {t.ties ? `-${t.ties}` : ""}
                        </td>
                        <td className="num tnum">{t.fpts.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
