import BriefBox from "@/components/BriefBox";
import DraftSection from "@/components/DraftSection";
import GenerateButton from "@/components/GenerateButton";
import HistorySection from "@/components/HistorySection";
import NewsletterSection from "@/components/NewsletterSection";
import PositionsSection from "@/components/PositionsSection";
import PowerRankingsSection from "@/components/PowerRankingsSection";
import PredictionsSection from "@/components/PredictionsSection";
import StandingsTable from "@/components/StandingsTable";
import WeeklyRecapSection from "@/components/WeeklyRecapSection";
import { claudeConfigured } from "@/lib/claude";
import { getLeagueData } from "@/lib/league-data";
import { supabase, type GeneratedContentRow } from "@/lib/supabase";

export const revalidate = 300;

async function getGeneratedContent(season: string, week: number): Promise<GeneratedContentRow | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("generated_content")
    .select("*")
    .eq("season", season)
    .eq("week", week)
    .maybeSingle();
  return (data as GeneratedContentRow) ?? null;
}

// The newsletter publishes on its own weekly (Tuesday) schedule, which can
// land on a different week number than the "current" one shown everywhere
// else on the page (e.g. Sleeper's current week already ticked forward by
// the time Tuesday's cron runs) -- so it's looked up independently as
// "whichever issue was published most recently," not tied to the current week.
async function getLatestNewsletter(
  season: string,
): Promise<{ week: number; headline: string | null; article: string | null } | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("generated_content")
    .select("week, newsletter_headline, newsletter_article")
    .eq("season", season)
    .not("newsletter_article", "is", null)
    .order("week", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { week: data.week, headline: data.newsletter_headline, article: data.newsletter_article };
}

export default async function Home() {
  const leagueId = process.env.SLEEPER_LEAGUE_ID ?? "1389331489925132288";
  const data = await getLeagueData(leagueId);
  const generated = await getGeneratedContent(data.season, data.state.week);
  const newsletter = await getLatestNewsletter(data.season);

  const seasonTypeLabel =
    data.state.season_type === "pre" ? "Preseason" : data.state.season_type === "post" ? "Postseason" : "Regular Season";

  return (
    <div className="wrap">
      <div className="top">
        <div className="brand">
          <h1>{data.leagueName}</h1>
          <div className="sub">Sleeper League Hub &middot; {data.season} Season</div>
        </div>
        <div className="weekpill">
          {seasonTypeLabel} &middot; Week <b>{data.state.week}</b>
        </div>
      </div>

      <nav className="tabs">
        <a href="#overview">Overview</a>
        <a href="#history">History</a>
        <a href="#recap">Weekly Recap</a>
        <a href="#power">Power Rankings</a>
        <a href="#positions">Positions</a>
        <a href="#predictions">Predictions</a>
        <a href="#draft">Draft</a>
        <a href="#newsletter">Newsletter</a>
      </nav>

      <section id="overview" className="view">
        <div className="card">
          <div className="eyebrow">League Setup</div>
          <h2 className="sec">Standings</h2>
          {data.isPreDraft && (
            <p className="lead">
              This league hasn&apos;t drafted yet for {data.season}, so there are no games to report on.
              Once the draft happens and Week 1 kicks off, the recap, power rankings, position insights, and
              predictions sections below will fill in automatically.
            </p>
          )}
          <StandingsTable standings={data.standings} />
        </div>

        <div className="card">
          <div className="eyebrow">Write-Up</div>
          <h2 className="sec">This Week&apos;s Numbers</h2>
          {claudeConfigured() ? (
            <GenerateButton hasGenerated={Boolean(generated)} />
          ) : (
            <BriefBox brief={data.brief} />
          )}
          {generated?.generated_at && (
            <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
              Last generated {new Date(generated.generated_at).toLocaleString()}
            </p>
          )}
        </div>
      </section>

      <HistorySection seasons={data.history.seasons} records={data.history.records} />

      <WeeklyRecapSection recap={data.recap} narrative={generated?.weekly_recap ?? null} />

      <PowerRankingsSection
        rankings={data.powerRankings}
        blurbs={generated?.power_ranking_blurbs ?? null}
        isProjected={data.rankingsAreProjected}
        history={data.rankingsHistory}
      />

      <PositionsSection
        positions={data.positions}
        isProjected={data.rankingsAreProjected}
        blurbs={generated?.position_group_blurbs ?? null}
      />

      <PredictionsSection
        predictions={data.predictions}
        narrative={generated?.predictions_outlook ?? null}
        isProjected={data.rankingsAreProjected}
      />

      <DraftSection draftPicks={data.draftPicks} />

      <NewsletterSection
        leagueName={data.leagueName}
        season={data.season}
        week={newsletter?.week ?? null}
        headline={newsletter?.headline ?? null}
        article={newsletter?.article ?? null}
        claudeConfigured={claudeConfigured()}
        targetWeek={data.recap?.week ?? data.state.week}
      />

      <footer className="foot">
        Data from the public Sleeper API. Refreshes automatically every few minutes.
      </footer>
    </div>
  );
}
