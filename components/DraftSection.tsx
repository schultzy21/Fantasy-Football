import type { SleeperDraftPick } from "@/lib/types";

export default function DraftSection({
  draftPicks,
}: {
  draftPicks: (SleeperDraftPick & { playerName: string })[];
}) {
  return (
    <section id="draft" className="view" data-yard="OPP 10">
      <div className="card">
        <div className="eyebrow">Draft Results</div>
        <h2 className="sec">The Draft</h2>

        {draftPicks.length === 0 && (
          <p className="lead">The draft hasn&apos;t happened yet. Picks will show up here once it does.</p>
        )}

        {draftPicks.length > 0 && (
          <table>
            <thead>
              <tr>
                <th className="num">Pick</th>
                <th className="num">Rd</th>
                <th>Player</th>
                <th>Pos</th>
              </tr>
            </thead>
            <tbody>
              {draftPicks.map((p) => (
                <tr key={p.pick_no}>
                  <td className="num tnum">{p.pick_no}</td>
                  <td className="num tnum">{p.round}</td>
                  <td>{p.playerName}</td>
                  <td className="muted">{p.metadata?.position ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
