export default function NewsletterSection({
  leagueName,
  season,
  week,
  headline,
  article,
  claudeConfigured,
}: {
  leagueName: string;
  season: string;
  week: number;
  headline: string | null;
  article: string | null;
  claudeConfigured: boolean;
}) {
  const paragraphs = (article ?? "").split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  return (
    <section id="newsletter" className="view">
      <div className="card">
        <div className="eyebrow">The League Newsletter</div>
        <h2 className="sec">Weekly Newsletter</h2>
        <p className="lead">A written weekly issue -- highlights, lowlights, and a few ribs at certain teams.</p>

        {!article && (
          <p className="muted">
            {claudeConfigured
              ? "No issue generated yet -- use the \"Generate This Week's Write-Up\" button on the Overview tab."
              : "This section needs a real written article, so there's no numeric fallback here. Add an Anthropic API key (see the README) to generate it automatically, or copy the brief from the Overview tab into Claude yourself with a prompt like \"write this as a classic newspaper sports article.\""}
          </p>
        )}

        {article && (
          <div className="newspaper">
            <div className="masthead">
              <div className="paper-name">{leagueName} Gazette</div>
              <div className="dateline">
                {season} Season &middot; Week {week} Edition
              </div>
            </div>
            {headline && <div className="headline">{headline}</div>}
            <div className="byline">By The League Wire</div>
            <div className="article-body">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <div className="sign-off">-- 30 --</div>
          </div>
        )}
      </div>
    </section>
  );
}
