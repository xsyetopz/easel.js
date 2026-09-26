import { check, near, thrown } from "../_lib/oracle.ts";
import * as baseline from "./baseline.js";
import * as candidate from "./candidate.ts";
import * as silent from "./silent.ts";

const C = "animator";
const times = [0.25, 0.5, 1.25];
const three: number[][] = baseline.sample(times);
const easel = candidate.sample(times);
const same = three.every((p, i) =>
  p.every((v, j) => near(v, easel[i]?.[j] ?? NaN, 1e-6)));
check(C, "sampled positions match", same,
  `three ${JSON.stringify(three)}, easel ${JSON.stringify(easel)}`);

const error = thrown(() => silent.play());
check(C, "naive '.position' path throws", error === "SyntaxError", error);
