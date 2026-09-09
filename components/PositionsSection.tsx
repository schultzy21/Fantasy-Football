import type { PositionStrength } from "@/lib/positions";

export default function PositionsSection({
  positions,
  isProjected,
  blurbs,
}: {
  positions: PositionStrength[];
  isProjected: boolean;
  blurbs: Record<string, string> | null;
}) {
  return (
    <section id="positions" className="view" data-yard="OPP 30">
      <div className="card">
        <div className="eyebrow">{isProjected ? "Preseason Projection" : "Position Insights"}</div>
        <h2 className="sec">Best Position Groups</h2>
        <p className="lead">
          {isProjected
            ? "No games played yet -- ranked by this league's real draft order (earlier picks = stronger group), the closest thing to ADP we have. Switches to real starter points automatically once games are played."
            : "Starter points scored by position, season to date."}
        </p>

        {positions.length === 0 && (
          <p className="muted">No games played yet -- this fills in once starters have scored.</p>
        )}

        {positions.length > 0 && (
          <div className="grid2">
            {positions.map((p) => (
              <div key={p.position} className="card" style={{ background: "var(--panel2)" }}>
                <div className="eyebrow">{p.position}</div>
                {blurbs?.[p.position] && (
                  <p className="muted" style={{ fontSize: 13, marginTop: -4, marginBottom: 10 }}>
                    {blurbs[p.position]}
                  </p>
                )}
                {p.leaderboard.slice(0, 5).map((entry, i) => (
                  <div key={entry.team.rosterId} className="matchup" style={{ alignItems: "flex-start" }}>
                    <div className="side">
                      <div>
                        {i + 1}. {entry.team.teamName}
                      </div>
                      {entry.basedOnPicks && entry.basedOnPicks.length > 0 && (
                        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                          {entry.basedOnPicks.map((pk) => `${pk.playerName} (Pick ${pk.pickNo})`).join(", ")}
                        </div>
                      )}
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
