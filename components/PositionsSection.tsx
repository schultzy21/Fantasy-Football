import type { PositionStrength } from "@/lib/positions";

export default function PositionsSection({ positions }: { positions: PositionStrength[] }) {
  return (
    <section id="positions" className="view">
      <div className="card">
        <div className="eyebrow">Position Insights</div>
        <h2 className="sec">Best Position Groups</h2>
        <p className="lead">Starter points scored by position, season to date.</p>

        {positions.length === 0 && (
          <p className="muted">No games played yet -- this fills in once starters have scored.</p>
        )}

        {positions.length > 0 && (
          <div className="grid2">
            {positions.map((p) => (
              <div key={p.position} className="card" style={{ background: "var(--panel2)" }}>
                <div className="eyebrow">{p.position}</div>
                {p.leaderboard.slice(0, 5).map((entry, i) => (
                  <div key={entry.team.rosterId} className="matchup">
                    <div className="side">
                      {i + 1}. {entry.team.teamName}
                    </div>
                    <div className="score tnum">{entry.points.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
