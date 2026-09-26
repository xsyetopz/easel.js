# Geometry and math: torus, arcs, oriented boxes

Cards for shared names whose geometry or return values differ. Each
compiles unchanged, so only an oracle catches the difference. Runnable
sets live under `assets/examples/<card>/`; all three are executed against
three.js r186 by `sh assets/examples/verify.sh`.

## Contents

- Torus orientation
- Ellipse and arc sweep
- OBB ray miss

## Torus orientation

**Definition.** three.js `TorusGeometry` lies in the XY plane with its
hole along Z. EASEL `TorusGeometry(radius, tube, radialSegments,
tubularSegments, arc)` builds the same ring in the XZ plane, hole along Y
(`src/geometry/primitives/TorusGeometry.ts`). Rotating the EASEL
geometry by `PI / 2` about X reproduces three.js's positions and normals
exactly, in the same vertex order.

**Use when.**

- Porting any `TorusGeometry`, including rings, donuts and orbit markers
  that three.js code then rotates.

**Do not use when.**

- The three.js code already rotated the mesh by `-PI / 2` about X to lay
  the ring flat: EASEL's default is flat, so drop that rotation instead
  of adding one.
- `TorusKnotGeometry`: a different class; compare it separately.

**Example.**

```ts
import { TorusGeometry } from "@xsyetopz/easel";

export function torus(): TorusGeometry {
  const geometry = new TorusGeometry(1, 0.4, 12, 48);
  geometry.rotateX(Math.PI / 2); // three.js's XY plane
  return geometry;
}
```

Runnable: `assets/examples/torus-orientation/`.

**Cost removed.** A ring seen edge-on where three.js showed it face-on.
Local run: after the rotation, the largest position and normal
difference from three.js is below 1e-16; unrotated, the bounding box is
2.8 x 0.8 x 2.8 against three.js's 2.8 x 2.8 x 0.8.

**Verify.**

1. The verifier prints `PASS torus-orientation: position matches three
   after rotateX(PI / 2)` and the matching `normal` line.

## Ellipse and arc sweep

**Definition.** three.js `EllipseCurve.getPoint` normalizes
`end - start` into 0..2PI, then, when `clockwise`, subtracts 2PI and
sweeps the other way from `startAngle`
(`src/extras/curves/EllipseCurve.js`). EASEL interpolates
`start + t * (end - start)` with no normalization, and with `clockwise`
walks the same span from `endAngle` back to `startAngle`
(`src/curves/curves/EllipseCurve.ts`). `ArcCurve`, `Path.arc`,
`Path.absarc`, `Path.ellipse` and `Path.absellipse` all build an
`EllipseCurve`, so they inherit the difference. The default port:
compute three.js's signed sweep once and pass a counter-clockwise span.

**Use when.**

- Porting any arc or ellipse with `clockwise: true`, or with
  `endAngle < startAngle`, or with a span above 2PI.

**Do not use when.**

- The arc is counter-clockwise with `0 <= end - start <= 2PI`: both
  libraries agree, and the verbatim arguments are correct.

**Example.**

```ts
import { Path } from "@xsyetopz/easel";

// three.js EllipseCurve sweep: normalized, negative when clockwise.
export function threeSweep(start: number, end: number,
  clockwise: boolean): number {
  const twoPi = Math.PI * 2;
  let delta = end - start;
  const samePoints = Math.abs(delta) < Number.EPSILON;
  while (delta < 0) delta += twoPi;
  while (delta > twoPi) delta -= twoPi;
  if (delta < Number.EPSILON) delta = samePoints ? 0 : twoPi;
  if (clockwise && !samePoints) {
    delta = delta === twoPi ? -twoPi : delta - twoPi;
  }
  return delta;
}

// three.js: new Path().absarc(0, 0, 1, start, end, clockwise)
export function arc(start: number, end: number, clockwise: boolean) {
  const sweep = threeSweep(start, end, clockwise);
  return new Path().absarc(0, 0, 1, start, start + sweep, false);
}
```

Runnable: `assets/examples/ellipse-sweep/`.

**Cost removed.** Arcs that bend the wrong way or cover the wrong part
of the circle, which shows up as broken shape outlines and extrusions.
Local run over nine samples per arc: the port matches three.js within
5e-16 in all five cases; the verbatim arguments diverge for a clockwise
quarter (0 to PI/2: EASEL draws the 90-degree arc, three.js the
270-degree one), a counter-clockwise arc with `end < start`, and a
clockwise arc with `start > end` (reversed direction).

**Verify.**

1. The verifier prints five `PASS ellipse-sweep: ... matches three` lines
   and `naive verbatim arguments diverge in 3 of 5 cases`.

## OBB ray miss

**Definition.** EASEL `OBB` is a core export (three.js imports it from
`three/addons/math/OBB.js`). `obb.intersectRay(ray, target?)` returns the
hit point or `undefined` on a miss (`src/math/OBB.ts`); three.js returns
`null`. `obb.intersectsRay(ray)` returns a boolean in both.

**Use when.**

- Porting any `intersectRay` result test on an `OBB`.

**Do not use when.**

- Only a yes/no answer is needed: call `intersectsRay` and skip the
  point.

**Example.**

```ts
import { OBB, Ray, Vector3 } from "@xsyetopz/easel";

export function hitPoint(origin: [number, number, number]) {
  const box = new OBB(new Vector3(), new Vector3(1, 1, 1));
  const ray = new Ray(new Vector3(...origin), new Vector3(0, 0, -1));
  const hit = box.intersectRay(ray, new Vector3());
  return hit !== undefined ? hit.toArray() : "miss"; // not !== null
}
```

Runnable: `assets/examples/obb-miss/`.

**Cost removed.** A miss treated as a hit: `intersectRay(...) !== null`
type-checks and is always `true`. Dereferencing after that test fails
with `TS18048` under `strict`. The oracle matches three.js for a hit
(`[0,0,1]`) and a miss.

**Verify.**

1. The verifier prints two `PASS obb-miss: result matches` lines and
   `naive !== null reports a miss as a hit (true)`.
1. `rg -n 'intersectRay\(.*\) *[!=]== *null' <ported files>` returns
   nothing.
