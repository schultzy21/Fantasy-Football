import { NextResponse } from "next/server";
import { getNewsletterBriefContext } from "@/lib/newsletter-brief";

export const dynamic = "force-dynamic";

// Public, read-only, no API key required. Returns a plain-text brief of
// this week's real league data (matchups, waiver moves, lineup blunders) --
// meant to be fetched (by a human or by Claude on their behalf) and used as
// the source material for writing the newsletter by hand, then pasted into
// the "Publish this week's newsletter" form on the site.
export async function GET() {
  const leagueId = process.env.SLEEPER_LEAGUE_ID;
  if (!leagueId) {
    return NextResponse.json({ error: "SLEEPER_LEAGUE_ID is not set." }, { status: 500 });
  }

  try {
    const { brief } = await getNewsletterBriefContext(leagueId);
    return new NextResponse(brief, { headers: { "content-type": "text/plain; charset=utf-8" } });
  } catch (err) {
    console.error("newsletter-brief route failed", err);
    return NextResponse.json({ error: "Something went wrong building the brief." }, { status: 500 });
  }
}
