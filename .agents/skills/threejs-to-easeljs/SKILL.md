---
name: threejs-to-easeljs
description: "Ports and audits three.js code for EASEL.js (@xsyetopz/easel), the CPU-only Canvas2D renderer: renamed classes, accessors, constants, opacity levels, and unsupported GPU features. Use when moving three.js code to EASEL or asking whether EASEL has a three.js API."
license: MIT
metadata:
  easel-version: "0.7.0"
  three-version: "0.186.1"
---

# three.js to EASEL.js

Port three.js r186 (`three@0.186.1`) code to EASEL 0.7.0 (`REVISION` in
`src/index.ts`) or audit a three.js app for the port. Every change is a card
below, applied to evidence from the source and checked by the compiler, an
oracle, or a browser run. New EASEL scenes with no three.js source belong to
the sibling `using-easeljs` skill.

## Workflow

1. Record versions: the source's `three` version from its lockfile, and
   EASEL's `REVISION` in `src/index.ts`. The cards assume r186 and 0.7.0;
   for other versions, re-run the lookups before trusting a card.
1. List the three.js symbols the code uses:
   `rg -o 'THREE\.[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)?' <files> | sort -u`.
1. Look each one up:
   `python3 scripts/parity.py THREE.Object3D Color.getHex ...`
   (run from the repository; exit 1 means "no ledger row", see
   [parity lookup](references/audit.md#parity-lookup)).
1. For a whole app, fill the
   [migration ledger](references/audit.md#migration-ledger) first.
1. Apply the card for each finding from the table below.
1. Type-check the port (`bun run typecheck` in this repository, or the
   consumer's own check), then run the relevant oracles with
   `sh assets/examples/verify.sh`.
1. Check behavior the compiler cannot see in a browser: one rendered
   frame, resize, transparency, textures, animation.

## Route evidence to a card

| Evidence in the three.js code | Card |
| --- | --- |
| `Object3D`, `BufferGeometry`, `BufferAttribute`, `AnimationMixer` | [Renamed classes](references/api-shape.md#renamed-classes) |
| `MeshBasicMaterial`, `MeshLambertMaterial`, `LineBasicMaterial` | [Material class names](references/api-shape.md#material-class-names) |
| `getHex()`, `setHex()`, `getIndex()`, `setIndex()`, `box.isEmpty()` | [Accessors](references/api-shape.md#accessors-replace-getx-and-setx) |
| `Float32BufferAttribute`, `geometry.attributes.position` | [Attributes](references/api-shape.md#attributes-and-the-attribute-map) |
| `raycaster.params.Points.threshold`, `params.Line.threshold` | [Raycaster thresholds](references/api-shape.md#raycaster-thresholds) |
| `OrbitControls`, `controls.object` | [Controls camera](references/api-shape.md#controls-camera-field) |
| `AnimationClip.findByName`, `Object3D.DEFAULT_UP` | [Statics](references/api-shape.md#statics-become-standalone-exports) |
| `= null`, `=== null`, `parent === null` | [Undefined replaces null](references/api-shape.md#undefined-replaces-null) |
| `new PerspectiveCamera(50, a, n, f)`, `new Fog(c, n, f)` | [Options objects](references/api-shape.md#options-objects-replace-positional-constructors) |
| `THREE.DoubleSide`, `THREE.RepeatWrapping`, `THREE.LoopRepeat` | [Constant objects](references/api-shape.md#constant-objects-replace-three-constants) |
| `updateMatrixWorld(true)` | [updateMatrixWorld order](references/api-shape.md#updatematrixworld-argument-order) |
| `WebGLRenderer`, `setAnimationLoop`, `setPixelRatio`, `setClearColor` | [Renderer](references/rendering.md#webglrenderer-to-renderer) |
| Any light `intensity`; port renders brighter than three.js | [Light intensity](references/rendering.md#light-intensity) |
| `MeshStandardMaterial`, `MeshPhongMaterial`, `MeshNormalMaterial`, `castShadow`, shaders | [PBR, shadows](references/rendering.md#pbr-shadows-and-shaders) |
| `opacity`, `transparent`, `RangeError: Material.opacity` | [Opacity levels](references/rendering.md#opacity-levels) |
| `renderOrder` | [Material layer](references/rendering.md#render-order-to-material-layer) |
| `PointsMaterial`, `sizeAttenuation`, `alphaTest`, `RangeError: PointsMaterial.size` | [Points and sprite size](references/rendering.md#points-and-sprite-size) |
| `DataTexture`, `Uint8Array` pixels, textures over 128 px | [Texture size](references/rendering.md#texture-size-and-pixel-format) |
| `CanvasTexture`, redrawn texture stays blank or stale | [CanvasTexture update](references/rendering.md#canvastexture-update) |
| `Clock`, `getDelta()`, `THREE.Timer` | [Timer deltas](references/runtime.md#timer-deltas) |
| `VectorKeyframeTrack`, `".position"` tracks, `clipAction` | [Animator](references/runtime.md#animator-and-binding-paths) |
| `TextureLoader().load(url)` used as a value, `GLTFLoader` clips | [TextureLoader](references/runtime.md#textureloader-results) |
| `THREE.LOD`, `autoUpdate` | [LOD update](references/runtime.md#lod-update) |
| `THREE.BoxHelper`, `helper.update()` | [BoxHelper bounds](references/runtime.md#boxhelper-bounds) |
| `TorusGeometry` | [Torus orientation](references/geometry-math.md#torus-orientation) |
| `EllipseCurve`, `ArcCurve`, `absarc`, `absellipse` with `clockwise` | [Arc sweep](references/geometry-math.md#ellipse-and-arc-sweep) |
| `OBB`, `intersectRay(...) !== null` | [OBB ray miss](references/geometry-math.md#obb-ray-miss) |
| `intersectsFrustum`, `object.dispose()`, other r186 additions | [r186 additions](references/runtime.md#r186-intersectsfrustum-and-dispose) |
| "does EASEL have X?" | [Parity lookup](references/audit.md#parity-lookup) |
| whole-app audit, import inventory | [Migration ledger](references/audit.md#migration-ledger) |

## Rules

- Look a symbol up before porting it; a shared name does not prove a shared
  signature or algorithm (bounding spheres differ, fov defaults differ).
- Never copy a three.js `opacity` number; convert it (0 opaque, 8
  transparent) or the setter throws.
- Never cast three.js numeric constants to EASEL types; map them by name
  (`RepeatWrapping` 1000 is `Wrapping.Repeat` 1).
- Replace every `null` check on EASEL values with `undefined`; the
  compiler does not catch `=== null`.
- Divide every ported light intensity by `Math.PI`. three.js's Lambert
  shader divides by PI and EASEL's baked lighting does not, so verbatim
  intensities render about twice as bright.
- Set `vertexColors: false` on every material whose geometry has a
  `color` attribute unless three.js set it `true`; EASEL defaults it to
  `true`, three.js to `false`.
- Call `renderer.prepare(scene, camera)` before every `render`, and put
  per-frame selection (`lod.update(camera)`, `boxHelper.update()`)
  between them; EASEL updates nothing implicitly.
- Record morph targets, `Geometry.addGroup` and material arrays as
  `unsupported`. `GLTFLoader` drops primitive `targets`, the renderer
  ignores `morphTargetInfluences`, `Geometry` has no `addGroup` or
  `groups`, and `Mesh.material` takes one material; split multi-material
  meshes into one mesh per group.
- Pass every constructor option explicitly; EASEL defaults differ.
- Record PBR, shadows, shaders, post-processing, render targets and XR as
  `unsupported` losses, never as equivalents.
- A port matches three.js in API shape and scene behavior, not in pixels.
  EASEL is Canvas2D-only by design and trades pixel accuracy for CPU speed:
  affine texture warping, vertex wobble, 128x128 nearest-neighbor
  textures, 9 opacity levels, and baked flat or Gouraud lighting are
  intended. Record these as accepted `adapt` differences. Do not emulate
  three.js output with per-pixel CPU work such as perspective-correct UVs,
  anti-aliasing, or per-pixel lighting, because that cost is what the
  design rejects.
- Smaller renames and traps, each checked against `src/` in a local run:
  `LineBasicMaterial` is `LineMaterial`; `v.length()` is the `v.length`
  accessor (5 for (3,4,0)); `Color.setRGB` has no `colorSpace` argument
  and throws `RangeError` outside 0..1, and EASEL has no colour
  management, so convert linear values with
  `color.setRGB(r, g, b).convertLinearToSRGB()` (0.5 becomes 0.735);
  `transparent: true` in the constructor also sets `depthWrite: false`;
  `LambertMaterial` has no `emissive`, so swap the diffuse `color` for a
  glow; `Side.Double` back faces are lit with the front normal (a plane
  seen and lit from behind renders 25 where the front renders 153);
  `Geometry.mergeVertices()` works in place and returns the same
  geometry (a box goes from 24 to 8 vertices). Raycasting honours
  `Material.side` as three.js does; points take scene fog, and
  `material.visible = false` hides only that mesh, not its children.
- Do not add three.js-only API to EASEL `src/` to make a port compile;
  that is library work governed by `CONTRIBUTING.md`.

## Bundled tools

- `scripts/parity.py [--ledger PATH] SYMBOL...`: prints parity rows; exit
  0 found, 1 a symbol has no row, 2 bad usage or missing or malformed
  ledger. Tests: `python3 scripts/test_parity.py`.
- `sh assets/examples/verify.sh [all|typecheck|naive|run]`: copies the
  examples to a temporary directory, maps `three` to
  `node_modules/three/src/Three.js`, `three/addons/*` to
  `node_modules/three/examples/jsm/*` and `@xsyetopz/easel` to
  `src/index.ts`, then type-checks candidates with the repository's
  TypeScript (`bunx tsc`), confirms each `naive.ts` raises the declared
  `TSnnnn` errors, and runs each `check.ts` oracle under bun. Exit 0 pass,
  1 a check failed, 2 missing bun, repository, or three.js.

## References

- [API shape](references/api-shape.md): renamed classes, material names,
  accessors, attributes, raycaster thresholds, controls camera, statics,
  undefined, options constructors, constants, updateMatrixWorld.
- [Rendering](references/rendering.md): renderer and loop, light
  intensity, PBR and shadows, opacity levels, material layer, points and
  sprite size, texture size, CanvasTexture update.
- [Runtime](references/runtime.md): Timer, Animator, TextureLoader, LOD
  update, BoxHelper bounds, r186 intersectsFrustum and dispose.
- [Geometry and math](references/geometry-math.md): torus orientation,
  ellipse and arc sweep, OBB ray miss.
- [Audit](references/audit.md): parity lookup, migration ledger.

## Completion evidence

The report contains: the three.js and EASEL versions; the symbols looked up
and their rows; the cards applied; the typecheck command and result; the
verifier or oracle output for the cards used; browser checks run, or a
statement that they were not run; and every ledger row left `UNKNOWN` or
`unsupported` with its consequence.
