import type { Team } from "@/lib/standings";

export default function StandingsTable({ standings }: { standings: Team[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Team</th>
          <th className="num">Record</th>
          <th className="num">PF</th>
          <th className="num">PA</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((t, i) => (
          <tr key={t.rosterId}>
            <td className="tnum">{i + 1}</td>
            <td>
              <div>{t.teamName}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {t.ownerName}
              </div>
            </td>
            <td className="num tnum">
              {t.wins}-{t.losses}
              {t.ties ? `-${t.ties}` : ""}
            </td>
            <td className="num tnum">{t.fpts.toFixed(1)}</td>
            <td className="num tnum">{t.fptsAgainst.toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
