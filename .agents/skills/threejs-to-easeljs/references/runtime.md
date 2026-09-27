# Runtime: timing, animation, loading, per-frame helpers, r186 additions

Cards for code that runs every frame or on load. Runnable pairs live
under `assets/examples/<card>/`.

## Contents

- Timer deltas
- Animator and binding paths
- TextureLoader results
- r186 intersectsFrustum and dispose

## Timer deltas

**Definition.** three.js `Clock` is deprecated since r183
(`node_modules/three/src/core/Clock.js`); its successor `THREE.Timer`
has `update(timestamp)` and `getDelta()`. EASEL `Timer`
(`src/core/Timer.ts`) has `update(timestamp?)` returning `this` and read-only
`delta` and `elapsedTime` accessors in seconds, plus a `timeScale`
accessor. `delta` changes only when `update` runs.

**Use when.**

- Porting `new Clock()`, `clock.getDelta()`, `clock.getElapsedTime()`,
  or `THREE.Timer`.

**Do not use when.**

- Reading `timer.delta` without calling `update` first; it stays 0.

**Example.**

```ts
import { Timer } from "@xsyetopz/easel";

const timer = new Timer();
function frame(time: number): void {
  const dt = timer.update(time).delta; // seconds
  step(dt);
  requestAnimationFrame(frame);
}
declare function step(dt: number): void;
```

Runnable: `assets/examples/timer/`. The first delta depends on construction
time in both libraries, so the oracle compares from the second update.

**Cost removed.** `TS2305` on `Clock`, `TS2339` on `getDelta`, and a
frozen simulation from reading `delta` without `update`.

**Verify.**

1. The verifier prints `PASS timer: deltas match in seconds` and `naive
   delta without update stays 0`.

## Animator and binding paths

**Definition.** `AnimationMixer` -> `Animator(root)`, with `clipAction`,
`update(delta)`. Tracks drop `Keyframe`: `VectorKeyframeTrack` ->
`VectorTrack`, likewise `Number`, `Quaternion`, `Color`, `Boolean`,
`String`. `THREE.LoopRepeat` -> `Loop.Repeat`. EASEL binding paths reject
empty segments (`src/animation/_bindingPathHelpers.ts`), so three.js's
root-relative `".position"` throws `SyntaxError`; use `"position"` or
`"NodeName.position"`.

**Use when.**

- Porting mixers, clips, or tracks.

**Do not use when.**

- The clip comes from `GLTFLoader`: EASEL's `GLTFLoaderResult.animations`
  holds decoded channel records (`src/loaders/GLTFLoader.ts`), not
  `AnimationClip`s; build tracks from them first.
- The track animates morph targets. EASEL has no morph targets:
  `GLTFLoader` does not read a primitive's `targets`, and the renderer
  ignores `morphTargetInfluences` (local run: influence 1 on a target
  that moves a quad 5 units still drew it in place). Record the clip as
  `unsupported` or bake the poses into separate geometries.

**Example.**

```ts
import {
  AnimationClip, Animator, Loop, Node, VectorTrack,
} from "@xsyetopz/easel";

const box = new Node();
const track = new VectorTrack("position", [0, 1], [0, 0, 0, 2, 4, 0]);
const clip = new AnimationClip("move", -1, [track]);
const animator = new Animator(box);
animator.clipAction(clip).setLoop(Loop.Repeat, Infinity).play();
animator.update(0.25);
```

Runnable: `assets/examples/animator/`.

**Cost removed.** `TS2305` on mixer and track names; a run-time
`SyntaxError` from `".position"` that type-checks. The oracle samples
positions at 0.25, 0.5 and 1.25 s and matches three.js exactly.

**Verify.**

1. The verifier prints `PASS animator: sampled positions match` and
   `naive '.position' path throws (SyntaxError)`.

## TextureLoader results

**Definition.** EASEL `TextureLoader.load(url, onLoad?, onProgress?,
onError?)` returns `void`; the texture arrives in `onLoad`. It fetches with
`createImageBitmap` through `ImageBitmapLoader`. `loadAsync(url)` is typed
`Promise<unknown>` (`src/loaders/Loader.ts`). three.js returns the
`Texture` synchronously and fills it later.

**Use when.**

- Porting `new TextureLoader().load(url)` whose return value is used.

**Do not use when.**

- The asset is larger than 128 x 128 and its detail matters; see
  [texture size](rendering.md#texture-size-and-pixel-format).

**Example.**

```ts
import { LambertMaterial, Texture, TextureLoader } from "@xsyetopz/easel";

export async function woodMaterial(url: string): Promise<LambertMaterial> {
  const loaded = await new TextureLoader().loadAsync(url);
  if (!(loaded instanceof Texture)) throw new TypeError(`${url}: no image`);
  return new LambertMaterial({ map: loaded });
}
```

Runnable: `assets/examples/texture-loader/`. Tier: type-checked only; bun
has no `createImageBitmap`, so loading is not executed. Run it in a browser.

**Cost removed.** `TS2322` (`void` is not a `Texture`) and materials that
stay untextured.

**Verify.**

1. The verifier's naive pass rejects `texture-loader/naive.ts:5` with
   `TS2322`.
1. In a browser, the material's `map` is a `Texture` after the promise
   resolves.

## r186 intersectsFrustum and dispose

**Definition.** r186 added `intersectsFrustum(frustum)` to `Object3D`,
`Mesh`, `Line`, `Points` and `Sprite` (Mesh calls
`frustum.intersectsObject(this)`), and `Object3D.dispose()`, which only
dispatches a `dispose` event (`node_modules/three/src/core/Object3D.js`).
EASEL 0.8.0 has neither (`>` rows for `Node.intersectsFrustum`,
`Node.dispose`, `Mesh.intersectsFrustum`), nor `Frustum.intersectsObject`.
It has `Frustum.intersectsSphere`, `Geometry.computeBoundingSphere`,
`Sphere.applyMatrix4`, and `dispose()` on `Geometry` and `Material`.
Other r186 additions without EASEL rows: `LightShadow`, `Plane.toJSON`,
`Plane.fromJSON`, `TextureSource`, `AnimationUtils.hasTangents`,
`Material.retroreflectivity`.

**Use when.**

- Ported code calls `intersectsFrustum` or `dispose()` on a node.

**Do not use when.**

- The goal is only to skip drawing: `Renderer.render` does its own
  traversal; add this for application logic such as visibility lists.

**Example.**

```ts
import { type Frustum, type Mesh, Sphere } from "@xsyetopz/easel";

export function intersectsFrustum(mesh: Mesh, frustum: Frustum): boolean {
  const geometry = mesh.geometry;
  if (geometry === undefined) return false;
  if (geometry.boundingSphere === undefined) geometry.computeBoundingSphere();
  const local = geometry.boundingSphere;
  if (local === undefined) return false;
  const world = new Sphere(local.center.clone(), local.radius);
  return frustum.intersectsSphere(world.applyMatrix4(mesh.matrixWorld));
}

export function disposeMesh(mesh: Mesh): void {
  mesh.geometry?.dispose();
  mesh.material?.dispose();
  mesh.dispatchEvent({ type: "dispose" });
}
```

The world matrix must be current (`renderer.prepare` or
`updateMatrixWorld(false, true, true)`). EASEL's bounding sphere is
centroid-based ([renamed classes](api-shape.md#renamed-classes)), so
results near the frustum edge can differ from three.js; the oracle's
positions agree.

Runnable: `assets/examples/frustum-dispose/`.

**Cost removed.** `TS2339` on both methods. The oracle compares visibility
at x = 0, 4, 4.9, 6, 30, -30 with three r186 and counts one `dispose`
event on each side.

**Verify.**

1. The verifier prints `PASS frustum-dispose: visibility matches three
   r186 intersectsFrustum`.
