"use client";

import { useEffect, useState } from "react";

// Simple pixel-rect sprite format: [x, y, w, h] on a small grid, one array
// per color. Two runner leg poses (mirrored) give a 2-frame run cycle when
// swapped via CSS steps(); a third handles the hurdle jump.
const GOLD = "#ffd23f";
const JERSEY = "#2ee4ff";
const DARK = "#000000";
const PANTS = "#f6f1ff";
const SHOE = "#000000";
const FLAG_JERSEY = "#ff3d5e";

type Rects = [number, number, number, number][];

const runnerHead: Rects = [
  [3, 0, 4, 2], // helmet
];
const runnerFacemask: Rects = [[3, 2, 4, 1]];
const runnerJersey: Rects = [
  [2, 3, 6, 1],
  [2, 4, 6, 4],
];
const runnerPants: Rects = [[2, 8, 6, 2]];

// Pose A: right leg forward / left leg trailing back
const runnerLegsA: Rects = [
  [2, 10, 2, 2], // trailing leg (bent up)
  [1, 12, 2, 1], // trailing shoe
  [6, 10, 2, 3], // forward leg (extended)
  [6, 13, 3, 1], // forward shoe
];
const runnerArmsA: Rects = [
  [1, 4, 1, 3], // trailing arm
  [8, 5, 1, 2], // forward arm
];

// Pose B: mirror of A (opposite leg forward) for the run cycle
const runnerLegsB: Rects = [
  [6, 10, 2, 2],
  [6, 12, 2, 1],
  [2, 10, 2, 3],
  [1, 13, 3, 1],
];
const runnerArmsB: Rects = [
  [8, 4, 1, 3],
  [1, 5, 1, 2],
];

// Defender: braced, both feet planted, arms out
const defenderHead: Rects = [[3, 0, 4, 2]];
const defenderFacemask: Rects = [[3, 2, 4, 1]];
const defenderJersey: Rects = [
  [2, 3, 6, 1],
  [1, 4, 8, 4],
];
const defenderArms: Rects = [
  [0, 5, 1, 2],
  [9, 5, 1, 2],
];
const defenderPants: Rects = [[2, 8, 6, 2]];
const defenderLegs: Rects = [
  [2, 10, 2, 4],
  [1, 13, 3, 1],
  [6, 10, 2, 4],
  [6, 13, 3, 1],
];

function Pixels({ rects, color }: { rects: Rects; color: string }) {
  return (
    <>
      {rects.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={color} />
      ))}
    </>
  );
}

export default function PixelMascot() {
  const [jumping, setJumping] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    function onClick() {
      setJumping(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setJumping(false), 700);
    }
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("click", onClick);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className={`mascot-stage${jumping ? " jumping" : ""}`} aria-hidden="true">
      <svg width="132" height="72" viewBox="0 0 44 24">
        {/* ground/yard-line the pair stands on */}
        <rect x="0" y="22" width="44" height="1" fill="#3a2a5c" />
        {/* defender, standing further right */}
        <g transform="translate(28, 8) scale(0.9)">
          <Pixels rects={defenderHead} color={GOLD} />
          <Pixels rects={defenderFacemask} color={DARK} />
          <Pixels rects={defenderJersey} color={FLAG_JERSEY} />
          <Pixels rects={defenderArms} color={FLAG_JERSEY} />
          <Pixels rects={defenderPants} color={PANTS} />
          <Pixels rects={defenderLegs} color={SHOE} />
        </g>
        {/* runner */}
        <g className="mascot-runner" transform="translate(2, 8) scale(0.9)">
          <Pixels rects={runnerHead} color={GOLD} />
          <Pixels rects={runnerFacemask} color={DARK} />
          <Pixels rects={runnerJersey} color={JERSEY} />
          <g className="mascot-legs-a">
            <Pixels rects={runnerArmsA} color={JERSEY} />
            <Pixels rects={runnerPants} color={PANTS} />
            <Pixels rects={runnerLegsA} color={SHOE} />
          </g>
          <g className="mascot-legs-b">
            <Pixels rects={runnerArmsB} color={JERSEY} />
            <Pixels rects={runnerPants} color={PANTS} />
            <Pixels rects={runnerLegsB} color={SHOE} />
          </g>
        </g>
      </svg>
    </div>
  );
}
