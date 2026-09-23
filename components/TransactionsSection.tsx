import type { TeamTransactionSummary, TransactionMove } from "@/lib/transactions";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function moveList(moves: TransactionMove[]): string {
  if (moves.length === 0) return "none";
  return moves
    .map((m) => (m.otherTeamName ? `${m.playerName} (from ${m.otherTeamName})` : m.playerName))
    .join(", ");
}

const TYPE_LABEL: Record<string, string> = {
  trade: "Trade",
  waiver: "Waiver",
  free_agent: "Free Agent",
};

export default function TransactionsSection({ summaries }: { summaries: TeamTransactionSummary[] }) {
  const byCount = [...summaries].sort((a, b) => b.count - a.count || a.team.teamName.localeCompare(b.team.teamName));
  const hasAny = summaries.some((s) => s.count > 0);

  return (
    <section id="transactions" className="view" data-yard="OPP 5">
      <div className="card">
        <div className="eyebrow">Roster Moves</div>
        <h2 className="sec">Transactions</h2>

        {!hasAny && <p className="lead">No transactions yet this season.</p>}

        {hasAny && (
          <>
            <table>
              <thead>
                <tr>
                  <th>Team</th>
                  <th className="num">Moves</th>
                </tr>
              </thead>
              <tbody>
                {byCount.map((s) => (
                  <tr key={s.team.rosterId}>
                    <td>{s.team.teamName}</td>
                    <td className="num tnum">{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 style={{ margin: "20px 0 10px", fontSize: 14, color: "var(--muted)", textTransform: "uppercase" }}>
              Most Recent Move
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Added</th>
                  <th>Dropped</th>
                </tr>
              </thead>
              <tbody>
                {byCount
                  .filter((s) => s.mostRecent)
                  .map((s) => (
                    <tr key={s.team.rosterId}>
                      <td>{s.team.teamName}</td>
                      <td className="muted">{formatDate(s.mostRecent!.date)}</td>
                      <td className="muted">{TYPE_LABEL[s.mostRecent!.type] ?? s.mostRecent!.type}</td>
                      <td>{moveList(s.mostRecent!.added)}</td>
                      <td>{moveList(s.mostRecent!.dropped)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </section>
  );
}
