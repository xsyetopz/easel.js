import { check } from "../_lib/oracle.ts";
import * as baseline from "./baseline.js";
import * as candidate from "./candidate.ts";

const C = "raycaster-thresholds";
for (const threshold of [1, 0.6, 0.4, 0.1]) {
  const three = JSON.stringify(baseline.hits(threshold));
  const easel = JSON.stringify(candidate.hits(threshold));
  check(C, `hits match at threshold ${threshold}`, three === easel,
    `three ${three}, easel ${easel}`);
}
