import type { LiveOddsMatchup, LiveOddsSide } from "@/lib/live-odds";

function formatMoneyline(ml: number): string {
  return ml > 0 ? `+${ml}` : `${ml}`;
}

function Side({ side, isFavorite }: { side: LiveOddsSide; isFavorite: boolean }) {
  return (
    <div className="side" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ color: isFavorite ? "var(--gold)" : undefined, fontWeight: isFavorite ? 700 : 400 }}>
        {isFavorite ? "★ " : ""}
        {side.team.teamName}
      </span>
      <span className="muted tnum" style={{ fontSize: 12 }}>
        {Math.round(side.winProb * 100)}% &middot; {formatMoneyline(side.moneyline)}
      </span>
      <span className="muted" style={{ fontSize: 11 }}>
        +{side.remainingProjected.toFixed(1)} proj. remaining
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
          Win odds from current score + remaining weekly projections for each starting lineup -- updates as scores
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
                <Side side={m.teamA} isFavorite={m.teamA.winProb >= m.teamB.winProb} />
                <div className="score tnum">
                  {m.teamA.actualPoints.toFixed(1)} &ndash; {m.teamB.actualPoints.toFixed(1)}
                </div>
                <Side side={m.teamB} isFavorite={m.teamB.winProb > m.teamA.winProb} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
