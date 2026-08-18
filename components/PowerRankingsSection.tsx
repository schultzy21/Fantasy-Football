import type { PowerRank } from "@/lib/power-rankings";

export default function PowerRankingsSection({
  rankings,
  blurbs,
}: {
  rankings: PowerRank[];
  blurbs: Record<string, string> | null;
}) {
  return (
    <section id="power" className="view">
      <div className="card">
        <div className="eyebrow">Weekly Power Rankings</div>
        <h2 className="sec">Power Rankings</h2>
        <p className="lead">
          Blended 50% record, 35% season points, 15% recent form -- not record alone.
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
    </section>
  );
}
