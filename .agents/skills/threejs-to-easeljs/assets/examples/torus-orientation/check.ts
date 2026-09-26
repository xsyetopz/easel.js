import type { Geometry } from "@xsyetopz/easel";
import { check } from "../_lib/oracle.ts";
import * as baseline from "./baseline.js";
import * as candidate from "./candidate.ts";
import * as silent from "./silent.ts";

const C = "torus-orientation";
const three = baseline.torus();

function maxDiff(geometry: Geometry, name: string): number {
  const a = geometry.getAttribute(name)?.array ?? [];
  const b = three.attributes[name].array;
  let max = a.length === b.length ? 0 : Infinity;
  for (let i = 0; i < a.length; i++) {
    max = Math.max(max, Math.abs((a[i] ?? 0) - (b[i] ?? 0)));
  }
  return max;
}
function size(geometry: Geometry): string {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (box === undefined) return "none";
  return [box.max.x - box.min.x, box.max.y - box.min.y,
    box.max.z - box.min.z].map((v) => v.toFixed(1)).join("x");
}

const ported = candidate.torus();
for (const name of ["position", "normal"]) {
  const diff = maxDiff(ported, name);
  check(C, `${name} matches three after rotateX(PI / 2)`, diff < 1e-5,
    `max difference ${diff.toExponential(1)}`);
}
three.computeBoundingBox();
const tb = three.boundingBox;
const threeSize = tb === null ? "none" : [tb.max.x - tb.min.x,
  tb.max.y - tb.min.y, tb.max.z - tb.min.z].map((v) => v.toFixed(1))
  .join("x");
check(C, "naive torus lies in another plane",
  size(silent.torus()) !== threeSize,
  `three ${threeSize}, naive ${size(silent.torus())}`);
