"use client";

import { useState } from "react";

export default function BriefBox({ brief }: { brief: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable -- the textarea is still selectable by hand.
    }
  }

  return (
    <div>
      <p className="lead">
        No Anthropic API key is configured, so here&apos;s a clean text brief of this week&apos;s numbers.
        Copy it and paste it into Claude (or any chatbot) with a prompt like &ldquo;write this week&apos;s
        fantasy football recap, power rankings blurbs, and predictions from this data&rdquo; to get the
        writeups yourself.
      </p>
      <pre className="brief">{brief}</pre>
      <button className="btn" onClick={copy} style={{ marginTop: 10 }}>
        {copied ? "Copied!" : "Copy Brief"}
      </button>
    </div>
  );
}
