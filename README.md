# Baruka Ta Adenine — League Dashboard

A single web page that's the home base for your Sleeper fantasy league. It pulls live
data straight from Sleeper (standings, scores, rosters, draft results, league history)
and computes standings, power rankings, position-group strength, and a predictions
outlook. If you add a Claude API key, it also writes the recap, power-ranking blurbs,
and predictions outlook for you in plain English.

No installation, no accounts, nothing to sign up for beyond what you already have.

## What's in this folder

| File | What it's for |
|---|---|
| `index.html` | The actual dashboard. This is the page you look at. |
| `server.py` | A tiny local helper. Saves your typed-in notes, and (optionally) talks to Claude. |
| `data.json` | Created automatically the first time you run it. Holds anything you type in (like older seasons you add by hand). |
| `anthropic_key.txt` | You create this yourself, only if you want automatic write-ups (see below). |

## How to run it each week

You need Python 3, which is already installed on every Mac and most Windows/Linux
machines. Open a terminal (on Mac: the "Terminal" app; on Windows: "Command Prompt"
or "PowerShell") and run:

```
cd path/to/Fantasy-Football
python3 server.py
```

*(On Windows, if `python3` isn't recognized, try `python` instead.)*

You'll see:

```
Baruka Ta Adenine dashboard running at http://localhost:8765
Press Ctrl+C to stop.
```

Now open your browser and go to **http://localhost:8765**. That's it — the page loads
live from Sleeper every time you open or refresh it, so there's no separate "update"
step. Just leave the terminal window open while you're using the page, and press
`Ctrl+C` in the terminal when you're done (or just close the terminal).

**To check it again next week:** run the exact same command again. There's nothing to
reinstall or update — it always pulls this week's numbers from Sleeper.

## Before the season starts

Your league is still in the pre-draft stage on Sleeper, so right now the page will
show you league settings, the team list, and your draft schedule, with the weekly
recap / power rankings / predictions sections clearly marked as "fills in once games
are played." Once you draft and Week 1 games happen, just reload the page — everything
else appears automatically.

Good news on league history: your league already goes back to 2024 and 2025 on
Sleeper, with real standings and champions, so that section is already filled in.

## Adding older seasons by hand

If your league existed before it was on Sleeper (or Sleeper doesn't have a season for
some other reason), scroll to the **League History** section and use the small form
under "Add an older season by hand." Whatever you type is saved to `data.json` next to
this app, so it'll still be there the next time you run the server.

## Adding a Claude API key (optional)

Without a key, the **Written Content** section at the bottom of the page still gives
you a plain-text summary of the week's numbers (click "Show the plain-text brief") that
you can paste into Claude yourself to get the recap, power-ranking blurbs, and
predictions written up.

If you'd rather it happen automatically with one click:

1. Go to **https://console.anthropic.com/settings/keys** and sign in (or create an
   account — there's a free trial credit, and this app uses very little of it: one
   short request per week you click the button).
2. Click **Create Key**, give it any name, and copy the key it shows you (it starts
   with `sk-ant-`).
3. In this folder, create a new plain text file named exactly `anthropic_key.txt` and
   paste the key in as the only thing in the file. Save it.
4. Restart `server.py` (`Ctrl+C`, then run it again) and reload the page.

You'll now see a **"Generate write-ups with Claude"** button. Click it any time after
the week's games are done to get a fresh recap, rankings blurbs, and predictions
outlook. It's safe to click again later in the week — it always uses the latest
numbers.

**Keep your key private.** Never share `anthropic_key.txt` or paste its contents
anywhere public. It's already excluded from git (see `.gitignore`) so it won't
accidentally get uploaded if this folder is in a repository.

## Troubleshooting

- **"command not found: python3"** — Python isn't installed or isn't on your PATH.
  Install it from [python.org](https://www.python.org/downloads/) (any recent version
  works), then try again.
- **The page loads but sections say "Something went wrong loading data from
  Sleeper"** — check your internet connection and refresh. The page talks directly to
  Sleeper's API, so if Sleeper is briefly down, so is this page.
- **Port 8765 already in use** — you probably still have a previous `server.py` running
  in another terminal window. Close that one, or find and stop the process using that
  port.
- **I want to run this on a different computer** — just copy this whole folder over.
  Your `anthropic_key.txt` and `data.json` won't come along unless you copy those too
  (which is probably what you want, since the key is private).

## How this actually works, in plain terms

- **The page itself** (`index.html`) fetches everything about your league — standings,
  scores, rosters, draft picks, past seasons — directly from Sleeper's public API, in
  your browser. Sleeper doesn't require a login or API key for this; it's free and
  read-only.
- **`server.py`** does three small jobs a browser page can't safely do on its own:
  serving the page locally, saving what you type into a file on your computer, and
  (only if you've added a key) making the one API call to Claude so your key never has
  to sit inside a web page.
- **Nothing is uploaded anywhere.** All of this runs on your own computer. The only
  network calls are to Sleeper (read-only, public) and, if you've added a key, to
  Anthropic's API for the write-ups.
