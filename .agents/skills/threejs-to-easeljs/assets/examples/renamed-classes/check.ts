import { check } from "../_lib/oracle.ts";
import * as baseline from "./baseline.js";
import * as candidate from "./candidate.ts";

const C = "renamed-classes";
const three = baseline.build();
const easel = candidate.build();
check(C, "world position matches", three.world.join() === easel.world.join(),
  `three ${three.world}, easel ${easel.world}`);

// Same role, different algorithm: three centres the sphere on the bounding
// box, EASEL on the vertex centroid. Both must still enclose every vertex.
function encloses(centre: number[], radius: number): boolean {
  const p = three.positions;
  for (let i = 0; i < p.length; i += 3) {
    const d = Math.hypot(
      (p[i] ?? 0) - (centre[0] ?? 0),
      (p[i + 1] ?? 0) - (centre[1] ?? 0),
      (p[i + 2] ?? 0) - (centre[2] ?? 0),
    );
    if (d > radius + 1e-9) return false;
  }
  return true;
}
check(C, "both bounding spheres enclose the vertices",
  encloses(three.centre, three.radius) && encloses(easel.centre, easel.radius));
check(C, "bounding sphere centre differs (box centre vs centroid)",
  three.centre.join() !== easel.centre.join(),
  `three ${three.centre} r=${three.radius.toFixed(4)}, ` +
    `easel ${easel.centre.map((v) => v.toFixed(4))} ` +
    `r=${easel.radius.toFixed(4)}`);
