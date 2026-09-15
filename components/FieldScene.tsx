"use client";

type Rect = [number, number, number, number, string];

const PALETTE: Record<string, string> = {
  G: "#ffd23f", // helmet
  Y: "#ffe993", // helmet highlight (gloss)
  g: "#caa02e", // helmet shadow
  K: "#141414", // facemask
  S: "#e8b382", // skin
  J: "#2ee4ff", // jersey
  C: "#9ef4ff", // jersey highlight
  j: "#1596ad", // jersey shadow
  W: "#f6f1ff", // pants / trim
  w: "#c9c2d9", // pants shadow
  P: "#ffd23f", // pants stripe
  B: "#141414", // cleats / gloves
  F: "#8b4a2b", // football leather
};

const DEFENDER_PALETTE: Record<string, string> = {
  H: "#f6f1ff", // helmet (rival white, vs. the offense's gold)
  h: "#c9c2d9", // helmet shadow
  K: "#141414", // facemask
  S: "#e8b382", // skin
  J: "#ff3d5e", // jersey (flag red)
  i: "#ff8fa3", // jersey highlight
  j: "#c22344", // jersey shadow
  P: "#8f86a6", // pants
  B: "#141414", // cleats
};

// Higher-detail pixel sprite: helmet w/ facemask + skin, shaded jersey,
// shaded pants, cleats. Authored as 16-wide row strings (one char per
// pixel) rather than long hand-written rect lists. Shared by the ball
// carrier and both blockers -- same team, same build.
const BODY_ROWS = [
  "......YGGG......",
  "....YYGGGGGG....",
  "....gGGGGGGg....",
  "....GGGGGGgSKK..",
  "....GGGGGgSSKK..",
  ".....gggSSKKK...",
  "......SSWWWW....",
  "...CCJJJJJJJJJ..",
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

// the ball carrier's stiff-arm + football -- reaches beyond the jersey
// silhouette (cols 0-15), so it extends into extra canvas width.
const STIFF_ARM_AND_BALL_KEYED: Rect[] = [
  [13, 7, 2, 2, "J"],
  [15, 8, 3, 2, "J"],
  [17, 9, 3, 2, "S"],
  [1, 9, 2, 2, "J"],
  [2, 11, 2, 2, "J"],
  [0, 11, 3, 2, "F"],
  [1, 12, 1, 1, "W"],
];

// blockers run with both arms pumping instead of one arm on a ball.
const BLOCKER_ARMS_KEYED: Rect[] = [
  [1, 9, 2, 4, "J"],
  [1, 13, 2, 1, "B"],
  [13, 9, 2, 4, "J"],
  [13, 13, 2, 1, "B"],
];

const DEFENDER_ROWS = [
  "......HHHH......",
  "....HHHHHHHH....",
  "....hHHHHHHh....",
  "..KKShHHHHHH....",
  "..KKSShHHHHH....",
  "...KKKSShhh.....",
  "....JJJJSS......",
  "..iiJJJJJJJJJ...",
  "..JJJJJJJJJjj...",
  "..JJJJJJJJJjj...",
  "..JJJJJJJJJjj...",
  "..JJJJJJJJjjj...",
  "...JJJJJJJjj....",
  "....PPPPPPPP....",
  "..PPPPPPPPPPPP..",
  "...PPPPPPPPPP...",
  "...PPPPPPPPPP...",
  "...PPPP..PPPP...",
  "...PPPP..PPPP...",
];
// same stride shape as the offense, recolored -- the defender is chasing,
// not braced, so it needs running legs rather than a static wide stance.
const DEFENDER_LEGS_A_ROWS = LEGS_A_ROWS.map((row) => row.replace(/W/g, "P"));
const DEFENDER_LEGS_B_ROWS = LEGS_B_ROWS.map((row) => row.replace(/W/g, "P"));

// arms reach forward (toward low-x, into the play) in a tackle reach.
const DEFENDER_ARMS_KEYED: Rect[] = [
  [0, 7, 2, 2, "S"],
  [0, 8, 3, 2, "J"],
  [0, 12, 2, 2, "S"],
  [0, 11, 3, 2, "J"],
];

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

function resolveRects(rects: Rect[], palette: Record<string, string>): Rect[] {
  return rects.map(([x, y, w, h, key]) => [x, y, w, h, palette[key]]);
}

const BODY_RECTS = rectsFromRows(BODY_ROWS, PALETTE, 0);
const LEGS_A_RECTS = rectsFromRows(LEGS_A_ROWS, PALETTE, 19);
const LEGS_B_RECTS = rectsFromRows(LEGS_B_ROWS, PALETTE, 19);
const STIFF_ARM_AND_BALL = resolveRects(STIFF_ARM_AND_BALL_KEYED, PALETTE);
const BLOCKER_ARMS = resolveRects(BLOCKER_ARMS_KEYED, PALETTE);
const DEFENDER_BODY_RECTS = rectsFromRows(DEFENDER_ROWS, DEFENDER_PALETTE, 0);
const DEFENDER_LEGS_A_RECTS = rectsFromRows(DEFENDER_LEGS_A_ROWS, DEFENDER_PALETTE, 19);
const DEFENDER_LEGS_B_RECTS = rectsFromRows(DEFENDER_LEGS_B_ROWS, DEFENDER_PALETTE, 19);
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

function Runner({ delay }: { delay: string }) {
  return (
    <div className="field-char field-runner">
      <svg viewBox="0 0 20 24">
        <g className="fc-run-cycle" style={{ animationDelay: delay }}>
          <Pixels rects={BODY_RECTS} />
          <Pixels rects={STIFF_ARM_AND_BALL} />
          <g className="fc-legs-a" style={{ animationDelay: delay }}>
            <Pixels rects={LEGS_A_RECTS} />
          </g>
          <g className="fc-legs-b" style={{ animationDelay: delay }}>
            <Pixels rects={LEGS_B_RECTS} />
          </g>
        </g>
      </svg>
    </div>
  );
}

function Blocker({ delay }: { delay: string }) {
  return (
    <div className="field-char field-blocker">
      <svg viewBox="0 0 20 24">
        <g className="fc-run-cycle" style={{ animationDelay: delay }}>
          <Pixels rects={BODY_RECTS} />
          <Pixels rects={BLOCKER_ARMS} />
          <g className="fc-legs-a" style={{ animationDelay: delay }}>
            <Pixels rects={LEGS_A_RECTS} />
          </g>
          <g className="fc-legs-b" style={{ animationDelay: delay }}>
            <Pixels rects={LEGS_B_RECTS} />
          </g>
        </g>
      </svg>
    </div>
  );
}

function Defender({ delay }: { delay: string }) {
  return (
    <div className="field-char field-defender">
      <svg viewBox="0 0 16 24">
        <g className="fc-run-cycle" style={{ animationDelay: delay }}>
          <Pixels rects={DEFENDER_BODY_RECTS} />
          <Pixels rects={DEFENDER_ARMS} />
          <g className="fc-legs-a" style={{ animationDelay: delay }}>
            <Pixels rects={DEFENDER_LEGS_A_RECTS} />
          </g>
          <g className="fc-legs-b" style={{ animationDelay: delay }}>
            <Pixels rects={DEFENDER_LEGS_B_RECTS} />
          </g>
        </g>
      </svg>
    </div>
  );
}

// An endless running play, always moving behind the real page: two
// blockers escort the ball carrier, one defender trails, chasing but never
// catching up -- the formation just loops off the right edge and re-enters
// from the left, forever, never scoring.
export default function FieldScene() {
  return (
    <div className="field-scene" aria-hidden="true">
      <div className="field-formation">
        <Defender delay="0.05s" />
        <Blocker delay="0.18s" />
        <Runner delay="0s" />
        <Blocker delay="0.27s" />
      </div>
    </div>
  );
}
