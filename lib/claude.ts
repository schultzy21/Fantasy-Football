import Anthropic from "@anthropic-ai/sdk";

// Model per the league owner's request: current Claude Sonnet.
// https://docs.claude.com/en/docs/about-claude/models
const MODEL = "claude-sonnet-5";

export type GeneratedWriteups = {
  weeklyRecap: string;
  powerRankingBlurbs: Record<string, string>; // key = rosterId as string
  predictionsOutlook: string;
  newsletterHeadline: string;
  newsletterArticle: string;
};

export function claudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// `briefText` is the same plain-text brief shown to the user when no API
// key is configured -- Claude gets exactly what a human pasting it in by
// hand would get, so behavior stays consistent either way.
export async function generateWriteups(briefText: string): Promise<GeneratedWriteups | null> {
  if (!claudeConfigured()) return null;

  const client = new Anthropic();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system:
      "You write the weekly league newspaper for a fantasy football league. " +
      "Tone: punchy, funny, a little roasty, but never mean-spirited about anything outside the game. " +
      "You are given a plain-text data brief with real stats -- never invent stats, records, or scores " +
      "that aren't in the brief. If the brief says rankings/predictions are PROJECTED (preseason, based on " +
      "draft capital, not real games), make that clear in your writing -- don't write about a game or score " +
      "that hasn't happened. Respond with ONLY a single JSON object, no markdown fences, no commentary, " +
      'matching this shape: {"weeklyRecap": string, "powerRankingBlurbs": {"<rosterId>": string, ...}, ' +
      '"predictionsOutlook": string, "newsletterHeadline": string, "newsletterArticle": string}. ' +
      "weeklyRecap: 2-4 sentence recap of the most recent completed week, or a short note that the season " +
      "hasn't started if there's no week to recap yet. " +
      "powerRankingBlurbs: one punchy sentence per team, keyed by the roster ID given in the brief. " +
      "predictionsOutlook: a short paragraph covering the playoff picture, bubble teams, the title favorite, " +
      "darkhorses, and who's pacing for last -- or a short note that it's too early if there's not enough data. " +
      "newsletterHeadline: a short, punchy tabloid-style headline (under 60 characters) for this week's issue. " +
      "newsletterArticle: a full weekly newspaper article in classic sports-page style, 4-7 short paragraphs, " +
      "plain text with a blank line between paragraphs (no markdown). Cover: a lede on the week's biggest " +
      "story, player highlights and lowlights (use real player/team names from the brief when available), " +
      "a few good-natured ribs aimed at specific teams by name, and close with a line teasing next week. " +
      "If there's no real week to report on yet (preseason), write it as a draft-day/offseason preview issue " +
      "instead -- draft grades, way-too-early bold predictions, teams to watch -- clearly framed as preseason.",
    messages: [{ role: "user", content: briefText }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return null;

  try {
    const parsed = JSON.parse(textBlock.text);
    return {
      weeklyRecap: String(parsed.weeklyRecap ?? ""),
      powerRankingBlurbs: parsed.powerRankingBlurbs ?? {},
      predictionsOutlook: String(parsed.predictionsOutlook ?? ""),
      newsletterHeadline: String(parsed.newsletterHeadline ?? ""),
      newsletterArticle: String(parsed.newsletterArticle ?? ""),
    };
  } catch {
    return null;
  }
}
