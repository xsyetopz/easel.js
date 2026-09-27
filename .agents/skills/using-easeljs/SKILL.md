---
name: using-easeljs
description: Writes, fixes, and reviews app code for EASEL.js (@xsyetopz/easel), the CPU-only Canvas2D 3D renderer with a three.js-style API. Use when code imports @xsyetopz/easel, an EASEL canvas renders blank or stretched, or an EASEL API name needs checking.
license: MIT
metadata:
  easel-version: "0.8.0"
---

# Using EASEL.js

This skill makes `@xsyetopz/easel` 0.8.0 app code (`REVISION === "0.8.0"`)
draw the frame it should. It covers the scene, camera, materials,
geometry, animation, input, and teardown. Each trap below has a card with
a runnable example that a bundled verifier type-checks against
`src/index.ts` and executes. Apply the card that matches the evidence,
then run that card's Verify steps.

## Workflow

1. Establish the version. In this repository, `rg -n REVISION
   src/index.ts`. In an app, read
   `node_modules/@xsyetopz/easel/package.json`. If it is not 0.8.0,
   run the API script with `--root node_modules/@xsyetopz/easel` and
   trust its output over this skill.
1. Before writing any name not shown in a card, look it up:
   `bun scripts/easel_api.ts exports --grep TEXT` or
   `bun scripts/easel_api.ts show NAME`. Do not infer EASEL APIs from
   three.js.
1. Choose the card from the routing table for the symptom or the code
   you are writing.
1. Copy the card's pattern. Keep the frame order: update state, then
   `renderer.prepare(scene, camera)`, then `renderer.render(scene,
   camera)`.
1. Run the host project's typecheck. For changes to this skill, run
   `sh assets/examples/verify.sh all`.
1. Report using the Completion evidence list.

## Gotchas

These compile, or fail with an unhelpful error, and cost a debugging
session each. Values are from local runs against `src/index.ts`
(macOS arm64, Bun 1.4.2); the `threejs-to-easeljs` skill has runnable
oracles for each.

- Lighting and colour follow three.js r186: `Color` stores linear values
  (hex and CSS input are decoded from sRGB), Lambert lighting includes
  the `1 / PI` term, and output is encoded to sRGB. Use three.js light
  intensities as they are: a white face under `DirectionalLight(0xffffff,
  1)` renders 152 (three.js 153). Dividing by `Math.PI`, the 0.7 habit,
  halves the brightness.
- Every material, `PointsMaterial` included, defaults `vertexColors` to
  `true`: a geometry with a `color` attribute is tinted by it. Pass
  `vertexColors: false` to use `material.color` alone.
- `PointsMaterial.size` is a positive integer pixel radius (size 2 draws
  5 px across) at every distance; `0.05` or `1.5` throws `RangeError`.
  Points ignore `map`, and there is no `sizeAttenuation` or `alphaTest`.
  Sprites always shrink with distance.
- A `CanvasTexture` renders untextured until `texture.update()`; after
  each redraw set `needsUpdate = true` and call `update()` again, or the
  old pixels stay.
- Draw order is `material.layer` (lower first), not `renderOrder`; it
  only shows with `depthTest: false` or transparency.
- `OBB.intersectRay` returns `undefined` on a miss, so a `!== null` test
  is always true.
- Accessors, not methods: `box.isEmpty` (not `isEmpty()`),
  `raycaster.pointsThreshold` and `lineThreshold` (no `params`),
  `orbit.distance`, `polarAngle` and `azimuthalAngle` (not
  `getDistance()`). Controls take the camera as `controls.object`.
- `geometry.attributes` is a `Map`: use `getAttribute("position")`, not
  `attributes.position`. `new Attribute(array, itemSize)` stores a plain
  array as `Float32Array`; pass `Uint16Array` and the like explicitly.
- `TextureLoader.load` returns `void`; await `loadAsync` (typed
  `Promise<unknown>`) and check `instanceof Texture`.
- No `Geometry.addGroup` and no material arrays: one material per mesh.
  Morph attributes and `morphTargetInfluences` are stored but not
  rendered.
- `v.length` is an accessor, not `length()`. `Color.setRGB` takes
  three.js's optional `colorSpace` but throws `RangeError` outside 0..1.
  Texture `colorSpace` must be set before the texture's first
  `update()`, or call `update()` again after changing it.
- `transparent: true` in the constructor also turns off `depthWrite`.
- `geometry.mergeVertices()` changes the geometry in place (box: 24 to 8
  vertices) and returns it; clone first to keep the original.
- Raycasting honours `material.side`, points fade into scene fog, and a
  material with `visible: false` hides only its own mesh, as in three.js.

## Route evidence to a card

| Evidence | Card |
| --- | --- |
| Canvas shows only the clear color; moved objects do not move | [Prepare before render](references/frame.md#prepare-before-render) |
| `new PerspectiveCamera(60, …)`, or `lookAt` aims wrong | [Camera options and lookAt](references/frame.md#camera-options-and-lookat) |
| Image stretched after resize | [Resize](references/frame.md#resize) |
| `setClearColor` missing; background ignores clear color | [Clear color](references/frame.md#clear-color-and-background-precedence) |
| `opacity: 0.5` throws; "transparent" material stays opaque | [Discrete opacity](references/materials.md#discrete-opacity) |
| `Fog LUT is dirty; call updateLut()` | [Fog lookup table](references/materials.md#fog-lookup-table) |
| `setIndex is not a function`; quads miss triangles | [Index accessor](references/geometry-and-textures.md#index-accessor) |
| Atlas shows only top-left tiles; painted pixels do not appear | [DataTexture size and update](references/geometry-and-textures.md#datatexture-size-and-update) |
| `Track values length must equal times length * itemSize` | [Track item size](references/animation-tracks.md#track-item-size) |
| `LoopRepeat`/`Clock` missing; animation too fast or snaps back | [Loop and animator update](references/animation-tracks.md#loop-and-animator-update) |
| Frames or listeners survive unmount; StrictMode doubles | [Frame loop teardown](references/lifecycle.md#frame-loop-teardown) |
| Removing one mesh breaks another; texture memory kept | [Resource disposal ownership](references/lifecycle.md#resource-disposal-ownership) |
| Clicks select nothing or the wrong object | [Raycast picking](references/input-picking.md#raycast-picking) |
| Need an exact export, signature, or constant | [API lookup](references/api-lookup.md#look-up-exports-and-signatures) |
| New project scaffold | [Starter templates](references/starter-templates.md#starter-templates) |

## Rules

- Import only from `@xsyetopz/easel`. The package exports only its root
  (`.`), so do not use subpaths such as `@xsyetopz/easel/src/...`.
- Use EASEL names. three.js names map as follows: `Object3D` is `Node`,
  `BufferGeometry` is `Geometry`, `BufferAttribute` is `Attribute`,
  `MeshBasicMaterial` is `BasicMaterial`, `Clock` is `Timer`, and
  `KeyframeTrack` is `Track`. Use accessors, not `get`/`set` methods, and
  use `undefined`, not `null`. EASEL has no static members; use the
  exported functions instead.
- Treat retro artifacts as intended output, not bugs: affine texture
  warping, vertex wobble from integer snapping, nearest-neighbor 128x128
  textures, 9 opacity levels, and flat or Gouraud lighting. EASEL trades
  pixel accuracy for CPU speed, so a "fix" such as perspective-correct
  UVs, anti-aliasing, per-pixel lighting, or supersampling adds per-pixel
  work the design rejects. Flag any added per-pixel or per-frame CPU cost
  in the report instead of adding it silently.
- Always pair `prepare` with `render`. `render` never updates matrices.
- Keep opacity an integer from 0 to 8, where 8 is invisible, and set
  `transparent: true` to blend.
- Do not add GPU concepts: shaders, `WebGLRenderer`, PBR maps,
  `setPixelRatio`, `setAnimationLoop`. EASEL rasterizes on the CPU into
  `ImageData`, and the app owns `requestAnimationFrame`.
- This package is not CreateJS EaselJS. `createjs.Stage`, `Ticker`, and
  `Shape` do not apply.
- A stub-canvas run or a typecheck is not a browser check. Say which one
  you ran.

## Bundled tools

- `bun scripts/easel_api.ts exports|show|constants [NAME...] [--root DIR]
  [--grep TEXT]`: prints exports, `.d.ts` declarations, or constant
  values from source. `--grep` is a case-insensitive substring filter on
  export name and module path, with `a|b` for alternatives; it is not a
  regex. In a repository, `show` always emits declarations from `src`,
  never from a possibly stale `dist/`. Exit 0 on success, 1 for an
  unknown name or a source/runtime mismatch, 2 for bad usage.
- `bun scripts/test_easel_api.ts`: self-test for the API script.
- `bun scripts/smoke_entry.ts ENTRY`: runs a browser entry module with a
  stub DOM and canvas. Exit 0 pass, 1 fail, 2 usage.
- `sh assets/examples/verify.sh [examples|api|templates|all]`: runs every
  check in a copy under `$TMPDIR`, not in this directory.
  - `examples` type-checks with the repository's `tsc`, resolving
    `@xsyetopz/easel` to `src/index.ts` through tsconfig `paths`, and runs
    each oracle under Bun.
  - `api` runs the script self-test.
  - `templates` installs, type-checks, builds, and smoke-runs each
    template, then re-runs the examples against the published package.
  - Exit 0 pass or skip, 1 fail, 2 usage or missing tool.

## References

- [Frame](references/frame.md): prepare before render, camera options
  and lookAt, resize, clear color precedence.
- [Materials](references/materials.md): discrete opacity, fog lookup
  table.
- [Geometry and textures](references/geometry-and-textures.md): index
  accessor, DataTexture size and update.
- [Animation tracks](references/animation-tracks.md): track item size,
  loop and animator update.
- [Lifecycle](references/lifecycle.md): frame loop teardown, resource
  disposal ownership.
- [Input picking](references/input-picking.md): raycast picking.
- [API lookup](references/api-lookup.md): the source-derived API script.
- [Starter templates](references/starter-templates.md): verified project
  templates.

## Completion evidence

The report contains:

- The installed EASEL version, or `REVISION`.
- The symptom or the request, and the cards applied.
- Any API names confirmed with `easel_api.ts`.
- The typecheck command and its result, and any verifier output.
- Whether a real browser render was checked. If it was not, say so.
