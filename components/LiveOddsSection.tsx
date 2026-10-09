import type { LiveOddsMatchup, LiveOddsSide } from "@/lib/live-odds";

function formatMoneyline(ml: number): string {
  return ml > 0 ? `+${ml}` : `${ml}`;
}

function Side({ side, isFavorite, align }: { side: LiveOddsSide; isFavorite: boolean; align: "left" | "right" }) {
  return (
    <div className="side" style={{ display: "flex", flexDirection: "column", gap: 4, textAlign: align }}>
      <span style={{ fontSize: 13, color: isFavorite ? "var(--gold)" : "var(--chalk)", fontWeight: isFavorite ? 700 : 400 }}>
        {side.team.teamName}
      </span>
      <span
        className="tnum"
        style={{
          fontSize: 30,
          fontWeight: 800,
          fontFamily: "var(--font-display), monospace",
          color: isFavorite ? "var(--gold)" : "var(--chalk)",
          lineHeight: 1,
        }}
      >
        {formatMoneyline(side.moneyline)}
      </span>
    </div>
  );
}

export default function LiveOddsSection({ week, odds }: { week: number; odds: LiveOddsMatchup[] | null }) {
  const isOpen = odds != null && odds.length > 0;

  return (
    <section id="live-odds" className="view" data-yard="OWN 30">
      <div className="card">
        <div className="eyebrow">{isOpen ? `Week ${week} · In Progress` : "Live Lines"}</div>
        <h2 className="sec">Live Lines</h2>
        <p className="lead">
          Moneyline from current score + remaining weekly projections for each starting lineup -- updates as scores
          and projections change, and closes once every game this week is final. For bragging rights only, not a
          real sportsbook.
        </p>

        {!isOpen && (
          <p className="muted">
            No open lines right now -- they open once this week&apos;s matchups are set and close once every game
            is final.
          </p>
        )}

        {isOpen && (
          <div>
            {odds!.map((m) => (
              <div key={m.matchupId} className="matchup">
                <Side side={m.teamA} isFavorite={m.teamA.winProb >= m.teamB.winProb} align="left" />
                <div style={{ textAlign: "center" }}>
                  <div className="score tnum">
                    {m.teamA.actualPoints.toFixed(1)} &ndash; {m.teamB.actualPoints.toFixed(1)}
                  </div>
                  <div className="muted tnum" style={{ fontSize: 11, marginTop: 4 }}>
                    proj {m.teamA.projectedFinal.toFixed(1)} &ndash; {m.teamB.projectedFinal.toFixed(1)}
                  </div>
                </div>
                <Side side={m.teamB} isFavorite={m.teamB.winProb > m.teamA.winProb} align="right" />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
