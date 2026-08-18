# Baruka Ta Adenine League Hub

A single website that is the home page for your Sleeper fantasy football league. It
reads live data from Sleeper every time someone visits, and shows standings, power
rankings, position insights, a predictions outlook, league history, draft results,
and a banter/roast section you fill in by hand.

This doc assumes zero coding background. Follow it top to bottom once, then just use
the two short "every week" steps at the bottom.

## How it's built (plain language)

Three free services work together:

- **GitHub** -- holds the code (already set up, you're looking at it).
- **Vercel** -- runs the website and gives you a public URL. Every time new code is
  pushed to GitHub, Vercel automatically rebuilds and updates the live site. This is
  what makes it "auto-update."
- **Supabase** -- a small database that remembers two things the Sleeper API can't
  give us: the banter quotes you paste in, and the AI-written weekly blurbs (so
  they're generated once and everyone sees the same version, instead of regenerating
  on every visit).

Nothing runs on your own computer once it's deployed. The site fetches fresh data
from Sleeper's public API on its own, on a timer (every 5 minutes) -- you don't
have to "run an update."

---

## One-time setup

### 1. Create the database tables in Supabase

You already created a Supabase project. Now it needs two tables:

1. Go to your project at https://supabase.com/dashboard/project/drkqedzlrowgrhesxcvk
2. In the left sidebar, click **SQL Editor** -> **New query**.
3. Open the file `supabase/schema.sql` in this repo, copy all of it, paste it into
   the SQL editor, and click **Run**.

That creates a `banter_entries` table (for the quotes you paste in) and a
`generated_content` table (a cache for the AI write-ups). You only do this once.

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
rankings, and predictions update themselves once games are played.

Two optional things you might do each week:

### Paste in the banter

Scroll to the **Banter & Low-Score Roast** section at the bottom of the page, type a
quote from the group chat into the box, optionally say who said it, and click **Add
Quote**. It's saved in Supabase and shows up for everyone who visits.

### Generate the AI write-up (only if you added an Anthropic key)

If you've added an `ANTHROPIC_API_KEY` (see below), you'll see a **Generate This
Week's Write-Up** button near the top of the page. Click it once each week (after
that week's games finish, ideally) and it writes the recap, power ranking blurbs,
predictions, and banter roast in one shot. It's saved so every visitor sees the same
version -- click **Regenerate** if you want a fresh take.

If you never add a key, you'll instead see a **Copy Brief** button with a clean
text summary of the week's numbers -- paste that into Claude.ai yourself with a
prompt like "write this week's recap and power rankings from this data" to get the
same kind of write-up by hand.

---

## Adding an Anthropic API key later

This turns on the automatic AI write-ups (weekly recap narrative, power ranking
blurbs, predictions outlook, and the banter roast).

1. Go to https://console.anthropic.com, sign in, and create an API key (Settings ->
   API Keys -> Create Key).
2. In Vercel: open your project -> **Settings** -> **Environment Variables**.
3. Set `ANTHROPIC_API_KEY` to the key you just created, for all environments.
4. Vercel will ask you to redeploy for the change to take effect -- click
   **Redeploy** (or just push any small change to GitHub).

The site uses Claude Sonnet 5 (`claude-sonnet-5`). Cost is small: each click of
"Generate" is one short request, well under a cent.

---

## Adding past champions by hand

Your league's Sleeper history already goes back to 2024 automatically (via Sleeper's
`previous_league_id` chain), so the History section fills in on its own. If you ever
want to note champions from *before* this league existed on Sleeper, open
`lib/manual-history.ts` and add entries following the example in that file, then
push the change to GitHub.

---

## What's in this repo

```
app/                  The pages and the one API route (Claude generation)
components/           UI pieces for each section of the page
lib/                  Sleeper API client, all the stats/ranking math, Supabase and
                       Claude clients
supabase/schema.sql   Run this once in the Supabase SQL editor (see step 1 above)
.env.example          Template for the environment variables (copy to .env.local)
```

## Troubleshooting

- **Page loads but sections are empty / say "not enough data yet"**: normal before
  the draft and before Week 1 finishes -- this league's 2026 season hasn't started
  as of this writing.
- **Banter box says "not configured"**: the two Supabase environment variables are
  missing from Vercel (or `.env.local` if running locally) -- see step 2/local setup
  above.
- **"Generate" button gives an error**: the Anthropic key is missing or invalid, or
  you're out of API credit at console.anthropic.com.
