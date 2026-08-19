# Baruka Ta Adenine League Hub

A single website that is the home page for your Sleeper fantasy football league. It
reads live data from Sleeper every time someone visits, and shows standings, power
rankings (with a week-by-week trend chart), position group insights, a predictions
outlook, league history, draft results, and a weekly written newsletter. Before the
season starts, power rankings, predictions, and position groups all run on a
projection built from this league's real draft order instead of sitting empty, and
switch over to real stats automatically once games are played.

This doc assumes zero coding background. Follow it top to bottom once, then just use
the two short "every week" steps at the bottom.

## How it's built (plain language)

Three free services work together:

- **GitHub** -- holds the code (already set up, you're looking at it).
- **Vercel** -- runs the website and gives you a public URL. Every time new code is
  pushed to GitHub, Vercel automatically rebuilds and updates the live site. This is
  what makes it "auto-update."
- **Supabase** -- a small database that caches the AI-written weekly content (recap,
  power ranking blurbs, predictions, position group notes, newsletter) so it's
  generated once and everyone sees the same version, instead of regenerating on
  every visit.

Nothing runs on your own computer once it's deployed. The site fetches fresh data
from Sleeper's public API on its own, on a timer (every 5 minutes) -- you don't
have to "run an update." The newsletter is fully automatic too: Vercel runs a
scheduled job every Tuesday morning (after that week's Monday Night Football game
has finished) that writes and publishes it -- nobody has to click anything.

---

## One-time setup

### 1. Create the database table in Supabase

You already created a Supabase project. Now it needs one table:

1. Go to your project at https://supabase.com/dashboard/project/drkqedzlrowgrhesxcvk
2. In the left sidebar, click **SQL Editor** -> **New query**.
3. Open the file `supabase/schema.sql` in this repo, copy all of it, paste it into
   the SQL editor, and click **Run**.

That creates a `generated_content` table -- a cache for the AI write-ups. The
script is safe to re-run any time (e.g. after this update) if you already ran an
earlier version of it.

### 2. Connect the repo to Vercel

1. Go to https://vercel.com and sign in with your GitHub account (same account that
   owns this repo).
2. Click **Add New...** -> **Project**.
3. Choose the `schultzy21/fantasy-football` repository and click **Import**.
4. Vercel will ask for a few settings -- the defaults are correct (it auto-detects
   Next.js). Before clicking Deploy, open **Environment Variables** and add these:

   | Name | Value |
   |---|---|
   | `SLEEPER_LEAGUE_ID` | `1389331489925132288` |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://drkqedzlrowgrhesxcvk.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_YrDuAzWwTIYjSY69fgBC5g_7uGq5Cgx` |
   | `ANTHROPIC_API_KEY` | *(leave blank for now -- see the optional section below)* |
   | `CRON_SECRET` | *(optional -- leave blank, or any random string; see below)* |

5. Click **Deploy**. After a minute or two you'll get a live URL like
   `fantasy-football-yourname.vercel.app`. That's the link to share with your league.

From now on, every time this code changes on GitHub, Vercel rebuilds the site
automatically within a minute or two. You never have to manually redeploy.

> **Note on "secured":** this site has no login and no passwords -- it's a public
> read-only page, like any other website you'd share with friends. The only two
> credentials involved (the Supabase key and, if you add one, the Anthropic key) are
> kept server-side/as environment variables, never shown to visitors. If you'd
> rather it not be indexed by search engines or guessable, keep the Vercel-generated
> URL private and only share it with your league -- Vercel doesn't publish it
> anywhere on its own.

---

## Running it on your own computer (optional)

You don't need to do this to use the site -- it's only useful if you want to see
changes before they go live, or if you want to hand this repo to me for more changes
later.

```bash
git clone https://github.com/schultzy21/fantasy-football.git
cd fantasy-football
npm install
cp .env.example .env.local
```

Open `.env.local` in any text editor and fill in the same four values from the table
above. Then:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Every week

**Nothing is required.** The page re-checks Sleeper for fresh data automatically
(about every 5 minutes) whenever someone loads it. Standings, recaps, power
rankings, the trend chart, position groups, and predictions update themselves once
games are played.

The **newsletter publishes itself automatically** every Tuesday morning (once
`ANTHROPIC_API_KEY` is set) -- nothing to click, nothing to paste. It covers that
week's matchups, waiver moves, lineup blunders, and real current NFL news pulled in
via a live web search, all woven into one written article. It only ever generates
once per week (it checks first, so re-running the schedule doesn't waste API calls
or overwrite that week's issue).

One optional thing you might still do each week:

### Generate the numbers write-up (only if you added an Anthropic key)

If you've added an `ANTHROPIC_API_KEY`, you'll see a **Generate This Week's
Write-Up** button near the top of the page. Click it (after that week's games
finish, ideally) and it writes the recap, power ranking blurbs, position group
notes, and predictions outlook in one shot -- this is separate from the newsletter,
which you never need to trigger by hand. It's saved so every visitor sees the same
version -- click **Regenerate** if you want a fresh take.

If you never add a key, you'll instead see a **Copy Brief** button with a clean
text summary of the week's numbers -- paste that into Claude.ai yourself with a
prompt like "write this week's recap and power rankings from this data" to get the
same kind of write-up by hand (the newsletter itself won't be available without a
key, since it needs live web search).

---

## Adding an Anthropic API key later

This turns on the automatic AI write-ups (weekly recap narrative, power ranking
blurbs, position group notes, predictions outlook) and the automatic weekly
newsletter.

1. Go to https://console.anthropic.com, sign in, and create an API key (Settings ->
   API Keys -> Create Key).
2. In Vercel: open your project -> **Settings** -> **Environment Variables**.
3. Set `ANTHROPIC_API_KEY` to the key you just created, for all environments.
4. Vercel will ask you to redeploy for the change to take effect -- click
   **Redeploy** (or just push any small change to GitHub).

The site uses Claude Sonnet 5 (`claude-sonnet-5`). The numbers write-up is one
short request (well under a cent). The newsletter also uses a live web search for
NFL news, so it costs a bit more -- still small (a few cents), and it only runs
once a week automatically, so there's no way to run it up by accident.

### Optional: lock down the newsletter's schedule endpoint

Vercel's cron scheduler calls a URL on your site once a week to trigger the
newsletter. By default anyone who found that exact URL could also call it (which
would just cost you a few cents, not a security risk -- but easy to close off):

1. Generate any random string (e.g. run `openssl rand -hex 24` in a terminal, or
   just mash the keyboard).
2. Set it as `CRON_SECRET` in Vercel's Environment Variables.
3. That's it -- Vercel automatically sends this value to your scheduled endpoint,
   and the endpoint checks it. No other setup needed.

---

## How preseason projections work

Before any games are played, there's no performance data to rank teams on. Once
the draft finishes (but before Week 1 kicks off), the site instead ranks teams by
**average draft pick value** -- earlier picks count for more, using this league's
own real draft order as the closest thing to ADP available. That same score
powers three sections while real data doesn't exist yet:

- **Power Rankings** -- teams ranked by overall draft capital.
- **Best Position Groups** -- teams ranked by draft capital *within* each position
  (e.g. whose two RB picks were earliest), with the actual picks it's based on
  shown right under each team's name so you can see exactly why.
- **Predictions Outlook** -- the power ranking score is used to simulate the real
  schedule (an Elo-style win probability per matchup) into a projected playoff
  picture, favorite, darkhorses, and who's pacing for last.

All three are clearly labeled "Preseason Projection" while this is active, and
switch over to real results automatically once Week 1 finishes -- no action
needed. It's a fun guess, not a forecast -- treat it that way.

## Adding past champions by hand

Your league's Sleeper history already goes back to 2024 automatically (via Sleeper's
`previous_league_id` chain), so the History section fills in on its own. If you ever
want to note champions from *before* this league existed on Sleeper, open
`lib/manual-history.ts` and add entries following the example in that file, then
push the change to GitHub.

---

## What's in this repo

```
app/                       The page, the manual-generate API route, and the
                            scheduled newsletter route (app/api/cron/newsletter)
components/                UI pieces for each section of the page
lib/                       Sleeper API client, all the stats/ranking/projection
                            math, Supabase and Claude clients
supabase/schema.sql        Run this in the Supabase SQL editor (see step 1 above)
vercel.json                Declares the Tuesday newsletter schedule to Vercel
.env.example                Template for the environment variables (copy to
                            .env.local)
```

## Troubleshooting

- **Page loads but sections are empty / say "not enough data yet"**: normal before
  the draft and before Week 1 finishes -- this league's 2026 season hasn't started
  as of this writing.
- **"Generate" button gives an error**: the Anthropic key is missing or invalid, or
  you're out of API credit at console.anthropic.com.
- **Generated write-ups don't save / newsletter never appears**: the two Supabase
  environment variables are missing from Vercel (or `.env.local` if running
  locally) -- see step 2/local setup above.
- **Newsletter hasn't shown up yet**: it only publishes after a full week of games
  has actually happened, on the following Tuesday morning. Before that, and before
  the season starts, you'll see a "not published yet" message instead -- normal.
- **Want to trigger the newsletter manually to test it** (instead of waiting for
  Tuesday): visit `https://<your-site>/api/cron/newsletter` in a browser, or
  `curl -X POST https://<your-site>/api/cron/newsletter` if you set a
  `CRON_SECRET` (then add `-H "Authorization: Bearer <your-secret>"`). It's safe to
  run more than once -- it skips itself if that week's issue already exists.
