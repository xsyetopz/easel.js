import { check, near } from "../_lib/oracle.ts";
import * as baseline from "./baseline.js";
import * as candidate from "./candidate.ts";
import * as silent from "./silent.ts";

// The first delta depends on construction time in both libraries; compare
// from the second update on.
const C = "timer";
const stamps = [1000, 1016, 1050, 1100];
const three = baseline.deltas(stamps).slice(1);
const easel = candidate.deltas(stamps).slice(1);
check(C, "deltas match in seconds",
  three.every((d: number, i: number) => near(d, easel[i] ?? NaN, 1e-9)),
  `three ${three}, easel ${easel}`);
const naive = silent.deltas(stamps);
check(C, "naive delta without update stays 0", naive.every((d) => d === 0));
