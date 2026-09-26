import { check } from "../_lib/oracle.ts";
import * as baseline from "./baseline.js";
import * as candidate from "./candidate.ts";
import * as silent from "./silent.ts";

const C = "attributes";
const three = baseline.run();
const easel = candidate.run();
for (const key of ["names", "count", "x1", "indexType"] as const) {
  const a = String(three[key]);
  const b = String(easel[key]);
  check(C, `${key} matches`, a === b, `three ${a}, easel ${b}`);
}
check(C, "naive Object.keys over the Map finds nothing",
  silent.names().length === 0, `[${silent.names()}]`);
check(C, "a plain array becomes Float32Array, not Uint8Array",
  silent.colorType() === "Float32Array", silent.colorType());
