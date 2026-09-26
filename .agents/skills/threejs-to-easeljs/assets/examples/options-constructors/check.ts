import { check, near } from "../_lib/oracle.ts";
import * as baseline from "./baseline.js";
import * as candidate from "./candidate.ts";
import * as silent from "./silent.ts";

const C = "options-constructors";
const three = baseline.run();
const easel = candidate.run();

// EASEL stores matrices in Float32Array; compare to float32 precision.
function same(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => near(v, b[i] ?? NaN, 1e-6));
}
check(C, "perspective projection matches", same(three.perspective,
  easel.perspective));
check(C, "orthographic projection matches", same(three.ortho, easel.ortho));
check(C, "fog colour, near, far match", three.fog.join() === easel.fog.join(),
  `three ${three.fog}, easel ${easel.fog}`);
check(C, "default fov differs", three.defaultFov !== easel.defaultFov,
  `three ${three.defaultFov}, easel ${easel.defaultFov}`);
check(C, "naive port without fov projects differently",
  !same(three.perspective, silent.projection()));
