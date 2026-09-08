import PublishNewsletterForm from "./PublishNewsletterForm";

export default function NewsletterSection({
  leagueName,
  season,
  week,
  headline,
  article,
  claudeConfigured,
  targetWeek,
}: {
  leagueName: string;
  season: string;
  week: number | null;
  headline: string | null;
  article: string | null;
  claudeConfigured: boolean;
  targetWeek: number;
}) {
  const paragraphs = (article ?? "").split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const hasCurrentIssue = week === targetWeek && Boolean(article);

  return (
    <section id="newsletter" className="view">
      <div className="card">
        <div className="eyebrow">The League Newsletter</div>
        <h2 className="sec">Weekly Newsletter</h2>
        <p className="lead">
          A written weekly issue -- NFL news, highlights, lowlights, waiver moves, and a few ribs at certain
          teams.
        </p>

        {!article && (
          <p className="muted">
            No issue published yet for this week. See below to publish one -- no API key required.
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

        <PublishNewsletterForm season={season} week={targetWeek} hasIssue={hasCurrentIssue} />

        {claudeConfigured && (
          <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
            This deployment also has an Anthropic key configured, so a fresh issue publishes itself
            automatically every Tuesday morning -- publishing by hand above will overwrite that week&apos;s
            auto-generated issue if you do both.
          </p>
        )}
      </div>
    </section>
  );
}
