import type { WeeklyRecap } from "@/lib/recap";

export default function WeeklyRecapSection({
  recap,
  narrative,
}: {
  recap: WeeklyRecap | null;
  narrative: string | null;
}) {
  return (
    <section id="recap" className="view">
      <div className="card">
        <div className="eyebrow">{recap ? `Week ${recap.week} Recap` : "Weekly Recap"}</div>
        <h2 className="sec">Weekly Recap</h2>

        {!recap && (
          <p className="lead">
            This section fills in once a full week of games has been played. Check the League Setup and
            Draft Results sections below in the meantime.
          </p>
        )}

        {recap && (
          <>
            {narrative && <p className="lead">{narrative}</p>}
            <div>
              {recap.matchups.map((m) => (
                <div key={m.matchupId} className="matchup">
                  <div className={`side ${m.winner === m.teamA.team ? "win" : m.winner ? "lose" : ""}`}>
                    {m.teamA.team.teamName}
                  </div>
                  <div className="score tnum">
                    {m.teamA.points.toFixed(1)} &ndash; {m.teamB.points.toFixed(1)}
                  </div>
                  <div
                    className={`side ${m.winner === m.teamB.team ? "win" : m.winner ? "lose" : ""}`}
                    style={{ textAlign: "right" }}
                  >
                    {m.teamB.team.teamName}
                  </div>
                </div>
              ))}
            </div>

            {recap.highScorer && (
              <div className="callout high">
                <b>Top score:</b> {recap.highScorer.team.teamName} put up {recap.highScorer.points.toFixed(1)}.
              </div>
            )}
            {recap.lowScorer && (
              <div className="callout low">
                <b>Lowest score of the week:</b> {recap.lowScorer.team.teamName} limped in at{" "}
                {recap.lowScorer.points.toFixed(1)}.
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
