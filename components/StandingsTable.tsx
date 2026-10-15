import type { LuckEntry } from "@/lib/luck";
import type { PlayoffOddsEntry } from "@/lib/playoff-odds";
import type { Team } from "@/lib/standings";

const RANK_TIER = ["gold", "silver", "bronze"] as const;

function formatRecord(wins: number, losses: number, ties: number): string {
  return `${wins}-${losses}${ties ? `-${ties}` : ""}`;
}

export default function StandingsTable({
  standings,
  luckTable,
  playoffOdds,
  showOutlook,
}: {
  standings: Team[];
  luckTable?: LuckEntry[];
  playoffOdds?: PlayoffOddsEntry[];
  // Luck/all-play/playoff-odds columns only mean something once real games
  // have been played -- omitted entirely before Week 1.
  showOutlook?: boolean;
}) {
  const luckByRoster = new Map((luckTable ?? []).map((l) => [l.team.rosterId, l]));
  const oddsByRoster = new Map((playoffOdds ?? []).map((o) => [o.team.rosterId, o.pct]));

  return (
    <div style={{ overflowX: "auto" }}>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th className="num">Record</th>
            <th className="num">PF</th>
            <th className="num">PA</th>
            {showOutlook && (
              <>
                <th className="num">All-Play</th>
                <th className="num">Luck</th>
                <th className="num">Playoff Odds</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {standings.map((t, i) => {
            const luck = luckByRoster.get(t.rosterId);
            const pct = oddsByRoster.get(t.rosterId);
            const luckColor =
              luck && luck.luckWins > 0.4 ? "var(--turf)" : luck && luck.luckWins < -0.4 ? "var(--flag)" : undefined;
            return (
              <tr key={t.rosterId}>
                <td className="tnum">
                  {i < 3 ? <span className={`rank-badge ${RANK_TIER[i]}`}>{i + 1}</span> : i + 1}
                </td>
                <td>{t.teamName}</td>
                <td className="num tnum">{formatRecord(t.wins, t.losses, t.ties)}</td>
                <td className="num tnum">{t.fpts.toFixed(1)}</td>
                <td className="num tnum">{t.fptsAgainst.toFixed(1)}</td>
                {showOutlook && (
                  <>
                    <td className="num tnum muted">
                      {luck ? formatRecord(luck.allPlay.wins, luck.allPlay.losses, luck.allPlay.ties) : "-"}
                    </td>
                    <td className="num tnum" style={{ color: luckColor, fontWeight: luckColor ? 700 : undefined }}>
                      {luck ? (luck.luckWins > 0 ? `+${luck.luckWins}` : luck.luckWins) : "-"}
                    </td>
                    <td className="num tnum">{pct != null ? `${pct}%` : "-"}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
