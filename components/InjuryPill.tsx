export default function InjuryPill({ status }: { status: string | null }) {
  if (!status) return null;
  const severe = status === "Out" || status === "IR" || status === "Doubtful";
  return <span className={`pill ${severe ? "flag" : "bubble"}`} style={{ marginLeft: 8 }}>{status}</span>;
}
