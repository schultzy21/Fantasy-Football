"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function GenerateButton({ hasGenerated }: { hasGenerated: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error -- try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <button className="btn gold" onClick={generate} disabled={loading}>
        {loading ? "Writing..." : hasGenerated ? "Regenerate This Week's Write-Up" : "Generate This Week's Write-Up"}
      </button>
      {error && (
        <span className="muted" style={{ color: "var(--flag)" }}>
          {error}
        </span>
      )}
    </div>
  );
}
