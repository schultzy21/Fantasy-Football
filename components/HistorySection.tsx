import { manualHistory } from "@/lib/manual-history";
import type { LeagueRecords, SeasonSummary } from "@/lib/history";
import type { ScoreRecordEntry } from "@/lib/score-records";

function ScoreRecordList({ entries, highest }: { entries: ScoreRecordEntry[]; highest: boolean }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginTop: 8 }}>
        {highest ? "Highest Scores Ever" : "Lowest Scores Ever"}
      </div>
      {entries.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Not enough played weeks yet.</p>}
      {entries.map((entry, i) => (
        <details key={`${entry.season}-${entry.week}-${entry.teamName}-${i}`} className="record-row">
          <summary>
            <span className="badge">{i + 1}</span>
            <span style={{ flex: 1 }}>
              {entry.teamName}
              <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                {entry.season} Wk {entry.week}
              </span>
            </span>
            <span className="tnum" style={{ fontWeight: 700 }}>
              {entry.points.toFixed(1)}
            </span>
          </summary>
          {entry.lineup.length > 0 && (
            <div className="lineup-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Player</th>
                    <th className="num">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.lineup.map((slot, j) => (
                    <tr key={`${slot.playerId}-${j}`}>
                      <td className="muted">{slot.position}</td>
                      <td>{slot.playerName}</td>
                      <td className="num tnum">{slot.points.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </details>
      ))}
    </div>
  );
}

export default function HistorySection({
  seasons,
  records,
  scoreRecords,
}: {
  seasons: SeasonSummary[];
  records: LeagueRecords;
  scoreRecords: { highest: ScoreRecordEntry[]; lowest: ScoreRecordEntry[] };
}) {
  return (
    <section id="history" className="view" data-yard="OWN 40">
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

      {(scoreRecords.highest.length > 0 || scoreRecords.lowest.length > 0) && (
        <div className="card">
          <div className="eyebrow">Scoreboard Extremes</div>
          <h2 className="sec">Highest &amp; Lowest Scores Ever</h2>
          <p className="lead">
            Every regular-season score, plus playoff-week scores from teams that actually made that season&apos;s
            playoff bracket -- eliminated teams&apos; playoff-week scores are left out since most leagues stop
            setting lineups once they&apos;re out. Tap a row for the full lineup.
          </p>
          <div className="grid2">
            <ScoreRecordList entries={scoreRecords.highest} highest />
            <ScoreRecordList entries={scoreRecords.lowest} highest={false} />
          </div>
        </div>
      )}
    </section>
  );
}
