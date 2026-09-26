import { check } from "../_lib/oracle.ts";
import * as baseline from "./baseline.js";
import * as candidate from "./candidate.ts";
import * as silent from "./silent.ts";

const C = "obb-miss";
for (const origin of [[0, 0, 5], [5, 5, 5]] as [number, number, number][]) {
  const three = JSON.stringify(baseline.hitPoint(origin));
  const easel = JSON.stringify(candidate.hitPoint(origin));
  check(C, `result matches from ${origin}`, three === easel,
    `three ${three}, easel ${easel}`);
}
check(C, "naive !== null reports a miss as a hit",
  silent.blocks([5, 5, 5]), `${silent.blocks([5, 5, 5])}`);
