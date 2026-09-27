# API shape: names, accessors, statics, absence, constructors

Cards for the mechanical differences between three.js r186 (`three@0.186.1`)
and EASEL 0.8. The naming and style rules come from `CONTRIBUTING.md`
("Three.js API parity"). Every card has a runnable pair under
`assets/examples/<card>/`: `baseline.js` (three.js), `candidate.ts` (EASEL),
`naive.ts` (the careless port, with the compiler errors it must raise), and,
where the naive port compiles, `silent.ts` plus a `check.ts` oracle.

## Contents

- Renamed classes
- Material class names
- Accessors replace getX and setX
- Attributes and the attribute map
- Raycaster thresholds
- Statics become standalone exports
- Undefined replaces null
- Options objects replace positional constructors
- Constant objects replace THREE constants
- updateMatrixWorld argument order

## Renamed classes

**Definition.** EASEL renames three.js classes whose names refer to GPU
concepts: `Object3D` -> `Node`, `BufferGeometry` -> `Geometry`,
`BufferAttribute` -> `Attribute`, `InterleavedBuffer` -> `InterleavedData`,
`InterleavedBufferAttribute` -> `InterleavedAttribute`, `Clock` -> `Timer`,
`AnimationMixer` -> `Animator`, `AnimationObjectGroup` -> `AnimationGroup`,
`KeyframeTrack` -> `Track`, `PropertyBinding` -> `Binding`,
`AudioAnalyser` -> `AudioAnalyzer`. The map is `THREE_TO_EASEL_CLASS` in
`scripts/api-comparison/compare.ts`; `scripts/parity.py` applies it.

**Use when.**

- A ported file imports any name on the left.

**Do not use when.**

- The class name is shared (`Mesh`, `Scene`, `Group`, `Vector3`). Shared
  names can still differ in shape; look them up with `scripts/parity.py`.
- Treating a rename as proof of identical algorithms. Measured here:
  `Geometry.computeBoundingSphere` centres the sphere on the vertex
  centroid, three.js on the bounding-box centre. For the triangle
  (0,0,0),(2,0,0),(0,2,0) three.js gives centre (1,1,0), radius 1.4142;
  EASEL gives (0.6667,0.6667,0), radius 1.4907. Both enclose the vertices.

**Example.**

```ts
import { Attribute, Geometry, Node } from "@xsyetopz/easel";

const pivot = new Node();
const geometry = new Geometry();
geometry.setAttribute(
  "position",
  new Attribute(new Float32Array([0, 0, 0, 2, 0, 0, 0, 2, 0]), 3),
);
```

Runnable: `assets/examples/renamed-classes/`.

**Cost removed.** `TS2305 Module has no exported member 'Object3D'` on
every renamed import, and wrong assumptions about derived data. Instrument:
the verifier's naive pass and the world-position and bounding-sphere
oracle.

**Verify.**

1. `sh assets/examples/verify.sh` prints `PASS renamed-classes: world
   position matches` and the bounding-sphere difference line.
1. `bun run typecheck` in the consumer shows no `TS2305` for these names.

## Material class names

**Definition.** EASEL drops the `Mesh` prefix and renames line materials:
`MeshBasicMaterial` -> `BasicMaterial`, `MeshLambertMaterial` ->
`LambertMaterial`, `MeshToonMaterial` -> `ToonMaterial`,
`LineBasicMaterial` -> `LineMaterial`, `LineDashedMaterial` ->
`DashedLineMaterial`. `PointsMaterial` and `SpriteMaterial` keep their names.
EASEL materials, `PointsMaterial` included, default `vertexColors` to
`true` (`src/materials/Material.ts`); three.js defaults it to `false`.
Meshes, lines and points all read the geometry's `color` attribute when
it is on.

**Use when.**

- Porting any `Mesh*Material` or `Line*Material` that EASEL has.
- The geometry carries a `color` attribute: set `vertexColors: false`
  unless the three.js source set it to `true`. Point clouds are the
  common case: a three.js cloud with per-point colours and the default
  material renders in one colour there and multicoloured here.

**Do not use when.**

- The source uses Standard, Physical, Phong, Matcap, Normal, Depth,
  Distance, Shadow, Shader, RawShader or node materials; see
  [PBR, shadows, shaders](rendering.md#pbr-shadows-and-shaders).

**Example.**

```ts
import { BasicMaterial, LineMaterial, PointsMaterial } from "@xsyetopz/easel";

const surface = new BasicMaterial({ color: 0xffffff, vertexColors: false });
const outline = new LineMaterial({ color: 0xff0000 });
const cloud = new PointsMaterial({ color: 0xffffff, vertexColors: false });
```

Runnable: `assets/examples/material-classes/`.

**Cost removed.** `TS2724` on the old names, and a silent colour change:
with red vertex colours and a white material the naive port renders
`255,0,0` where three.js renders white (local run, verifier output); a
point with a red `color` attribute renders `255,0,0` instead of white.

**Verify.**

1. The verifier prints `PASS material-classes: naive port multiplies the
   colour attribute (255,0,0)`, `naive points take the per-point colour`,
   and both white `vertexColors false` lines.

## Accessors replace getX and setX

**Definition.** EASEL exposes `get x()`/`set x()` accessors where three.js
has a parameterless `getX()` or a `setX(value)` pair; the policy script
`scripts/check-modern-api.ts` rejects the method forms. Examples:
`color.getHex()` -> `color.hex`, `color.setHex(v)` -> `color.hex = v`,
`color.getHexString()` -> `color.hexString`, `color.getStyle()` ->
`color.style`, `geometry.setIndex(a)` -> `geometry.index = a`,
`geometry.getIndex()` -> `geometry.index` (a typed array, not a
`BufferAttribute`), `timer.getDelta()` -> `timer.delta`. Boolean queries
follow the same rule: `box.isEmpty()` -> `box.isEmpty` (`Box3`, a getter).

**Use when.**

- A three.js call starts with `get` and takes no arguments, or starts with
  `set` and takes one. `scripts/parity.py Color.getHex` shows the folded
  row.

**Do not use when.**

- The method takes arguments beyond the value (`getWorldPosition(target)`,
  `setRGB(r, g, b)`, `setHSL`); those stay methods. `Color.getHex`,
  `setHex`, `getStyle` and `setStyle` take an optional `colorSpace`, so
  EASEL 0.8 keeps them as methods beside the `hex` and `style` accessors.
  Check the row.

**Example.**

```ts
import { Box3, BoxGeometry, Color } from "@xsyetopz/easel";

const color = new Color();
color.hex = 0x3366cc;
const label = color.hexString; // "3366cc"
const geometry = new BoxGeometry(1, 1, 1);
geometry.index = [0, 1, 2, 2, 1, 3];
const empty = new Box3().isEmpty; // three.js: isEmpty()
```

Runnable: `assets/examples/accessors/`.

**Cost removed.** `TS2551` ("did you mean 'hexString'?") on `getHexString()`, `TS2339` on `setIndex`/`getIndex`, and `TS6234`
("not callable because it is a 'get' accessor") on `isEmpty()`. In plain
JavaScript the call would throw `TypeError`, and a bare `box.isEmpty`
copied back to three.js is a function, always truthy. The oracle shows
`hex`, `hexString`, `style`, index values and `isEmpty` equal to
three.js.

**Verify.**

1. The verifier prints five `PASS accessors: ... matches` lines and
   rejects `accessors/naive.ts:9` with `TS6234`.

## Attributes and the attribute map

**Definition.** EASEL has one `Attribute(array, itemSize, normalized?)`
class; the typed subclasses (`Float32BufferAttribute`,
`Uint16BufferAttribute`, ...) do not exist. A plain `number[]` is copied
into a `Float32Array` (`src/geometry/Attribute.ts`), so pass the typed
array explicitly. `geometry.attributes` is a `Map<string, Attribute>`,
not an object: read with `getAttribute(name)`, list with
`attributes.keys()`. `getX(i)`, `setXYZ(...)`, `count` and `needsUpdate`
keep their three.js shape.

**Use when.**

- Porting any `*BufferAttribute` constructor, `geometry.attributes.name`,
  or `Object.keys`/`for...in` over `geometry.attributes`.

**Do not use when.**

- The attribute is the index: assign a typed array to `geometry.index`
  (see [accessors](#accessors-replace-getx-and-setx)).

**Example.**

```ts
import { Attribute, Geometry } from "@xsyetopz/easel";

const geometry = new Geometry();
// three.js: new THREE.Float32BufferAttribute([...], 3)
geometry.setAttribute("position", new Attribute(
  new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3));
// three.js: geometry.setIndex(new THREE.Uint16BufferAttribute([...], 1))
geometry.index = new Uint16Array([0, 1, 2]);
const position = geometry.getAttribute("position"); // not .attributes.position
const names = [...geometry.attributes.keys()]; // not Object.keys(...)
```

Runnable: `assets/examples/attributes/`.

**Cost removed.** `TS2305` on `Float32BufferAttribute`, `TS2339` on
`attributes.position`, and two silent faults the compiler misses:
`Object.keys(geometry.attributes)` returns `[]`, and
`new Attribute([255, 0, 0], 3, true)` stores a `Float32Array`, not the
`Uint8Array` a three.js `Uint8BufferAttribute` had. The oracle matches
attribute names, `count`, `getX(1)` and the index array type with
three.js.

**Verify.**

1. The verifier prints four `PASS attributes: ... matches` lines and both
   naive lines.
1. `rg -n 'BufferAttribute|\.attributes\.' <ported files>` returns
   nothing.

## Raycaster thresholds

**Definition.** EASEL `Raycaster` has no `params` object. The three.js
`params.Points.threshold` is the `pointsThreshold` accessor and
`params.Line.threshold` is `lineThreshold`, both world units defaulting
to 1 (`src/core/Raycaster.ts`). `params.Mesh`, `params.LOD` and
`params.Sprite` carry no settings in three.js r186 and have no EASEL
counterpart.

**Use when.**

- Porting picking code that tunes point or line hit tolerance.

**Do not use when.**

- The threshold is in pixels in your head: both libraries measure it in
  world units along the ray, so scale it with camera distance yourself.

**Example.**

```ts
import { Raycaster } from "@xsyetopz/easel";

const raycaster = new Raycaster();
raycaster.pointsThreshold = 0.1; // three: params.Points.threshold
raycaster.lineThreshold = 0.1; // three: params.Line.threshold
```

Runnable: `assets/examples/raycaster-thresholds/`.

**Cost removed.** `TS2339` on `params` (a run-time `TypeError` in
JavaScript). The oracle casts one ray past a point and a line 0.5 units
away and matches three.js hit counts at thresholds 1, 0.6, 0.4 and 0.1.

**Verify.**

1. The verifier prints four `PASS raycaster-thresholds: hits match`
   lines.

## Statics become standalone exports

**Definition.** EASEL has no static class members (`CONTRIBUTING.md`).
three.js statics are exported functions or constants:
`AnimationClip.findByName` -> `findByName`, `AnimationClip.parse` ->
`parse` or `animationClipFromJson`, `AnimationClip.toJSON(clip)` ->
`animationClipToJSON(clip)`, `Object3D.DEFAULT_UP` -> `DEFAULT_UP`,
`PropertyBinding.sanitizeNodeName` -> `sanitizeBindingNodeName`. Results
use `undefined` for "not found" where three.js returns `null`.

**Use when.**

- Code calls `ClassName.member` on a class. `scripts/parity.py
  AnimationClip.findByName` prints the static row and the EASEL function.

**Do not use when.**

- The ledger has no standalone export for the member; then it is absent.
  Serialized formats may also differ: EASEL clip JSON adds `itemSize`,
  `interpolation`, `endingStart`, `endingEnd` to each track.

**Example.**

```ts
import { AnimationClip, DEFAULT_UP, findByName } from "@xsyetopz/easel";

declare const clips: AnimationClip[];
const walk = findByName(clips, "Walk");
if (walk === undefined) throw new Error("clip Walk missing");
const up = DEFAULT_UP.clone();
```

Runnable: `assets/examples/statics/`.

**Cost removed.** `TS2339` on the static call; a `=== null` check on the
result that never fires.

**Verify.**

1. The verifier prints `PASS statics: missing clip: three null, EASEL
   undefined`.

## Undefined replaces null

**Definition.** EASEL uses `undefined` for absence: `Node.parent`,
`Scene.background`, `Scene.fog`, `BasicMaterial.map`,
`Mesh.geometry`/`material`, `Geometry.boundingSphere`, lookup results.
three.js uses `null`. Only DOM returns such as `getContext` keep `null`.

**Use when.**

- Porting any `= null` assignment or `=== null`/`!== null` test on EASEL
  values.

**Do not use when.**

- The value comes from a DOM API or from three.js data you are converting.

**Example.**

```ts
import type { Node } from "@xsyetopz/easel";

export function findRoots(scene: Node): string[] {
  const roots: string[] = [];
  scene.traverse((node) => {
    if (node.parent === undefined) roots.push(node.name);
  });
  return roots;
}
```

Runnable: `assets/examples/null-undefined/`.

**Cost removed.** Assignments of `null` fail with `TS2322`, but
`node.parent === null` compiles under TypeScript 7 strict and is always
false: the oracle shows the naive root finder returns `[]` where three.js
returns `[scene]`.

**Verify.**

1. `rg -n '(=|!)== null|= null' <ported files>` returns only DOM cases.
1. The verifier prints `PASS null-undefined: naive \`parent === null\`
   finds no roots`.

## Options objects replace positional constructors

**Definition.** EASEL cameras and `Fog` take one options object:
`new PerspectiveCamera({ fov, aspect, near, far, zoom?, tileSize? })`,
`new OrthographicCamera({ left, right, top, bottom, near, far })`,
`new Fog({ color, near, far })`. `FogExp2(color, density, far)` stays
positional with an added `far`. Defaults differ: EASEL
`PerspectiveCamera` fov is 45, three.js is 50.

**Use when.**

- Porting `new PerspectiveCamera(...)`, `new OrthographicCamera(...)` or
  `new Fog(...)`. Pass every value explicitly, including ones three.js
  defaulted.

**Do not use when.**

- The constructor row in `scripts/parity.py` is `=` (for example
  `BoxGeometry`); keep positional arguments there.

**Example.**

```ts
import { Fog, PerspectiveCamera } from "@xsyetopz/easel";

const camera = new PerspectiveCamera({
  fov: 50,
  aspect: 1.5,
  near: 0.1,
  far: 100,
});
const fog = new Fog({ color: 0x8899aa, near: 10, far: 80 });
```

Runnable: `assets/examples/options-constructors/`.

**Cost removed.** `TS2554 Expected 0-1 arguments` on positional calls, and
a wrong projection when `fov` is omitted. The oracle matches both
projection matrices to float32 precision (EASEL `Matrix4` stores a
`Float32Array`).

**Verify.**

1. The verifier prints `PASS options-constructors: perspective projection
   matches` and `default fov differs (three 50, easel 45)`.

## Constant objects replace THREE constants

**Definition.** EASEL groups constants in `as const` objects: `Side.Front`,
`Side.Back`, `Side.Double`; `Wrapping.ClampToEdge`, `Wrapping.Repeat`,
`Wrapping.MirroredRepeat`; `Loop.Once`, `Loop.Repeat`, `Loop.PingPong`;
`Shading.Flat`, `Shading.Gouraud`. Some values differ: three.js
`RepeatWrapping` is 1000, EASEL `Wrapping.Repeat` is 1. `Side` and `Loop`
values match (2 and 2201).

**Use when.**

- Porting any `THREE.*Side`, `THREE.*Wrapping`, `THREE.Loop*`, or numeric
  mode values read from three.js JSON.

**Do not use when.**

- The constant is a GPU setting (tone mapping, blending equations,
  filters, colour spaces); `scripts/parity.py` reports it `>` and it has no
  EASEL meaning.

**Example.**

```ts
import { BasicMaterial, Side, Texture, Wrapping } from "@xsyetopz/easel";

const texture = new Texture();
texture.wrapS = Wrapping.Repeat;
const material = new BasicMaterial({ side: Side.Double, map: texture });
```

Runnable: `assets/examples/constants/`.

**Cost removed.** `TS2305` on constant names, `TS2322` on a literal 1000,
and silent clamping when a three.js value is cast: the oracle samples texel
3 instead of 1 at u = 1.25.

**Verify.**

1. The verifier prints `PASS constants: cast three value 1000 silently
   clamps (3)`.

## updateMatrixWorld argument order

**Definition.** three.js `updateMatrixWorld(force)` takes one flag. EASEL
`updateMatrixWorld(updateParents = false, updateChildren = true,
force = false)`: a ported `updateMatrixWorld(true)` means "update parents",
not "force".

**Use when.**

- Porting `updateMatrixWorld(true)`, especially with
  `matrixAutoUpdate = false` and a hand-written `matrix`.

**Do not use when.**

- The call has no argument; both default to a non-forced update.
- Before rendering: `renderer.prepare(scene, camera)` already updates the
  scene and camera matrices.

**Example.**

```ts
import { Node } from "@xsyetopz/easel";

const parent = new Node();
const child = new Node();
parent.add(child);
child.matrixAutoUpdate = false;
child.matrix.makeTranslation(5, 0, 0);
parent.updateMatrixWorld(false, true, true); // three: (true)
```

Runnable: `assets/examples/update-matrix-world/`.

**Cost removed.** A stale world matrix with no diagnostic: the naive port
leaves the child's world x at 0 where three.js gives 5.

**Verify.**

1. The verifier prints `PASS update-matrix-world: naive
   updateMatrixWorld(true) leaves the world matrix stale (three 5,
   naive 0)`.
