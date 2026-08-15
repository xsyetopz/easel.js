---
name: threejs-to-easeljs
description: >
  Audit and migrate existing Three.js projects to @xsyetopz/easel 0.7.0,
  including add-ons, assets, controls, exporters, and CPU renderer boundaries.
license: MIT
---
# Three.js to EASEL.js

Use this skill to audit and migrate an existing Three.js application to
`@xsyetopz/easel`. It is not a universal parity claim: an identically named
class may expose only part of the source behavior, and an exported EASEL class
may not be consumed by the main Canvas2D `Renderer`.

## Verified baselines

- **Source reference:** the repository installs `three@0.185.1`, whose runtime
  `REVISION` is `"185"`. Core is exported by `three`; add-ons are exported by
  `three/addons` and `three/addons/*`; WebGPU and TSL have separate `three/webgpu`
  and `three/tsl` entries. This installed Three package contains JavaScript with
  JSDoc but no bundled `.d.ts` files. If the source project has external types,
  inspect their resolved version separately.
- **Target reference:** this checkout is `@xsyetopz/easel@0.7.0` and exports
  `REVISION = "0.7.0"`. `src/index.ts` and the owning `src/**/*.ts` declarations
  are authoritative here; a consumer should inspect its resolved
  `dist/index.d.ts` and package metadata.

Treat any source revision other than r185 as **source-version-dependent**.
Inventory its lockfile, import paths, add-ons, declarations, and runtime before
using an r185 mapping.

## Status and UNKNOWN rule

Give every imported symbol and relied-on behavior one status:

- **direct**: target export and required behavior are verified;
- **adapt**: the target has the role, but construction, data, lifecycle, result
  shape, visual output, or performance differs;
- **surface-only**: a target field/class exists, but the required render or
  integration path is absent or not verified;
- **unsupported**: inspected target source establishes that the behavior is
  outside the CPU/Canvas2D contract;
- **UNKNOWN**: available declarations/source do not establish the answer.

For `UNKNOWN`, record the exact source symbol and import, source revision, target
version, files checked, and missing behavior. Absence from `src/index.ts` proves
only that there is no root export; it does not by itself prove why. Never infer
parity from a matching name, a Three declaration, or an older EASEL guide.

## Migration workflow

1. **Freeze the real source.** Record package/lock versions, `THREE.REVISION`,
   bundler/runtime, browsers, canvas ownership, and all `three`, `three/addons`,
   `three/examples/jsm`, `three/webgpu`, and `three/tsl` imports.
2. **Build an audit ledger.** Inventory renderer settings and calls, scene node
   types, camera modes, attributes, materials and every non-default field,
   texture formats/transforms, lights/shadows, animation bindings, controls,
   picking, audio, physics, loaders/decoders, exporters, postprocessing, XR,
   custom shaders, disposal, tests, and asset fixtures. Use the ledger template
   in [`references/threejs-migration.md`](references/threejs-migration.md).
3. **Resolve target evidence.** Check package version plus `REVISION`, root
   exports, owning declaration/source, and the main renderer consumer. Record
   semantic and performance gaps, not just symbol presence.
4. **Choose boundaries.** Separate portable application state from the render
   backend. Keep or replace format parsers and physics engines independently;
   do not force them into the renderer conversion.
5. **Port in proof-sized slices.** Establish canvas + renderer + camera + one
   frame, then graph/transforms, geometry, materials/lights, assets, animation,
   interaction, overlays, and teardown. Typecheck each slice.
6. **Validate representative behavior.** Exercise every used material/object
   pair and asset variant in a browser. Compare screenshots or pixels, resize,
   controls, picking, animation, transparency/order, fog, disposal, frame time,
   and memory. A typecheck does not prove visual parity.
7. **Close the ledger.** No source symbol remains implicit. Accepted visual or
   performance differences are documented; unresolved entries stay `UNKNOWN`.

## High-value mapping corrections for 0.7.0

| Three.js r185 source | EASEL.js 0.7.0 | Migration status |
| --- | --- | --- |
| `WebGLRenderer` | `Renderer({ canvas, width, height, sortObjects })` | Adapt. CPU scanline rasterization uploads `ImageData` to Canvas2D. There is no `pixelRatio` constructor option, `setPixelRatio`, animation loop, WebGL context, render target, viewport, scissor, or shadow state. Use `renderer.clearColor = value`, not stale `setClearColor(...)`. |
| `Object3D` | `Node` | Adapt the name; audit matrix-update arguments, serialization, events, and any subclass tests. |
| `BufferGeometry` / `BufferAttribute` | `Geometry` / `Attribute` | Adapt CPU arrays. Current `Geometry` uses `setPositions`, `setNormals`, `setUVs`, `setColors`, and the `index` property; there is no current `setIndex()` method. |
| `PerspectiveCamera(...)`, `OrthographicCamera(...)` | Same class names with one options object | Adapt constructor shape. Both cache `projectionMatrixInverse`, so current cameras pass directly to `Raycaster.setFromCamera` after matrices are prepared. |
| `MeshBasicMaterial`, `MeshLambertMaterial`, `MeshToonMaterial` | `BasicMaterial`, `LambertMaterial`, `ToonMaterial` | Adapt. Only bounded CPU color/map and baked flat/Gouraud lighting fields apply. |
| `LineBasicMaterial`, `LineDashedMaterial`, `PointsMaterial`, `SpriteMaterial` | `LineMaterial`, `DashedLineMaterial`, `PointsMaterial`, `SpriteMaterial` | Adapt options and verify the consumer. Lines and points are in the main renderer; `Sprite`/`SpriteMaterial` are exported but Sprite traversal by the main renderer is not established. |
| `AnimationMixer`, keyframe tracks, `Clock` | `Animator`, typed tracks, `Timer` | Adapt names, binding grammar, loop constants (`Loop.Repeat`, etc.), and timer accessors. |
| r185 add-on controls | Same nine control names at EASEL root | Adapt. Arcball, Drag, FirstPerson, Fly, Map, Orbit, PointerLock, Trackball, and Transform controls exist; compare each used option, event, DOM assumption, `update` signature, and teardown. |
| Common format loaders | Many same names at EASEL root | Adapt, never blanket-direct. GLTF, OBJ/MTL, PLY, STL, BVH, DDS, HDR/RGBE, NRRD, SVG, TGA, TIFF, TTF, VOX and others now exist, but result shapes and supported format subsets differ. |
| `GLTFExporter`, `OBJExporter`, `PLYExporter`, `STLExporter`, `EXRExporter` | Same names at EASEL root | Adapt output/options. EASEL also has `MTLExporter` and `GCodeExporter`; it does not thereby implement every r185 exporter feature. |
| `CSS2DRenderer`, `CSS3DRenderer`, `SVGRenderer` add-ons | Same names at EASEL root | Adapt constructor/options and supported object/material subset. These DOM renderers do not add WebGL features to the main renderer. |
| `Raycaster` | `Raycaster` | Current EASEL cameras expose `projectionMatrixInverse`; pass the prepared camera directly. The old manual inverse-projection adapter is no longer required for EASEL 0.7 cameras. |

## Hard renderer boundaries

The main target remains CPU scanline rasterization plus Canvas2D upload. Do not
translate these as compatibility flags:

- WebGL/WebGPU device state, GLSL/WGSL, TSL/node materials, GPU compute,
  transform feedback, render targets, MRT, stencil, or custom blend equations;
- `EffectComposer`, passes, bloom, SSAO/GTAO/SSR, TAA/SMAA/FXAA, depth-of-field,
  and shader postprocessing;
- PBR/physical/standard/Phong/matcap/normal/depth/distance/shadow materials,
  PMREM/IBL/reflection/refraction, shadow maps, light maps, normal/bump/AO maps,
  clearcoat/transmission/iridescence, and tone-mapping pipelines;
- cube/3D/array/compressed textures, mipmapping, linear filtering, anisotropic
  filtering beyond 1, HDR framebuffer rendering, WebXR, and GPU particles.

Choose a documented CPU approximation, an application-owned Canvas2D step, a
prebaked asset, or keep the feature on the original backend. Mark unresolved
behavior `UNKNOWN`, not “supported enough.”

## Resources

- [`REFERENCE.md`](REFERENCE.md): lookup order, quick subsystem map, and done
  criteria.
- [`references/grounding.md`](references/grounding.md): exact r185/0.7.0 source
  anchors and renderer-consumer evidence.
- [`references/threejs-migration.md`](references/threejs-migration.md): complete
  audit ledger, detailed mappings, asset limitations, port sequence, and tests.
- `using-easeljs`: use alongside this skill for target-side construction after
  confirming that guide is also grounded to EASEL 0.7.0.

## Verification

For a real migration, run the target project's typecheck/tests and an actual
browser render. Validate representative pixels or screenshots and interaction;
record anything not exercised as **UNVERIFIED**. For this skill package, check
frontmatter, local Markdown links, stale baseline strings, and repository scope.
