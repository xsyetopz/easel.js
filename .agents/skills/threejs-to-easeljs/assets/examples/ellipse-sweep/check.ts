import { check } from "../_lib/oracle.ts";
import * as baseline from "./baseline.js";
import * as candidate from "./candidate.ts";
import * as silent from "./silent.ts";

const C = "ellipse-sweep";
const PI = Math.PI;
const cases: [string, number, number, boolean][] = [
  ["quarter, clockwise", 0, PI / 2, true],
  ["quarter, counter-clockwise", 0, PI / 2, false],
  ["end below start, counter-clockwise", 0, -PI / 2, false],
  ["full circle, clockwise", 0, 2 * PI, true],
  ["quarter, clockwise, start above end", PI, PI / 2, true],
];

function maxDiff(a: number[][], b: number[][]): number {
  if (a.length !== b.length) return Infinity;
  let max = 0;
  for (let i = 0; i < a.length; i++) {
    for (let k = 0; k < 2; k++) {
      max = Math.max(max, Math.abs((a[i]?.[k] ?? 0) - (b[i]?.[k] ?? 0)));
    }
  }
  return max;
}

const naiveWrong: string[] = [];
for (const [label, start, end, cw] of cases) {
  const three = baseline.points(start, end, cw);
  const diff = maxDiff(three, candidate.points(start, end, cw));
  check(C, `${label} matches three`, diff < 1e-6,
    `max difference ${diff.toExponential(1)}`);
  if (maxDiff(three, silent.points(start, end, cw)) > 1e-6) {
    naiveWrong.push(label);
  }
}
check(C, "naive verbatim arguments diverge in 3 of 5 cases",
  naiveWrong.length === 3, naiveWrong.join("; "));
