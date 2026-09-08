import { NextResponse } from "next/server";
import { getNewsletterBriefContext } from "@/lib/newsletter-brief";
import { getLeagueId } from "@/lib/sleeper";

export const dynamic = "force-dynamic";

// Public, read-only, no API key required. Returns a plain-text brief of
// this week's real league data (matchups, waiver moves, lineup blunders) --
// meant to be fetched (by a human or by Claude on their behalf) and used as
// the source material for writing the newsletter by hand, then pasted into
// the "Publish this week's newsletter" form on the site.
export async function GET() {
  try {
    const { brief } = await getNewsletterBriefContext(getLeagueId());
    return new NextResponse(brief, { headers: { "content-type": "text/plain; charset=utf-8" } });
  } catch (err) {
    console.error("newsletter-brief route failed", err);
    return NextResponse.json({ error: "Something went wrong building the brief." }, { status: 500 });
  }
}
