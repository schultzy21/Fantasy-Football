import type { LuckEntry } from "@/lib/luck";
import type { PlayoffOddsEntry } from "@/lib/playoff-odds";
import type { Team } from "@/lib/standings";

function formatRecord(wins: number, losses: number, ties: number): string {
  return `${wins}-${losses}${ties ? `-${ties}` : ""}`;
}

export default function LuckAndOddsSection({
  standings,
  luckTable,
  playoffOdds,
  hasSeasonStarted,
}: {
  standings: Team[];
  luckTable: LuckEntry[];
  playoffOdds: PlayoffOddsEntry[];
  hasSeasonStarted: boolean;
}) {
  const luckByRoster = new Map(luckTable.map((l) => [l.team.rosterId, l]));
  const oddsByRoster = new Map(playoffOdds.map((o) => [o.team.rosterId, o.pct]));

  return (
    <section id="luck" className="view" data-yard="OWN 35">
      <div className="card">
        <div className="eyebrow">Season Outlook</div>
        <h2 className="sec">Luck &amp; Playoff Odds</h2>
        <p className="lead">
          <b>All-play:</b> each team&apos;s score measured against every other team&apos;s score in every week
          played, not just their actual opponent -- the record scoring alone would predict. <b>Luck:</b> the gap
          between a team&apos;s real record and that all-play record, in wins -- positive means the schedule has
          been kind. <b>Playoff odds:</b> a 3,000-trial simulation of the rest of the regular season, drawing each
          team&apos;s remaining scores from its own scoring distribution so far.
        </p>

        {!hasSeasonStarted && <p className="lead">Not enough games have been played yet.</p>}

        {hasSeasonStarted && (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Team</th>
                  <th className="num">Record</th>
                  <th className="num">All-Play</th>
                  <th className="num">Luck</th>
                  <th className="num">Playoff Odds</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((team) => {
                  const luck = luckByRoster.get(team.rosterId);
                  const pct = oddsByRoster.get(team.rosterId);
                  const luckColor =
                    luck && luck.luckWins > 0.4 ? "var(--turf)" : luck && luck.luckWins < -0.4 ? "var(--flag)" : undefined;
                  return (
                    <tr key={team.rosterId}>
                      <td>{team.teamName}</td>
                      <td className="num tnum">{formatRecord(team.wins, team.losses, team.ties)}</td>
                      <td className="num tnum muted">
                        {luck ? formatRecord(luck.allPlay.wins, luck.allPlay.losses, luck.allPlay.ties) : "-"}
                      </td>
                      <td className="num tnum" style={{ color: luckColor, fontWeight: luckColor ? 700 : undefined }}>
                        {luck ? (luck.luckWins > 0 ? `+${luck.luckWins}` : luck.luckWins) : "-"}
                      </td>
                      <td className="num tnum">{pct != null ? `${pct}%` : "-"}</td>
                    </tr>
                  );
                })}
                {standings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted">
                      No teams yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
