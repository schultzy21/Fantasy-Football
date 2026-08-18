"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase, supabaseConfigured, type BanterEntry } from "@/lib/supabase";

export default function BanterSection({
  season,
  week,
  banter,
  roast,
}: {
  season: string;
  week: number;
  banter: BanterEntry[];
  roast: string | null;
}) {
  const router = useRouter();
  const [quote, setQuote] = useState("");
  const [author, setAuthor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (!quote.trim()) return;
    setSubmitting(true);
    setError(null);
    const { error } = await supabase
      .from("banter_entries")
      .insert({ season, week, quote: quote.trim(), author: author.trim() || null });
    setSubmitting(false);
    if (error) {
      setError("Couldn't save that -- try again in a moment.");
      return;
    }
    setQuote("");
    setAuthor("");
    router.refresh();
  }

  return (
    <section id="banter" className="view">
      <div className="card">
        <div className="eyebrow">League Chat, By Hand</div>
        <h2 className="sec">Banter &amp; Low-Score Roast</h2>
        <p className="lead">
          Sleeper doesn&apos;t expose league chat to the public API, so paste this week&apos;s best quotes
          here yourself. They&apos;re saved for everyone who visits the page.
        </p>

        {roast && (
          <div className="callout low" style={{ marginBottom: 14 }}>
            {roast}
          </div>
        )}

        {!supabaseConfigured && (
          <p className="muted">
            Banter saving isn&apos;t configured on this deployment (missing Supabase settings).
          </p>
        )}

        {supabaseConfigured && (
          <>
            <form onSubmit={submit} style={{ marginBottom: 16 }}>
              <textarea
                placeholder="Drop the best quote from the group chat this week..."
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                rows={3}
                maxLength={2000}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input
                  type="text"
                  placeholder="Who said it? (optional)"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn gold" disabled={submitting || !quote.trim()}>
                  {submitting ? "Saving..." : "Add Quote"}
                </button>
              </div>
              {error && (
                <p className="muted" style={{ color: "var(--flag)" }}>
                  {error}
                </p>
              )}
            </form>

            {banter.length === 0 && <p className="muted">No quotes submitted for this week yet.</p>}
            {banter.map((b) => (
              <div key={b.id} className="quote">
                <div>&ldquo;{b.quote}&rdquo;</div>
                {b.author && <div className="who">&mdash; {b.author}</div>}
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
