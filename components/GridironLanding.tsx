"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./GridironLanding.module.css";

type Rect = [number, number, number, number, string];

const PALETTE: Record<string, string> = {
  G: "#ffd23f", // helmet
  g: "#caa02e", // helmet shadow
  K: "#141414", // facemask
  S: "#e8b382", // skin
  J: "#2ee4ff", // jersey
  j: "#1596ad", // jersey shadow
  W: "#f6f1ff", // pants / trim
  w: "#c9c2d9", // pants shadow
  P: "#ffd23f", // pants stripe
  B: "#141414", // cleats / gloves
  F: "#8b4a2b", // football leather
};

const DEFENDER_PALETTE: Record<string, string> = {
  H: "#f6f1ff", // helmet (rival white, vs. the runner's gold)
  h: "#c9c2d9", // helmet shadow
  K: "#141414", // facemask
  S: "#e8b382", // skin
  J: "#ff3d5e", // jersey (flag red)
  j: "#c22344", // jersey shadow
  P: "#8f86a6", // pants
  B: "#141414", // cleats
};

// higher-detail pixel sprite: helmet w/ facemask + skin, shaded jersey,
// shaded pants, cleats. Authored as 16-wide row strings (one char per
// pixel) rather than long hand-written rect lists.
const BODY_ROWS = [
  "......GGGG......",
  "....GGGGGGGG....",
  "....gGGGGGGg....",
  "....GGGGGGgSKK..",
  "....GGGGGgSSKK..",
  ".....gggSSKKK...",
  "......SSWWWW....",
  "...JJJJJJJJJJJ..",
  "...jjJJJJJJJJJ..",
  "...jjJJJJWJJJJ..",
  "...jjJJJJWJJJJ..",
  "...jjJJJJWJJJJ..",
  "...jjjJJJJJJJJ..",
  "....jjJJJJJJJ...",
  "....WWWWWWWW....",
  "...PWWWWWWWWW...",
  "...PWWWWWWWWw...",
  "...PWWW..WWWw...",
  "...WWWW..WWWW...",
];

const LEGS_A_ROWS = [
  "...WWWW..WWWW...",
  "...WWW...WWWW...",
  "...BBB....WWW...",
  "..........WW....",
  ".........BBBB...",
];
// pose B is the mirror stride -- reversing each row swaps which leg reads
// as forward vs. trailing, so the run cycle doesn't need a second hand-authored pose.
const LEGS_B_ROWS = LEGS_A_ROWS.map((row) => row.split("").reverse().join(""));

// arms are static (not part of the leg-swap cycle): one stiff-armed out
// front to fend off the defender, the other tucked around the ball. The
// stiff arm needs real reach beyond the jersey silhouette (cols 0-15), so
// it extends into extra canvas width the body art doesn't use. Colors here
// are PALETTE keys (resolved below), not literal fills.
const STIFF_ARM_AND_BALL_KEYED: Rect[] = [
  [13, 7, 2, 2, "J"], // stiff-arm sleeve, at the shoulder
  [15, 8, 3, 2, "J"], // forearm, angling down and out
  [17, 9, 3, 2, "S"], // open palm, pushing out against the defender
  [1, 9, 2, 2, "J"], // ball-carrying upper arm
  [2, 11, 2, 2, "J"], // ball-carrying forearm, tucked in
  [0, 11, 3, 2, "F"], // football
  [1, 12, 1, 1, "W"], // lace
];

const DEFENDER_ROWS = [
  "......HHHH......",
  "....HHHHHHHH....",
  "....hHHHHHHh....",
  "..KKShHHHHHH....",
  "..KKSShHHHHH....",
  "...KKKSShhh.....",
  "....JJJJSS......",
  "..JJJJJJJJJJJ...",
  "..JJJJJJJJJjj...",
  "..JJJJJJJJJjj...",
  "..JJJJJJJJJjj...",
  "..JJJJJJJJjjj...",
  "...JJJJJJJjj....",
  "....PPPPPPPP....",
  "..PPPPPPPPPPPP..",
  ".PPPPP....PPPPP.",
  ".BBBBB....BBBBB.",
];

// arms reach forward (toward low-x, into the runner's path) in a tackle
// brace. Colors are DEFENDER_PALETTE keys (resolved below).
const DEFENDER_ARMS_KEYED: Rect[] = [
  [0, 7, 2, 2, "S"],
  [0, 8, 3, 2, "J"],
  [0, 12, 2, 2, "S"],
  [0, 11, 3, 2, "J"],
];

function resolveRects(rects: Rect[], palette: Record<string, string>): Rect[] {
  return rects.map(([x, y, w, h, key]) => [x, y, w, h, palette[key]]);
}

// merges consecutive same-color cells in a row into one wide rect -- fewer
// elements, and no hairline seams between adjacent 1px fills.
function rectsFromRows(rows: string[], palette: Record<string, string>, yOffset: number): Rect[] {
  const out: Rect[] = [];
  rows.forEach((row, ry) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === ".") {
        x++;
        continue;
      }
      const runStart = x;
      while (x < row.length && row[x] === ch) x++;
      out.push([runStart, yOffset + ry, x - runStart, 1, palette[ch]]);
    }
  });
  return out;
}

const BODY_RECTS = rectsFromRows(BODY_ROWS, PALETTE, 0);
const LEGS_A_RECTS = rectsFromRows(LEGS_A_ROWS, PALETTE, 19);
const LEGS_B_RECTS = rectsFromRows(LEGS_B_ROWS, PALETTE, 19);
const STIFF_ARM_AND_BALL = resolveRects(STIFF_ARM_AND_BALL_KEYED, PALETTE);
const DEFENDER_BODY_RECTS = rectsFromRows(DEFENDER_ROWS, DEFENDER_PALETTE, 0);
const DEFENDER_ARMS = resolveRects(DEFENDER_ARMS_KEYED, DEFENDER_PALETTE);

function Pixels({ rects }: { rects: Rect[] }) {
  return (
    <>
      {rects.map(([x, y, w, h, fill], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
      ))}
    </>
  );
}

const PLAYS = [
  { id: "kickoff", label: "KICKOFF" },
  { id: "scoreboard", label: "SCOREBOARD" },
  { id: "playbook", label: "PLAYBOOK" },
  { id: "draft", label: "DRAFT" },
  { id: "halftime", label: "HALFTIME" },
  { id: "endzone", label: "END ZONE" },
];

export default function GridironLanding() {
  const [active, setActive] = useState("kickoff");
  const runnerRef = useRef<HTMLDivElement>(null);
  const defenderRef = useRef<HTMLDivElement>(null);
  const sprintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function goTo(id: string) {
    const el = document.getElementById(id);
    const runner = runnerRef.current;
    const defender = defenderRef.current;
    if (!el || !runner || !defender) return;

    runner.classList.remove(styles.gkSprinting);
    defender.classList.remove(styles.gkHit);
    void runner.offsetWidth; // restart the animations if they're already mid-play
    runner.classList.add(styles.gkSprinting);
    defender.classList.add(styles.gkHit);

    clearTimeout(sprintTimer.current);
    clearTimeout(hitTimer.current);
    sprintTimer.current = setTimeout(() => runner.classList.remove(styles.gkSprinting), 860);
    hitTimer.current = setTimeout(() => defender.classList.remove(styles.gkHit), 860);

    setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  useEffect(() => {
    const sections = document.querySelectorAll("section[data-gk-still]");
    if (!("IntersectionObserver" in window) || sections.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <div className={styles.gkRoot}>
      <nav className={styles.gkNav} aria-label="Play call">
        <span className={styles.gkNavLabel}>SELECT PLAY:</span>
        {PLAYS.map((p) => (
          <a
            key={p.id}
            href={`#${p.id}`}
            className={p.id === active ? styles.gkActive : undefined}
            onClick={(e) => {
              e.preventDefault();
              goTo(p.id);
            }}
          >
            {p.label}
          </a>
        ))}
      </nav>

      <section id="kickoff" data-gk-still className={`${styles.gkStill} ${styles.gkYardline}`}>
        <div className={styles.gkYardLabel}>OWN 20</div>
        <div className={styles.gkWrap}>
          <div className={styles.gkEyebrow}>SAMPLE FANTASY LEAGUE</div>
          <h1 className={styles.gkDisp}>
            YOUR LEAGUE,
            <br />
            ON THE FIELD.
          </h1>
          <p className={styles.gkLead}>
            Standings, power rankings, a full draft recap, and a weekly newsletter &mdash; live, in one place,
            styled like it&apos;s 4th &amp; goal in 1991. Scroll to run the drive, or call a play above.
          </p>
          <div className={styles.gkBtnRow}>
            <a
              className={`${styles.gkBtn} ${styles.gkGold}`}
              href="#scoreboard"
              onClick={(e) => {
                e.preventDefault();
                goTo("scoreboard");
              }}
            >
              &#9654; START GAME
            </a>
            <Link className={styles.gkBtn} href="/hub">
              VISIT THE LIVE HUB &rarr;
            </Link>
          </div>
        </div>
      </section>

      <section id="scoreboard" data-gk-still className={`${styles.gkStill} ${styles.gkYardline}`}>
        <div className={styles.gkYardLabel}>50 &mdash; MIDFIELD</div>
        <div className={styles.gkWrap}>
          <div className={styles.gkEyebrow}>FEATURE 01</div>
          <h2 className={styles.gkDisp}>LIVE SCOREBOARD</h2>
          <p className={`${styles.gkLead} ${styles.gkDim}`}>
            Standings update straight from Sleeper &mdash; every score, every week, no refresh required.
          </p>
          <div className={`${styles.gkPanel} ${styles.gkScoreboard}`}>
            <div className={styles.gkLed}>
              <div className={styles.gkLedTag}>CURRENT LEADER</div>
              <div className={styles.gkLedScore}>
                TEAM ALPHA
                <br />
                8&ndash;3 &middot; 1284.6 PF
              </div>
            </div>
            <div>
              <div className={styles.gkStandingRow}>
                <span className={`${styles.gkMedal} ${styles.gkGoldMedal}`}>1</span>
                <span className={styles.gkStandingName}>Team Alpha</span>
                <span className={`${styles.gkStandingRec} ${styles.gkTnum}`}>8&ndash;3</span>
              </div>
              <div className={styles.gkStandingRow}>
                <span className={`${styles.gkMedal} ${styles.gkSilverMedal}`}>2</span>
                <span className={styles.gkStandingName}>Team Bravo</span>
                <span className={`${styles.gkStandingRec} ${styles.gkTnum}`}>8&ndash;3</span>
              </div>
              <div className={styles.gkStandingRow}>
                <span className={`${styles.gkMedal} ${styles.gkBronzeMedal}`}>3</span>
                <span className={styles.gkStandingName}>Team Charlie</span>
                <span className={`${styles.gkStandingRec} ${styles.gkTnum}`}>7&ndash;4</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="playbook" data-gk-still className={`${styles.gkStill} ${styles.gkYardline}`}>
        <div className={styles.gkYardLabel}>OPP 40</div>
        <div className={styles.gkWrap}>
          <div className={styles.gkEyebrow}>FEATURE 02</div>
          <h2 className={styles.gkDisp}>THE WEEKLY PLAYBOOK</h2>
          <p className={`${styles.gkLead} ${styles.gkDim}`}>
            Power rankings chart every team&apos;s rank, week over week &mdash; so a hot start or a cold collapse
            shows up as a line, not a guess.
          </p>
          <div className={styles.gkPanel}>
            <div className={styles.gkPlaybookCard}>
              <svg viewBox="0 0 640 200" style={{ width: "100%", height: "auto" }} role="img" aria-label="Sample power ranking trend">
                <line x1="20" y1="20" x2="620" y2="20" stroke="#1b7a45" strokeWidth={1} />
                <line x1="20" y1="100" x2="620" y2="100" stroke="#1b7a45" strokeWidth={1} />
                <line x1="20" y1="180" x2="620" y2="180" stroke="#1b7a45" strokeWidth={1} />
                <path d="M 20 100 L 170 40 L 320 24 L 470 24 L 620 20" fill="none" stroke="#ffd23f" strokeWidth={3} />
                <path d="M 20 24 L 170 60 L 320 110 L 470 150 L 620 176" fill="none" stroke="#ff3d5e" strokeWidth={3} />
                <text x="620" y="16" textAnchor="end" fontSize={13} fill="#ffd23f" fontFamily="VT323">
                  TEAM ALPHA
                </text>
                <text x="620" y="192" textAnchor="end" fontSize={13} fill="#ff3d5e" fontFamily="VT323">
                  TEAM KILO
                </text>
              </svg>
              <div className={styles.gkPlaybookNote}>
                Diagram: Team Alpha&apos;s rise to #1 vs. Team Kilo&apos;s five-week collapse. Sample data.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="draft" data-gk-still className={`${styles.gkStill} ${styles.gkYardline}`}>
        <div className={styles.gkYardLabel}>OPP 20</div>
        <div className={styles.gkWrap}>
          <div className={styles.gkEyebrow}>FEATURE 03</div>
          <h2 className={styles.gkDisp}>DRAFT DAY, ON RECORD</h2>
          <p className={`${styles.gkLead} ${styles.gkDim}`}>
            Every pick, every round, pulled straight from the live draft board and kept on file all season.
          </p>
          <div className={styles.gkPanel}>
            <div className={styles.gkTicker}>
              {[
                { pick: "1.01", player: "Player 01", pos: "RB", team: "Team Alpha" },
                { pick: "1.02", player: "Player 02", pos: "RB", team: "Team Bravo" },
                { pick: "1.03", player: "Player 03", pos: "WR", team: "Team Charlie" },
                { pick: "1.04", player: "Player 04", pos: "QB", team: "Team Delta" },
              ].map((row) => (
                <div key={row.pick} className={styles.gkTickerRow}>
                  <span className={styles.gkTickerPick}>{row.pick}</span>
                  <span>{row.player}</span>
                  <span className={styles.gkTickerPos}>{row.pos}</span>
                  <span className={styles.gkTickerTeam}>{row.team}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="halftime" data-gk-still className={`${styles.gkStill} ${styles.gkYardline}`}>
        <div className={styles.gkYardLabel}>OPP 5</div>
        <div className={styles.gkWrap}>
          <div className={styles.gkEyebrow}>FEATURE 04</div>
          <h2 className={styles.gkDisp}>THE HALFTIME REPORT</h2>
          <p className={`${styles.gkLead} ${styles.gkDim}`}>
            A witty weekly write-up, drafted by asking Claude in any chat &mdash; no API key or hosting cost
            required to keep it running.
          </p>
          <div className={styles.gkPanel}>
            <div className={styles.gkKiosk}>
              <div className={styles.gkKioskKicker}>The League Insider &middot; Week 11</div>
              <h3>Alpha Rolls On, Kilo&apos;s Freefall Continues</h3>
              <p>
                Team Alpha didn&apos;t just win Week 11, it made a statement &mdash; a 142.3-point outing, the
                league&apos;s best of the week, in a season that&apos;s starting to look less like a hot streak
                and more like a coronation.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="endzone" data-gk-still className={`${styles.gkStill} ${styles.gkYardline}`}>
        <div className={styles.gkYardLabel}>TOUCHDOWN</div>
        <div className={styles.gkWrap}>
          <div className={styles.gkEndzoneBlock}>
            <div className={styles.gkEndzoneInner}>
              <h1 className={styles.gkDisp}>SIX POINTS.</h1>
              <p className={styles.gkLead} style={{ margin: "0 auto 22px", textAlign: "center" }}>
                That&apos;s the whole drive &mdash; standings to newsletter, live. Your actual league, running the
                same play.
              </p>
              <div className={styles.gkBtnRow} style={{ justifyContent: "center" }}>
                <Link className={`${styles.gkBtn} ${styles.gkGold}`} href="/hub">
                  ENTER THE HUB &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.gkBanner}>Preview shown above uses sample teams &mdash; the hub has your real league.</div>
        <footer className={styles.gkFoot}>Built on the public Sleeper API. Refreshes automatically every few minutes.</footer>
      </section>

      <div className={styles.gkDefenderDock} ref={defenderRef} aria-hidden="true">
        <svg viewBox="0 0 16 18">
          <g transform="translate(0, 0)">
            <g className={styles.gkBrace}>
              <Pixels rects={DEFENDER_BODY_RECTS} />
              <Pixels rects={DEFENDER_ARMS} />
            </g>
          </g>
        </svg>
      </div>

      <div className={styles.gkRunnerDock} ref={runnerRef} aria-hidden="true">
        <svg viewBox="0 0 20 24">
          <g transform="translate(0, 0)">
            <g className={styles.gkRunCycle}>
              <Pixels rects={BODY_RECTS} />
              <Pixels rects={STIFF_ARM_AND_BALL} />
              <g className={styles.gkLegsA}>
                <Pixels rects={LEGS_A_RECTS} />
              </g>
              <g className={styles.gkLegsB}>
                <Pixels rects={LEGS_B_RECTS} />
              </g>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
