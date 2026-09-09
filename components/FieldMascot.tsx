"use client";

import { useEffect, useState } from "react";

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

// Higher-detail pixel sprite: helmet w/ facemask + skin, shaded jersey,
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
// are PALETTE keys, resolved below.
const STIFF_ARM_AND_BALL_KEYED: Rect[] = [
  [13, 7, 2, 2, "J"],
  [15, 8, 3, 2, "J"],
  [17, 9, 3, 2, "S"],
  [1, 9, 2, 2, "J"],
  [2, 11, 2, 2, "J"],
  [0, 11, 3, 2, "F"],
  [1, 12, 1, 1, "W"],
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

// arms reach forward (toward low-x) in a tackle brace. Colors are
// DEFENDER_PALETTE keys, resolved below.
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

export default function FieldMascot() {
  const [jumping, setJumping] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    function onClick() {
      setJumping(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setJumping(false), 850);
    }
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("click", onClick);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className={`mascot-stage${jumping ? " jumping" : ""}`} aria-hidden="true">
      <div className="mascot-runner-dock">
        <svg viewBox="0 0 20 24">
          <g className="mascot-runner">
            <Pixels rects={BODY_RECTS} />
            <Pixels rects={STIFF_ARM_AND_BALL} />
            <g className="mascot-legs-a">
              <Pixels rects={LEGS_A_RECTS} />
            </g>
            <g className="mascot-legs-b">
              <Pixels rects={LEGS_B_RECTS} />
            </g>
          </g>
        </svg>
      </div>
      <div className="mascot-defender-dock">
        <svg viewBox="0 0 16 18">
          <g className="mascot-defender">
            <Pixels rects={DEFENDER_BODY_RECTS} />
            <Pixels rects={DEFENDER_ARMS} />
          </g>
        </svg>
      </div>
    </div>
  );
}
