import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Both values are safe to expose to the browser -- they're the public
// "anon" key, not a secret. Row Level Security policies (see
// supabase/schema.sql) control what it's actually allowed to do.
export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = supabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;

export type GeneratedContentRow = {
  season: string;
  week: number;
  weekly_recap: string | null;
  power_ranking_blurbs: Record<string, string> | null;
  predictions_outlook: string | null;
  position_group_blurbs: Record<string, string> | null;
  newsletter_headline: string | null;
  newsletter_article: string | null;
  generated_at: string;
};
