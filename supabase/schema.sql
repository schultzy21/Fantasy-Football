-- Run this once in Supabase: Project -> SQL Editor -> New query -> paste -> Run.
-- It creates the one table the site needs: saved banter quotes, so what
-- you type in persists for everyone who visits the page.

create table if not exists banter_entries (
  id bigint generated always as identity primary key,
  season text not null,
  week integer not null,
  quote text not null,
  author text,
  created_at timestamptz not null default now()
);

alter table banter_entries enable row level security;

-- Anyone with the public site can read banter (it's meant to be shown on
-- the page) and add a new quote (the paste box). Nobody can edit or delete
-- through the public key -- only you, from the Supabase dashboard, can.
create policy "Public can read banter" on banter_entries
  for select using (true);

create policy "Public can add banter" on banter_entries
  for insert with check (
    char_length(quote) > 0 and char_length(quote) <= 2000
  );

-- Caches the Claude-written write-up for a given week so everyone who
-- visits the page sees the same text, and it's only generated once (when
-- someone clicks "Generate this week's write-up") instead of on every
-- page load.
create table if not exists generated_content (
  season text not null,
  week integer not null,
  weekly_recap text,
  power_ranking_blurbs jsonb,
  predictions_outlook text,
  banter_roast text,
  generated_at timestamptz not null default now(),
  primary key (season, week)
);

alter table generated_content enable row level security;

create policy "Public can read generated content" on generated_content
  for select using (true);

create policy "Public can write generated content" on generated_content
  for insert with check (true);

create policy "Public can update generated content" on generated_content
  for update using (true) with check (true);
