#!/usr/bin/env python3
"""
Local helper server for the Baruka Ta Adenine league dashboard.

Run with:  python3 server.py
Then open: http://localhost:8765

What this does (and does NOT do):
- Serves index.html and the small set of files next to it.
- Saves your hand-typed league history notes to data.json so they
  survive closing the browser / restarting your computer.
- Fetches and caches Sleeper's big /players/nfl file to players_cache.json,
  refreshing it at most once a day, and trims it down to just the fields
  the page needs before handing it to the browser.
- If you've added a Claude API key (see README.md), calls Claude to write
  the weekly recap, power-ranking blurbs, and predictions outlook. If no
  key is present, it just says so -- the page falls back to a "copy this
  into Claude yourself" text block.

Everything else (standings, scores, live Sleeper data) is fetched directly
by your browser from Sleeper -- this script never touches that.

No third-party packages are used; only the Python standard library.
"""

import json
import os
import time
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = 8765
ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(ROOT, "data.json")
PLAYERS_CACHE_FILE = os.path.join(ROOT, "players_cache.json")
API_KEY_FILE = os.path.join(ROOT, "anthropic_key.txt")

SLEEPER_PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl"
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_MODEL = "claude-sonnet-5"
FANTASY_POSITIONS = {"QB", "RB", "WR", "TE", "K", "DEF"}
PLAYERS_MAX_AGE_SECONDS = 24 * 60 * 60  # refetch at most once a day

DEFAULT_DATA = {"manual_history": []}


def read_json(path, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return default


def write_json(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)
    os.replace(tmp, path)


def get_anthropic_key():
    if not os.path.exists(API_KEY_FILE):
        return None
    with open(API_KEY_FILE, "r", encoding="utf-8") as f:
        key = f.read().strip()
    return key or None


def fetch_and_trim_players():
    """Download Sleeper's player list and keep only what the page needs."""
    req = urllib.request.Request(
        SLEEPER_PLAYERS_URL, headers={"User-Agent": "baruka-ta-adenine-dashboard"}
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = json.loads(resp.read().decode("utf-8"))

    trimmed = {}
    for player_id, p in raw.items():
        position = p.get("position")
        if position not in FANTASY_POSITIONS:
            continue
        name = p.get("full_name") or (
            f"{p.get('first_name', '')} {p.get('last_name', '')}".strip()
        )
        if not name:
            continue
        trimmed[player_id] = [name, position, p.get("team")]

    cache = {"updated_at": time.time(), "players": trimmed}
    write_json(PLAYERS_CACHE_FILE, cache)
    return cache


def get_players_cache():
    cache = read_json(PLAYERS_CACHE_FILE, None)
    if cache and (time.time() - cache.get("updated_at", 0)) < PLAYERS_MAX_AGE_SECONDS:
        return cache
    try:
        return fetch_and_trim_players()
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError) as e:
        if cache:
            # stale cache beats no cache if today's fetch failed
            return cache
        raise e


def call_anthropic(api_key, system_prompt, user_prompt, json_schema):
    body = {
        "model": ANTHROPIC_MODEL,
        "max_tokens": 4096,
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_prompt}],
        "output_config": {"format": {"type": "json_schema", "schema": json_schema}},
    }
    req = urllib.request.Request(
        ANTHROPIC_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "content-type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    text = next(b["text"] for b in result["content"] if b["type"] == "text")
    return json.loads(text)


WRITEUP_SCHEMA = {
    "type": "object",
    "properties": {
        "recap_narrative": {
            "type": "string",
            "description": "2-4 short paragraphs recapping the most recent completed week in a fun, newspaper-style voice.",
        },
        "power_ranking_blurbs": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "team_name": {"type": "string"},
                    "blurb": {"type": "string", "description": "1-2 punchy sentences about this team's ranking."},
                },
                "required": ["team_name", "blurb"],
                "additionalProperties": False,
            },
        },
        "predictions_outlook": {
            "type": "string",
            "description": "2-4 short paragraphs: playoff picture, bubble watch, title favorite, darkhorses, and who's tracking toward last place.",
        },
    },
    "required": ["recap_narrative", "power_ranking_blurbs", "predictions_outlook"],
    "additionalProperties": False,
}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # keep the terminal quiet

    def _send_json(self, obj, status=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path, content_type):
        try:
            with open(path, "rb") as f:
                body = f.read()
        except FileNotFoundError:
            self.send_response(404)
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            self._send_file(os.path.join(ROOT, "index.html"), "text/html; charset=utf-8")
        elif self.path == "/api/manual-history":
            data = read_json(DATA_FILE, DEFAULT_DATA)
            self._send_json(data.get("manual_history", []))
        elif self.path == "/api/players":
            try:
                cache = get_players_cache()
                self._send_json(cache)
            except Exception as e:
                self._send_json({"error": str(e)}, status=502)
        elif self.path == "/api/key-status":
            self._send_json({"has_key": get_anthropic_key() is not None})
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw_body = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError:
            self._send_json({"error": "invalid JSON"}, status=400)
            return

        if self.path == "/api/manual-history":
            data = read_json(DATA_FILE, DEFAULT_DATA)
            entries = data.setdefault("manual_history", [])
            entries.append(
                {
                    "season": str(payload.get("season", "")).strip(),
                    "champion": str(payload.get("champion", "")).strip(),
                    "note": str(payload.get("note", "")).strip(),
                }
            )
            write_json(DATA_FILE, data)
            self._send_json(entries)

        elif self.path == "/api/manual-history/delete":
            data = read_json(DATA_FILE, DEFAULT_DATA)
            entries = data.setdefault("manual_history", [])
            index = payload.get("index")
            if isinstance(index, int) and 0 <= index < len(entries):
                entries.pop(index)
                write_json(DATA_FILE, data)
            self._send_json(entries)

        elif self.path == "/api/generate":
            api_key = get_anthropic_key()
            if not api_key:
                self._send_json({"available": False})
                return
            try:
                result = call_anthropic(
                    api_key,
                    payload.get(
                        "system",
                        "You write short, lively fantasy football league newsletter copy. "
                        "Be specific, use the real numbers given to you, and keep a fun but "
                        "grounded tone -- no generic filler.",
                    ),
                    payload["brief"],
                    WRITEUP_SCHEMA,
                )
                self._send_json({"available": True, "result": result})
            except urllib.error.HTTPError as e:
                detail = e.read().decode("utf-8", errors="replace")
                self._send_json(
                    {"available": True, "error": f"Anthropic API error {e.code}: {detail}"},
                    status=502,
                )
            except Exception as e:
                self._send_json({"available": True, "error": str(e)}, status=502)
        else:
            self.send_response(404)
            self.end_headers()


def main():
    if not os.path.exists(DATA_FILE):
        write_json(DATA_FILE, DEFAULT_DATA)
    server = ThreadingHTTPServer(("localhost", PORT), Handler)
    print(f"Baruka Ta Adenine dashboard running at http://localhost:{PORT}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping.")


if __name__ == "__main__":
    main()
