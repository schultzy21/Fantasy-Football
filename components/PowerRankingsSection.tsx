import PowerRankingsChart from "./PowerRankingsChart";
import type { PowerRank } from "@/lib/power-rankings";
import type { RankingsHistoryPoint } from "@/lib/rankings-history";

export default function PowerRankingsSection({
  rankings,
  blurbs,
  isProjected,
  history,
}: {
  rankings: PowerRank[];
  blurbs: Record<string, string> | null;
  isProjected: boolean;
  history: RankingsHistoryPoint[];
}) {
  return (
    <section id="power" className="view" data-yard="OPP 40">
      <div className="card">
        <div className="eyebrow">{isProjected ? "Preseason Projection" : "Weekly Power Rankings"}</div>
        <h2 className="sec">Power Rankings</h2>
        <p className="lead">
          {isProjected
            ? "No games played yet -- ranked by draft capital (average pick value) as a stand-in until real results roll in."
            : "Blended 50% record, 35% season points, 15% recent form -- not record alone."}
        </p>
        <div>
          {rankings.map((pr) => (
            <div key={pr.team.rosterId} className="matchup">
              <div className="side" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span className="badge">{pr.rank}</span>
                <div>
                  <div style={{ fontWeight: 700 }}>{pr.team.teamName}</div>
                  {blurbs?.[String(pr.team.rosterId)] && (
                    <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                      {blurbs[String(pr.team.rosterId)]}
                    </div>
                  )}
                </div>
              </div>
              <div className="score tnum">{pr.score.toFixed(1)}</div>
            </div>
          ))}
          {rankings.length === 0 && <p className="muted">No teams yet.</p>}
        </div>
      </div>

      <div className="card">
        <div className="eyebrow">Season Trend</div>
        <h2 className="sec">Ranking Movement</h2>
        <p className="lead">Where each team has sat in the power rankings, week by week.</p>
        <PowerRankingsChart history={history} teams={rankings.map((r) => r.team)} />
      </div>
    </section>
  );
}
