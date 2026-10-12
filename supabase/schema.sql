-- Run this in Supabase: Project -> SQL Editor -> New query -> paste -> Run.
-- Safe to re-run even if you ran an earlier version of this script -- it
-- only adds what's missing and won't touch existing rows.

create table if not exists generated_content (
  season text not null,
  week integer not null,
  weekly_recap text,
  power_ranking_blurbs jsonb,
  predictions_outlook text,
  generated_at timestamptz not null default now(),
  primary key (season, week)
);

-- Adds the newsletter and position-group-blurb columns (no-op if you
-- already have them).
alter table generated_content add column if not exists newsletter_headline text;
alter table generated_content add column if not exists newsletter_article text;
alter table generated_content add column if not exists position_group_blurbs jsonb;

-- The smack-talk/banter box was removed (Sleeper's API has no way to read
-- league chat), so its column and table are no longer used. Safe to drop:
alter table generated_content drop column if exists banter_roast;
drop table if exists banter_entries;

alter table generated_content enable row level security;

drop policy if exists "Public can read generated content" on generated_content;
create policy "Public can read generated content" on generated_content
  for select using (true);

drop policy if exists "Public can write generated content" on generated_content;
create policy "Public can write generated content" on generated_content
  for insert with check (true);

drop policy if exists "Public can update generated content" on generated_content;
create policy "Public can update generated content" on generated_content
  for update using (true) with check (true);

-- Injury tracking: a daily cron (see app/api/cron/injuries) snapshots every
-- currently-rostered player who's Out/IR, once per player per week (the
-- unique constraint below lets a later run upgrade that week's status, e.g.
-- Out -> IR, without creating a second row). Weeks before this feature
-- existed aren't stored here at all -- those are instead computed live from
-- Sleeper's own historical data (see lib/injury-backfill.ts), so there's
-- nothing to backfill by hand.
create table if not exists injury_events (
  id bigserial primary key,
  season text not null,
  week integer not null,
  player_id text not null,
  player_name text not null,
  roster_id integer not null,
  status text not null,
  recorded_at timestamptz not null default now(),
  unique (season, week, player_id, roster_id)
);

alter table injury_events enable row level security;

drop policy if exists "Public can read injury events" on injury_events;
create policy "Public can read injury events" on injury_events
  for select using (true);

drop policy if exists "Public can write injury events" on injury_events;
create policy "Public can write injury events" on injury_events
  for insert with check (true);

drop policy if exists "Public can update injury events" on injury_events;
create policy "Public can update injury events" on injury_events
  for update using (true) with check (true);
