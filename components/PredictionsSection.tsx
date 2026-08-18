import type { PredictionsOutlook } from "@/lib/predictions";

export default function PredictionsSection({
  predictions,
  narrative,
}: {
  predictions: PredictionsOutlook;
  narrative: string | null;
}) {
  return (
    <section id="predictions" className="view">
      <div className="card">
        <div className="eyebrow">Refreshed Every Week</div>
        <h2 className="sec">Predictions Outlook</h2>

        {!predictions.hasEnoughData && (
          <p className="lead">Not enough games have been played yet to project the season.</p>
        )}

        {predictions.hasEnoughData && (
          <>
            {narrative && <p className="lead">{narrative}</p>}

            <div className="grid2">
              <div>
                <div className="eyebrow" style={{ marginTop: 8 }}>
                  Playoff Picture
                </div>
                {predictions.inTheHunt.map((p) => (
                  <div key={p.team.rosterId} className="matchup">
                    <span className="side">{p.team.teamName}</span>
                    <span className="pill in">In</span>
                  </div>
                ))}
                {predictions.bubbleWatch.map((p) => (
                  <div key={p.team.rosterId} className="matchup">
                    <span className="side">{p.team.teamName}</span>
                    <span className="pill bubble">Bubble</span>
                  </div>
                ))}
                {predictions.onTheOutside.map((p) => (
                  <div key={p.team.rosterId} className="matchup">
                    <span className="side">{p.team.teamName}</span>
                    <span className="pill out">Out</span>
                  </div>
                ))}
              </div>

              <div>
                <div className="eyebrow" style={{ marginTop: 8 }}>
                  Storylines
                </div>
                {predictions.favorite && (
                  <p style={{ fontSize: 14 }}>
                    <b>Favorite to win it all:</b> {predictions.favorite.team.teamName}
                  </p>
                )}
                {predictions.darkhorses.length > 0 && (
                  <p style={{ fontSize: 14 }}>
                    <b>Darkhorses:</b> {predictions.darkhorses.map((d) => d.team.teamName).join(", ")}
                  </p>
                )}
                {predictions.lastPlacePace && (
                  <p style={{ fontSize: 14 }}>
                    <b>Pacing for last place:</b> {predictions.lastPlacePace.team.teamName}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
