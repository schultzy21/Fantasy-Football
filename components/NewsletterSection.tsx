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
  week: number | null;
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
        <p className="lead">
          A written weekly issue -- NFL news, highlights, lowlights, waiver moves, and a few ribs at certain
          teams. Publishes automatically every Tuesday morning once that week&apos;s Monday Night Football
          game has wrapped -- nothing to do here.
        </p>

        {!article && (
          <p className="muted">
            {claudeConfigured
              ? "No issue published yet. The first one lands after this league's first full week of games, next Tuesday morning."
              : "This deployment doesn't have an ANTHROPIC_API_KEY configured, so the newsletter can't be written automatically -- see the README to add one."}
          </p>
        )}

        {article && (
          <div className="newspaper">
            <div className="masthead">
              <div className="paper-name">{leagueName} Gazette</div>
              <div className="dateline">
                {season} Season {week != null ? `· Week ${week} Edition` : "· Preseason Edition"}
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
