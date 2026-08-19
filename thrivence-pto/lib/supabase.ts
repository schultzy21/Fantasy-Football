import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// These are read server-side only (this app never talks to Supabase
// directly from the browser -- everything goes through the API routes),
// so plain names work fine here and don't need the NEXT_PUBLIC_ prefix.
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

// Names only (never values) of whichever required variables the running
// deployment doesn't actually have set -- useful for confirming from the
// live site itself which one is missing, without exposing secrets.
export function getMissingSupabaseEnvVars(): string[] {
  const missing: string[] = [];
  if (!process.env.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!process.env.SUPABASE_ANON_KEY) missing.push("SUPABASE_ANON_KEY");
  return missing;
}

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY."
    );
  }
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
  }
  return client;
}
