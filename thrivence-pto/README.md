# Thrivence PTO Dashboard

A shared calendar for the Thrivence Consulting team so everyone can see who's
out of office, and add their own upcoming time off. It shows the next three
months by default, lets people enter time off up to a year in advance, and
has a password-protected summary for leadership to track PTO taken vs.
remaining for the year.

This doc assumes zero coding background. Follow it top to bottom once, then
just use the "day to day" notes at the bottom.

## How it's built (plain language)

Same pattern as the Fantasy Football site in this repo -- three free services
work together:

- **GitHub** -- holds the code (already set up, you're looking at it). This
  app lives in its own folder, `thrivence-pto/`, inside the same repo as the
  fantasy football site so everything stays in one place.
- **Vercel** -- runs the website and gives you a public URL. Every time new
  code is pushed to GitHub, Vercel automatically rebuilds and updates the
  live site.
- **Supabase** -- a small database that stores every PTO entry people add,
  so it's saved for everyone who visits (instead of disappearing when the
  page is closed).

Nothing runs on your own computer once it's deployed.

---

## One-time setup

### 1. Create a Supabase project (or reuse one)

You can use a brand-new free Supabase project, or a separate one from the
fantasy football site -- either works, just keep the PTO data separate from
anything else.

1. Go to https://supabase.com/dashboard and create a new project (or open an
   existing one you want to use for this).
2. In the left sidebar, click **SQL Editor** -> **New query**.
3. Open the file `supabase/schema.sql` in this folder, copy all of it, paste
   it into the SQL editor, and click **Run**.

That creates one table, `pto_entries`, which stores everyone's out-of-office
dates. You only do this once.

### 2. Connect this folder to Vercel as its own project

Because this app lives in a subfolder (`thrivence-pto/`) of the fantasy
football repo, you'll point Vercel at that subfolder specifically -- it
becomes its own separate website with its own URL, unrelated to the fantasy
football site.

1. Go to https://vercel.com and sign in with your GitHub account (same
   account that owns this repo).
2. Click **Add New...** -> **Project**.
3. Choose the `schultzy21/fantasy-football` repository and click **Import**.
4. Before deploying, click **Edit** next to "Root Directory" and set it to
   `thrivence-pto`. Vercel will then auto-detect Next.js inside that folder.
5. Open **Environment Variables** and add these:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | *(from Supabase -> Project Settings -> API)* |
   | `SUPABASE_ANON_KEY` | *(from Supabase -> Project Settings -> API)* |
   | `PTO_SUMMARY_PASSWORD` | `Thrivence` (or whatever you'd like the leadership password to be) |

6. Click **Deploy**. After a minute or two you'll get a live URL like
   `thrivence-pto-yourname.vercel.app`. That's the link to share with the
   team.

From now on, any change pushed to the `thrivence-pto/` folder on GitHub
rebuilds this site automatically within a minute or two.

> **Note on "secured":** the calendar itself has no login -- it's meant to
> be visible to the whole team, like a shared whiteboard. The one thing that
> is protected is the **Leadership Summary** page, which checks a password
> on the server before showing anything (the password is never sent to the
> browser as code, only entered and checked). This is a reasonable amount of
> protection for an internal team tool, not bank-grade security -- treat the
> password the same way you'd treat a shared office door code, and change it
> in Vercel's Environment Variables any time you want a new one.

---

## Running it on your own computer (optional)

```bash
git clone https://github.com/schultzy21/fantasy-football.git
cd fantasy-football/thrivence-pto
npm install
cp .env.example .env.local
```

Open `.env.local` and fill in the same values from the table above. Then:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Day to day

**Nothing is required for the calendar to work.** Anyone on the team can
open the site and add their own time off using the form under the calendar
-- it appears instantly for everyone.

### Adding or removing team members

Open `lib/employees.ts` in this folder. Each person is one line:

```ts
{ name: "Jane Smith", annualDays: 15 },
```

Add a new line to add someone, delete a line to remove someone (this
doesn't delete PTO they already entered -- it just stops them appearing as
an option for new entries), or change `annualDays` to adjust someone's
yearly PTO allotment. Push the change to GitHub and Vercel redeploys it
automatically.

There's no in-app editor for this list yet by design -- it's a short,
infrequently-changed list that's simpler to keep as code for now. If this
ever needs to change often enough that it's worth a front-end editor (an
"admin" page to add/remove people without touching code), that's a
straightforward follow-on -- just ask.

### Changing the leadership password

In Vercel: **Settings** -> **Environment Variables** -> edit
`PTO_SUMMARY_PASSWORD` -> redeploy. No code changes needed.

### Correcting or removing a PTO entry someone added by mistake

There's no delete button in the app on purpose (keeps things simple and
prevents accidental mass-deletion). To fix a typo'd entry: go to your
Supabase project -> **Table Editor** -> `pto_entries`, find the row, and
edit or delete it there directly.

---

## What's in this folder

```
app/                   Pages: the main calendar (/) and leadership summary (/leadership)
app/api/entries/       API route: list + add PTO entries
app/api/summary/       API route: password-checked PTO summary for leadership
components/            UI pieces (header, calendar grid, add-time-off form, etc.)
lib/employees.ts       The team roster -- edit this to add/remove people
lib/                    Date helpers and the Supabase client
supabase/schema.sql     Run this once in the Supabase SQL editor (see step 1 above)
.env.example            Template for the environment variables (copy to .env.local)
```

## Troubleshooting

- **"Supabase isn't connected yet" banner**: the two Supabase environment
  variables are missing from Vercel (or `.env.local` if running locally) --
  see step 2 / local setup above.
- **Leadership page says "Incorrect password"**: double check
  `PTO_SUMMARY_PASSWORD` in Vercel matches what you're typing (it's
  case-sensitive).
- **New team member doesn't show up in the dropdown**: make sure you pushed
  the change to `lib/employees.ts` to GitHub and Vercel finished redeploying
  (check the Deployments tab in Vercel).
