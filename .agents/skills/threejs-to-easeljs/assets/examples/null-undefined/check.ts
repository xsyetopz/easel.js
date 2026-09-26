import { Scene } from "@xsyetopz/easel";
import { check } from "../_lib/oracle.ts";
import * as baseline from "./baseline.js";
import * as candidate from "./candidate.ts";
import * as silent from "./silent.ts";

const C = "null-undefined";
const three = baseline.build();
const easel = candidate.build();
check(C, "root detection matches", three.roots.join() === easel.roots.join(),
  `three [${three.roots}], easel [${easel.roots}]`);
check(C, "cleared background reads as undefined",
  three.background === null && easel.background === undefined);

// silent.ts type-checks under TS 7 strict, yet never matches a root.
const naiveRoots = silent.findRoots(new Scene());
check(C, "naive `parent === null` finds no roots", naiveRoots.length === 0,
  `found [${naiveRoots}]`);
