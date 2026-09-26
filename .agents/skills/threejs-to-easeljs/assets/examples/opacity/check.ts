import { BasicMaterial } from "@xsyetopz/easel";
import { centreRed } from "../_lib/capture.ts";
import { check, thrown } from "../_lib/oracle.ts";
import * as baseline from "./baseline.js";
import * as candidate from "./candidate.ts";
import * as silent from "./silent.ts";

const C = "opacity";

// three.js blends white over a grey background in the sRGB-encoded canvas:
// out = alpha * 255 + (1 - alpha) * background.
function threeRed(alpha: number, background: number): number {
  return Math.round(alpha * 255 + (1 - alpha) * background);
}

function easelRed(level: number, background: number): number {
  const material = new BasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: level,
  });
  return centreRed(material, background);
}

const alpha = baseline.glassPanel().opacity;
const level = candidate.glassPanel().opacity;
check(C, "weight-preserving level for alpha 0.35", level === 5, `${level}`);

for (const background of [0, 128]) {
  const target = threeRed(alpha, background);
  let best = 0;
  for (let l = 1; l <= 8; l++) {
    const error = Math.abs(easelRed(l, background) - target);
    if (error < Math.abs(easelRed(best, background) - target)) best = l;
  }
  const got = easelRed(level, background);
  check(C, `level within one step of pixel-best over ${background}`,
    Math.abs(best - level) <= 1,
    `three ${target}, level ${level} -> ${got}, best level ${best} -> ` +
      `${easelRed(best, background)}`);
}

const solidRed = centreRed(candidate.solidPanel());
check(C, "opaque three material stays opaque", solidRed === 255,
  `easel ${solidRed}`);

const naiveError = thrown(() => silent.glassPanel());
check(C, "naive alpha 0.35 throws", naiveError === "RangeError", naiveError);

const naiveSolid = centreRed(silent.solidPanel());
check(C, "naive opacity 1 is no longer opaque", naiveSolid < 255,
  `easel ${naiveSolid}`);
