import { check } from "../_lib/oracle.ts";
import * as baseline from "./baseline.js";
import * as candidate from "./candidate.ts";

const C = "accessors";
const three = baseline.run();
const easel = candidate.run();
for (const key of ["hex", "hexString", "style", "index", "empty"] as const) {
  const a = String(three[key]);
  const b = String(easel[key]);
  check(C, `${key} matches`, a === b, `three ${a}, easel ${b}`);
}
