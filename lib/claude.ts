import Anthropic from "@anthropic-ai/sdk";

// Model per the league owner's request: current Claude Sonnet.
// https://docs.claude.com/en/docs/about-claude/models
const MODEL = "claude-sonnet-5";

export type GeneratedWriteups = {
  weeklyRecap: string;
  powerRankingBlurbs: Record<string, string>; // key = rosterId as string
  predictionsOutlook: string;
  positionGroupBlurbs: Record<string, string>; // key = position (QB/RB/WR/...)
};

export type GeneratedNewsletter = {
  headline: string;
  article: string;
};

export function claudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Takes the LAST text block, not the first -- when tools are in play (e.g.
// web search), Claude may emit intermediate text between tool calls, and the
// final answer is always the last text block before the turn ends.
function lastTextBlock(content: Anthropic.ContentBlock[]): string | null {
  for (let i = content.length - 1; i >= 0; i--) {
    const block = content[i];
    if (block.type === "text") return block.text;
  }
  return null;
}

// `briefText` is the same plain-text brief shown to the user when no API
// key is configured -- Claude gets exactly what a human pasting it in by
// hand would get, so behavior stays consistent either way. Covers the
// numeric/blurb content only -- the newsletter is generated separately (see
// generateNewsletter) on its own weekly schedule.
export async function generateWriteups(briefText: string): Promise<GeneratedWriteups | null> {
  if (!claudeConfigured()) return null;

  const client = new Anthropic();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system:
      "You write short weekly content for a fantasy football league site. " +
      "Tone: punchy, funny, a little roasty, but never mean-spirited about anything outside the game. " +
      "You are given a plain-text data brief with real stats -- never invent stats, records, or scores " +
      "that aren't in the brief. If the brief says rankings/predictions are PROJECTED (preseason, based on " +
      "draft capital, not real games), make that clear in your writing, and briefly explain the basis " +
      "(e.g. 'built on early picks at RB') so readers understand how the projection was made -- don't write " +
      "about a game or score that hasn't happened. Respond with ONLY a single JSON object, no markdown " +
      'fences, no commentary, matching this shape: {"weeklyRecap": string, "powerRankingBlurbs": ' +
      '{"<rosterId>": string, ...}, "predictionsOutlook": string, "positionGroupBlurbs": {"<position>": string, ...}}. ' +
      "weeklyRecap: 2-4 sentence recap of the most recent completed week, or a short note that the season " +
      "hasn't started if there's no week to recap yet. " +
      "powerRankingBlurbs: one punchy sentence per team, keyed by the roster ID given in the brief. " +
      "predictionsOutlook: a short paragraph covering the playoff picture, bubble teams, the title favorite, " +
      "darkhorses, and who's pacing for last -- or a short note that it's too early if there's not enough data. " +
      "positionGroupBlurbs: one sentence per tracked position (QB/RB/WR/TE/K/DEF) naming the leading team and " +
      "briefly explaining why, based on the brief's data.",
    messages: [{ role: "user", content: briefText }],
  });

  const text = lastTextBlock(response.content);
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    return {
      weeklyRecap: String(parsed.weeklyRecap ?? ""),
      powerRankingBlurbs: parsed.powerRankingBlurbs ?? {},
      predictionsOutlook: String(parsed.predictionsOutlook ?? ""),
      positionGroupBlurbs: parsed.positionGroupBlurbs ?? {},
    };
  } catch {
    return null;
  }
}

// The weekly newsletter: a full written article informed by this league's
// data (matchups, waiver moves, lineup blunders) plus real current NFL news
// pulled in via Claude's web search tool. This runs on its own schedule
// (see app/api/cron/newsletter), not from a button click.
export async function generateNewsletter(newsletterBrief: string): Promise<GeneratedNewsletter | null> {
  if (!claudeConfigured()) return null;

  const client = new Anthropic();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 6000,
    output_config: { effort: "high" },
    tools: [
      {
        type: "web_search_20260209",
        name: "web_search",
        max_uses: 6,
      },
    ],
    system:
      "You write the weekly newspaper-style newsletter for a fantasy football league. Tone: witty, classic " +
      "sports-page voice, a little roasty, never mean-spirited about anything outside the game. " +
      "You are given a plain-text data brief with this league's real matchup results, waiver moves, and " +
      "lineup decisions -- never invent stats, scores, or transactions that aren't in the brief. Use your " +
      "web search tool to find real, current NFL news (injuries, breakout performances, roster moves) " +
      "relevant to players named in the brief, so the article can reference the real NFL context around " +
      "this week's fantasy performances -- search for real players/storylines only, don't fabricate news. " +
      "If the brief says no games have been played yet (preseason), write it as a draft-day/offseason " +
      "preview issue instead -- draft grades, way-too-early bold predictions, teams to watch, real current " +
      "NFL offseason/training-camp storylines pulled from search -- clearly framed as preseason. " +
      "Respond with ONLY a single JSON object as your final message, no markdown fences, no commentary, " +
      'matching this shape: {"headline": string, "article": string}. ' +
      "headline: a short, punchy tabloid-style headline (under 60 characters). " +
      "article: the full article, plain text, 5-8 short paragraphs separated by a blank line (no markdown). " +
      "Cover: a lede on the week's biggest story, player highlights and lowlights (real player/team names), " +
      "notable waiver pickups/drops and how they turned out, any egregious bench-over-starter blunders, " +
      "relevant real NFL news from your search woven in naturally, a few good-natured ribs aimed at specific " +
      "teams by name, and a closing line teasing next week.",
    messages: [{ role: "user", content: newsletterBrief }],
  });

  const text = lastTextBlock(response.content);
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    return {
      headline: String(parsed.headline ?? ""),
      article: String(parsed.article ?? ""),
    };
  } catch {
    return null;
  }
}
