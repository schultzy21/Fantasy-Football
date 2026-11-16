"use client";

import { useEffect, useRef, type CSSProperties } from "react";

type Rect = [number, number, number, number, string];
type Team = "home" | "away";
type Role = "runner" | "blocker" | "defender";
type Layer = { fill: string; d: string };

// Both teams share one sprite; only the palette changes, so either side can
// be on offense.
const TEAM_PALETTES: Record<Team, Record<string, string>> = {
  home: {
    G: "#ffd23f", // helmet
    Y: "#ffe993", // helmet gloss
    g: "#caa02e", // helmet shadow
    K: "#141414", // facemask
    S: "#e8b382", // skin
    J: "#2ee4ff", // jersey
    C: "#9ef4ff", // jersey highlight
    j: "#1596ad", // jersey shadow
    N: "#f6f1ff", // collar + jersey number
    W: "#f6f1ff", // pants
    w: "#c9c2d9", // pants shadow
    P: "#ffd23f", // pants stripe
    B: "#141414", // cleats / gloves
    F: "#8b4a2b", // football leather
    L: "#f6f1ff", // football laces
  },
  away: {
    G: "#f6f1ff",
    Y: "#ffffff",
    g: "#c9c2d9",
    K: "#141414",
    S: "#e8b382",
    J: "#ff3d5e",
    C: "#ff8fa3",
    j: "#c22344",
    N: "#f6f1ff",
    W: "#8f86a6",
    w: "#6f6787",
    P: "#ff3d5e",
    B: "#141414",
    F: "#8b4a2b",
    L: "#f6f1ff",
  },
};

// 16-wide row strings, one char per pixel, facing right.
const BODY_ROWS = [
  "......YGGG......",
  "....YYGGGGGG....",
  "....gGGGGGGg....",
  "....GGGGGGgSKK..",
  "....GGGGGgSSKK..",
  ".....gggSSKKK...",
  "......SSNNNN....",
  "...CCJJJJJJJJJ..",
  "...jjJJJJJJJJJ..",
  "...jjJJJJNJJJJ..",
  "...jjJJJJNJJJJ..",
  "...jjJJJJNJJJJ..",
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
// The mirror stride: reversing each row swaps which leg is forward.
const LEGS_B_ROWS = LEGS_A_ROWS.map((row) => row.split("").reverse().join(""));
const LEGS_Y = BODY_ROWS.length;

// Arms reach past the 16-wide body, so every sprite sits on a 20-wide canvas.
// Listed back to front: later rects paint over earlier ones.
const ARMS: Record<Role, Rect[]> = {
  runner: [
    [13, 7, 2, 2, "J"],
    [15, 8, 3, 2, "J"],
    [17, 9, 3, 2, "S"],
    [1, 9, 2, 2, "J"],
    [2, 11, 2, 2, "J"],
    [0, 11, 3, 2, "F"],
    [1, 12, 1, 1, "L"],
  ],
  blocker: [
    [1, 9, 2, 4, "J"],
    [1, 13, 2, 1, "B"],
    [13, 9, 2, 4, "J"],
    [13, 13, 2, 1, "B"],
  ],
  defender: [
    [13, 8, 3, 2, "J"],
    [16, 8, 2, 2, "S"],
    [13, 11, 3, 2, "J"],
    [16, 11, 2, 2, "S"],
  ],
};

const OUTLINE = 0.5;

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

function pathData(rects: Rect[], grow = 0): string {
  return rects
    .map(([x, y, w, h]) => `M${x - grow} ${y - grow}h${w + grow * 2}v${h + grow * 2}h${-(w + grow * 2)}z`)
    .join("");
}

// One path per colour instead of one element per pixel run.
function layersByFill(rects: Rect[]): Layer[] {
  const byFill = new Map<string, Rect[]>();
  for (const rect of rects) {
    const group = byFill.get(rect[4]);
    if (group) group.push(rect);
    else byFill.set(rect[4], [rect]);
  }
  return [...byFill].map(([fill, group]) => ({ fill, d: pathData(group) }));
}

type Sprite = {
  outline: string;
  legsAOutline: string;
  legsBOutline: string;
  body: Layer[];
  arms: Rect[];
  legsA: Layer[];
  legsB: Layer[];
};

function buildSprite(team: Team, role: Role): Sprite {
  const palette = TEAM_PALETTES[team];
  const body = rectsFromRows(BODY_ROWS, palette, 0);
  const arms = ARMS[role].map(([x, y, w, h, key]): Rect => [x, y, w, h, palette[key]]);
  const legsA = rectsFromRows(LEGS_A_ROWS, palette, LEGS_Y);
  const legsB = rectsFromRows(LEGS_B_ROWS, palette, LEGS_Y);
  return {
    // The black edge is drawn as geometry rather than a CSS filter, so the
    // browser isn't re-filtering every sprite on every animation frame.
    outline: pathData([...body, ...arms], OUTLINE),
    legsAOutline: pathData(legsA, OUTLINE),
    legsBOutline: pathData(legsB, OUTLINE),
    body: layersByFill(body),
    arms,
    legsA: layersByFill(legsA),
    legsB: layersByFill(legsB),
  };
}

const ROLES: Role[] = ["runner", "blocker", "defender"];
const SPRITES = Object.fromEntries(
  (["home", "away"] as Team[]).map((team) => [
    team,
    Object.fromEntries(ROLES.map((role) => [role, buildSprite(team, role)])),
  ]),
) as Record<Team, Record<Role, Sprite>>;

function Layers({ layers }: { layers: Layer[] }) {
  return (
    <>
      {layers.map((l) => (
        <path key={l.fill} fill={l.fill} d={l.d} />
      ))}
    </>
  );
}

type Member = { team: Team; role: Role; dy?: number; gap?: number };

function Player({ member, index }: { member: Member; index: number }) {
  const sprite = SPRITES[member.team][member.role];
  const style = {
    "--fc-delay": `-${(index * 0.13).toFixed(2)}s`,
    "--fc-dy": member.dy ?? 0,
    "--fc-gap": member.gap ?? 0,
  } as CSSProperties;
  return (
    <div className="field-char" style={style}>
      <svg viewBox="0 0 20 25">
        <rect className="fc-shadow" x={2} y={23.4} width={13} height={1.4} />
        <g className="fc-run-cycle">
          <path d={sprite.outline} />
          <path className="fc-legs-a" d={sprite.legsAOutline} />
          <path className="fc-legs-b" d={sprite.legsBOutline} />
          <Layers layers={sprite.body} />
          {sprite.arms.map(([x, y, w, h, fill], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
          ))}
          <g className="fc-legs-a">
            <Layers layers={sprite.legsA} />
          </g>
          <g className="fc-legs-b">
            <Layers layers={sprite.legsB} />
          </g>
        </g>
      </svg>
    </div>
  );
}

type Play = {
  top: string;
  duration: string;
  delay: string;
  rest: string; // where the play stands when motion is reduced
  reverse?: boolean;
  members: Member[]; // trailing player first, lead player last
};

// Three different plays instead of one formation repeated: a home sweep, an
// away return coming back the other way, and a home breakaway.
const PLAYS: Play[] = [
  {
    top: "15%",
    duration: "16s",
    delay: "-5s",
    rest: "6vw",
    members: [
      { team: "away", role: "defender", dy: -4 },
      { team: "away", role: "defender", dy: 5 },
      { team: "home", role: "blocker", dy: -2 },
      { team: "home", role: "runner", dy: 2 },
      { team: "home", role: "blocker", dy: 6 },
    ],
  },
  {
    top: "45%",
    duration: "21s",
    delay: "-13s",
    rest: "38vw",
    reverse: true,
    members: [
      { team: "home", role: "defender", dy: 4 },
      { team: "home", role: "defender", dy: -5 },
      { team: "away", role: "blocker", dy: 3 },
      { team: "away", role: "runner", dy: -1 },
      { team: "away", role: "blocker", dy: -6 },
    ],
  },
  {
    top: "74%",
    duration: "12s",
    delay: "-8s",
    rest: "20vw",
    members: [
      { team: "away", role: "defender", dy: -5 },
      { team: "away", role: "defender", dy: 4 },
      { team: "away", role: "defender", dy: -1 },
      { team: "home", role: "runner", dy: 1, gap: 12 },
    ],
  },
];

const YARD_NUMBERS = [10, 20, 30, 40, 50, 40, 30, 20, 10];

function YardNumbers({ row }: { row: "top" | "bottom" }) {
  return (
    <>
      {YARD_NUMBERS.map((n, i) => (
        <div
          key={i}
          className={`field-num field-num-${row}${i < 4 ? " is-left" : i > 4 ? " is-right" : ""}`}
          style={{ left: `calc(${(i + 1) * 10} * var(--yd))` }}
        >
          <span>{n / 10}</span>
          <span>0</span>
        </div>
      ))}
    </>
  );
}

// The fixed backdrop behind every page: a full 120-yard field with plays
// running across it. Scrolling the page is the drive -- the camera pans from
// the home end zone at the top of the page to the away end zone at the
// bottom, and holds still whenever the page does.
export default function FieldScene() {
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const update = () => {
      frame = 0;
      const hidden = strip.offsetWidth - window.innerWidth;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      // Midfield when there is nowhere to pan to, or motion is unwanted.
      const progress =
        hidden <= 0 || scrollable <= 0 || reduceMotion.matches
          ? 0.5
          : Math.min(1, Math.max(0, window.scrollY / scrollable));
      strip.style.transform = `translate3d(${-Math.round(hidden * progress)}px, 0, 0)`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduceMotion.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduceMotion.removeEventListener("change", schedule);
    };
  }, []);

  return (
    <div className="field-scene" aria-hidden="true">
      <div className="field-strip" ref={stripRef}>
        <div className="field-endzone field-endzone-home">NATIONS</div>
        <div className="field-play">
          <YardNumbers row="top" />
          <YardNumbers row="bottom" />
        </div>
        <div className="field-endzone field-endzone-away">LEAGUE</div>
      </div>
      {PLAYS.map((play, i) => (
        <div
          key={i}
          className={`field-formation${play.reverse ? " is-reverse" : ""}`}
          style={
            {
              top: play.top,
              animationDuration: play.duration,
              animationDelay: play.delay,
              "--field-rest": play.rest,
            } as CSSProperties
          }
        >
          <div className="field-formation-row">
            {play.members.map((member, j) => (
              <Player key={j} member={member} index={j} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
