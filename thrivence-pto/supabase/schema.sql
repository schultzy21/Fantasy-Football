-- Run this once in Supabase: Project -> SQL Editor -> New query -> paste -> Run.
-- It creates the one table the site needs: everyone's out-of-office dates.

create table if not exists pto_entries (
  id bigint generated always as identity primary key,
  employee_name text not null,
  start_date date not null,
  end_date date not null,
  note text,
  created_at timestamptz not null default now(),
  constraint end_after_start check (end_date >= start_date)
);

create index if not exists pto_entries_date_range_idx
  on pto_entries (start_date, end_date);

alter table pto_entries enable row level security;

-- This is an internal team tool with no login screen for the calendar
-- itself (the leadership summary page is the only thing password-gated,
-- and that check happens on the server). Anyone who can reach the site can
-- read and add entries -- that's the point, it's meant to be visible to the
-- whole team. Nobody can edit or delete through the public key -- only you,
-- from the Supabase dashboard, can, if a correction is ever needed.
create policy "Public can read pto entries" on pto_entries
  for select using (true);

create policy "Public can add pto entries" on pto_entries
  for insert with check (
    char_length(employee_name) > 0
    and char_length(coalesce(note, '')) <= 500
    and end_date >= start_date
  );
