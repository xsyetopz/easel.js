# Geometry and math: oriented boxes

Cards for shared names whose geometry or return values differ. Each
compiles unchanged, so only an oracle catches the difference. Runnable
sets live under `assets/examples/<card>/`; each is executed against
three.js r186 by `sh assets/examples/verify.sh`.

## Contents

- OBB ray miss

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
