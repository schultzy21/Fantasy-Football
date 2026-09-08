"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export default function PublishNewsletterForm({
  season,
  week,
  hasIssue,
}: {
  season: string;
  week: number;
  hasIssue: boolean;
}) {
  const router = useRouter();
  const [headline, setHeadline] = useState("");
  const [article, setArticle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(!hasIssue);

  if (!supabaseConfigured) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !article.trim()) return;
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.from("generated_content").upsert(
      {
        season,
        week,
        newsletter_headline: headline.trim(),
        newsletter_article: article.trim(),
        generated_at: new Date().toISOString(),
      },
      { onConflict: "season,week" },
    );
    setSubmitting(false);
    if (error) {
      setError("Couldn't save that -- try again in a moment.");
      return;
    }
    setHeadline("");
    setArticle("");
    setOpen(false);
    router.refresh();
  }

  return (
    <details open={open} style={{ marginTop: 14 }} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="muted" style={{ cursor: "pointer", fontSize: 13 }}>
        {hasIssue ? "Republish or fix this week's issue" : "Publish this week's issue"}
      </summary>
      <div style={{ marginTop: 10 }}>
        <p className="muted" style={{ fontSize: 13 }}>
          No Anthropic key needed for this. Ask Claude (any chat) to write this week&apos;s newsletter --
          it can fetch the real data from{" "}
          <code>
            /api/newsletter-brief
          </code>{" "}
          on this site and search the web for real NFL news -- then paste the headline and article it gives
          you below.
        </p>
        <form onSubmit={submit}>
          <input
            type="text"
            placeholder="Headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <textarea
            placeholder="Paste the full article here (separate paragraphs with a blank line)..."
            value={article}
            onChange={(e) => setArticle(e.target.value)}
            rows={10}
          />
          <div style={{ marginTop: 8 }}>
            <button type="submit" className="btn gold" disabled={submitting || !article.trim()}>
              {submitting ? "Publishing..." : "Publish"}
            </button>
          </div>
          {error && (
            <p className="muted" style={{ color: "var(--flag)" }}>
              {error}
            </p>
          )}
        </form>
      </div>
    </details>
  );
}
