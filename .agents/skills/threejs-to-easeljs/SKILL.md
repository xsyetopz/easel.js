---
name: threejs-to-easeljs
description: >
  Translate and review THREE.js scenes, renderer setup, geometry, materials,
  textures, cameras, lighting, animation, controls, picking, and loaders for
  the verified @xsyetopz/easel 0.6.1 Canvas2D CPU renderer. Use this skill to
  map APIs, adapt behavior, and document features without a direct target
  equivalent.
license: MIT
---
# THREE.js to EASEL.js

This skill guides migrations from THREE.js to `@xsyetopz/easel` 0.6.1. The
target is a browser `HTMLCanvasElement` and a Canvas2D software rasterizer.
Migration decisions preserve the source scene's visual intent where the target
API can represent it, and record a scoped adaptation when it cannot.

## When to use

- Porting a THREE.js scene or demo to EASEL.js.
- Reviewing an existing port for API, rendering, or lifecycle mismatches.
- Translating a THREE.js subsystem such as cameras, `BufferGeometry`, textures,
  materials, animation tracks, controls, or ray picking.
- Auditing WebGL/WebGPU, shader, postprocessing, or asset-loader assumptions
  before starting a Canvas2D implementation.

## When NOT to use

- The implementation remains a THREE.js/WebGL/WebGPU application; use its
  project documentation and THREE.js declarations instead.
- The task is general EASEL.js scene construction without a THREE.js source;
  use `using-easeljs` for that work.
- The task targets CreateJS EaselJS display-list APIs, or a headless renderer
  without a supplied DOM/canvas runtime.

## Quick start

1. Identify the source project's runtime, package manager, canvas ownership,
   THREE.js revision, and imported examples/add-ons.
2. Resolve the target package and verify its revision before applying a map:

   ```ts
   import * as EASEL from "@xsyetopz/easel";

   console.assert(EASEL.REVISION === "0.6.1");
   ```

   Inspect the resolved `dist/**/*.d.ts`; in this repository, use `src/index.ts`
   and the corresponding source declarations. If a symbol is absent, record it
   as `UNKNOWN` with the declaration path that was checked.
3. Read [`REFERENCE.md`](REFERENCE.md), then load the relevant files in the
   [`references/`](references/) map. The detailed migration file contains
   complete examples; the grounding file contains source anchors and behavior
   limits.
4. Port a minimal scene first. Keep a real browser canvas and prove one
   `renderer.render(scene, camera)` frame before adding the next subsystem.
5. Validate the target project's typecheck and browser smoke render. Record
   visual differences caused by affine UVs, discrete opacity, sorting, or
   unsupported features.

## Reference map

| Need | Read | What it provides |
| --- | --- | --- |
| Short lookup and completion criteria | [`REFERENCE.md`](REFERENCE.md) | Map status, lookup order, and migration checklist |
| Detailed conversion and examples | [`references/threejs-migration.md`](references/threejs-migration.md) | Core tables, code recipes, behavior adaptations, and review questions |
| Exact 0.6.1 target behavior | [`references/grounding.md`](references/grounding.md) | Export/declaration anchors, renderer contract, and unknown-API procedure |
| General EASEL.js construction | `using-easeljs/references/` | Renderer loops, scene/camera, geometry, materials, textures, and lifecycle recipes |

## Migration workflow

Work in boundaries so a failing check identifies one conversion rather than a
large mixed rewrite.

1. **Inventory the source.** List renderer options, scene nodes, cameras,
   geometry attributes, materials, maps, lights, fog, animation clips,
   controls, picking, loaders, postprocessing, and disposal paths. Include
   add-ons such as `GLTFLoader` and `EffectComposer` in the inventory.
2. **Establish the target baseline.** Resolve `@xsyetopz/easel`, inspect
   declarations, and verify `REVISION`. Mark every map as `direct`, `adapt`,
   `unsupported`, or `UNKNOWN` with the declaration path used as evidence.
3. **Replace the render boundary.** Create `Renderer({ width, height, canvas,
   pixelRatio })`; remove WebGL context/device setup and shader or buffer
   lifecycle code. Keep application-level resize and animation ownership.
4. **Port the graph.** Map `Object3D` to `Node`, preserve parent/child order,
   names, transforms, visibility, layers, and `userData`, and replace material
   arrays with the single material shape the target declaration accepts.
5. **Port cameras.** Use option objects for `PerspectiveCamera` and
   `OrthographicCamera`; update perspective `aspect` and call
   `updateProjectionMatrix()` after a resize. Keep camera matrix updates in the
   frame path.
6. **Port geometry.** Use an EASEL primitive where parameters match. For
   `BufferGeometry`, copy CPU arrays through `Geometry.setPositions`,
   `setNormals`, `setUVs`, `setColors`, and `setIndex`, then compute a bounding
   sphere when the geometry is modified.
7. **Port materials and textures.** Map Basic/Lambert/Toon and line/point
   materials to their EASEL names. Convert image data to `Texture`,
   `CanvasTexture`, `VideoTexture`, or `DataTexture`; set `needsUpdate` for
   image sources and account for the 128×128 nearest-neighbor limit.
8. **Port lighting, fog, animation, controls, and picking.** Use the direct
   EASEL classes where available. For ray picking, adapt the camera to the
   structural shape required by `Raycaster.setFromCamera` (see the detailed
   example). Advance `Animator`, `OrbitControls`, and application input from
   the same frame loop.
9. **Resolve unsupported behavior.** Choose a target-side CPU approximation
   only when its visual and performance cost is accepted. Otherwise keep the
   feature out of the port and report its symbol, declaration checked, and
   user-visible consequence as `UNKNOWN` or `unsupported`.
10. **Prove and clean up.** Typecheck, render a browser smoke scene, inspect
    representative pixels or screenshots, verify resize and transparency,
    dispose replaced resources, and remove source-only WebGL paths.

## Mapping tables

### Scene, renderer, and cameras

| THREE.js | EASEL.js 0.6.1 | Status and adaptation |
| --- | --- | --- |
| `Scene` | `Scene` | Direct name; background and fog are target-specific. |
| `Object3D` | `Node` | Direct scene-graph role; keep `name`, transforms, visibility, layers, and `userData`. |
| `Group` | `Group` | Direct container role. |
| `WebGLRenderer` | `Renderer` | Adapt constructor to `{ width, height, canvas, pixelRatio }`; output is Canvas2D `ImageData`. |
| `PerspectiveCamera(fov, aspect, near, far)` | `PerspectiveCamera({ fov, aspect, near, far })` | Constructor shape changes to one options object. |
| `OrthographicCamera(left, right, top, bottom, near, far)` | `OrthographicCamera({ left, right, top, bottom, near, far })` | Constructor shape changes to one options object. |
| `OrbitControls(camera, domElement)` | `OrbitControls(camera, domElement)` | Direct export with EASEL camera/DOM structural types; call `update()` each frame and `dispose()` on teardown. |

### Geometry and objects

| THREE.js | EASEL.js 0.6.1 | Status and adaptation |
| --- | --- | --- |
| `BufferGeometry` | `Geometry` | Copy attribute arrays through setters; this is CPU data, not a GPU buffer. |
| `BufferAttribute` | `Attribute` | `itemSize`, typed array accessors, and `needsUpdate` are available. |
| `BoxGeometry`, `SphereGeometry`, `PlaneGeometry`, `CylinderGeometry`, `ConeGeometry`, `TorusGeometry`, `TorusKnotGeometry` | Same class names | Verify constructor parameter order in declarations; EASEL primitives produce CPU attributes. |
| `Mesh` | `Mesh` | Direct shape; constructor accepts `Geometry` and `Material` or `undefined`. |
| `Line`, `LineSegments`, `LineLoop` | Same class names | Exported EASEL objects; pair with `LineMaterial`/`DashedLineMaterial` and verify the target render path for the scene. |
| `Points` | `Points` | Use `PointsMaterial`; point size is an integer pixel radius. |
| `Sprite` | `Sprite` | Use the exported sprite node with a verified material/map combination. |
| `InstancedMesh` | `InstancedMesh` | CPU draw-call expansion; use `setMatrixAt`/`setColorAt`, then measure the instance count. |
| `SkinnedMesh`, `Bone`, `Skeleton` | Same class names | Exported CPU skinning helpers; verify source attributes and deformation cost for the asset. |

### Materials, lights, textures, animation, and picking

| THREE.js | EASEL.js 0.6.1 | Status and adaptation |
| --- | --- | --- |
| `MeshBasicMaterial` | `BasicMaterial` | Unlit color/map. |
| `MeshLambertMaterial` | `LambertMaterial` | Diffuse light baking; flat or Gouraud shading. |
| `MeshToonMaterial` | `ToonMaterial` | Stepped Gouraud shading; use `gradientMap` when needed. |
| `LineBasicMaterial` | `LineMaterial` | Integer/Bresenham line path; verify linewidth expectations. |
| `LineDashedMaterial` | `DashedLineMaterial` | `dashSize`/`gapSize` are target options. |
| `PointsMaterial` | `PointsMaterial` | Map `size`, `map`, color, and transparency options. |
| `AmbientLight`, `DirectionalLight`, `PointLight`, `SpotLight`, `HemisphereLight` | Same class names | Direct classes with CPU flat/Gouraud lighting; EASEL lights have no shadow maps. |
| `Texture` | `Texture`, `CanvasTexture`, `VideoTexture`, `DataTexture`, `FramebufferTexture` | Choose by source; clamp image sources to 128×128 and sample nearest. |
| `AnimationMixer` | `Animator` | Build `AnimationClip` + typed `Track`, call `Animator.update(delta)`. |
| `KeyframeTrack` | `Track`, `NumberTrack`, `VectorTrack`, `QuaternionTrack`, `ColorTrack`, `BooleanTrack` | Track names bind to a root or named child using dotted paths. |
| `Raycaster` | `Raycaster` | Direct class; `setFromCamera` needs an inverse-projection camera adapter. |
| `TextureLoader`, JSON geometry/animation loaders | Same EASEL loader names | Verify callback/promise and parsed shape; common THREE asset formats are not implied. |

## Unsupported concepts

EASEL.js targets CPU/Canvas2D rasterization. A source feature in the table
below needs an explicit design decision and a documented target-side outcome;
compatibility flags do not add a target implementation.

| Source concept | Target status | Migration decision |
| --- | --- | --- |
| WebGL/WebGPU context, `WebGLRenderer` device state, GPU buffers, GLSL/WGSL shaders | Not part of the public target API | Remove the device path. Re-express the visible result with CPU geometry/materials or report the feature as `UNKNOWN`. |
| `EffectComposer`, render passes, bloom, SSAO, arbitrary postprocessing | No public postprocess graph | Use a supported CPU scene pass or an application-owned Canvas2D pass when approved; record visual and frame-time differences. |
| `MeshStandardMaterial`, `MeshPhysicalMaterial`, `MeshPhongMaterial`, shader/node materials | No one-to-one material | Select Basic/Lambert/Toon or bake the intended appearance into geometry/textures; document the approximation. |
| Shadow maps, environment maps, PMREM, image-based lighting, PBR workflows | No public implementation | Use baked lighting, explicit geometry, or a simpler material; record the resulting shadow/reflection difference. |
| Perspective-correct texture interpolation | Target interpolation is affine | Expect texture warp under perspective; change UV layout, use orthographic framing, or accept the artifact. |
| Continuous float alpha | Target material opacity is nine discrete steps (`0` opaque through `8` nearly transparent) and requires `transparent: true` for blending | Quantize source alpha and verify overlapping draw order and depth flags. |
| GLTF/OBJ/FBX loaders and compressed GPU assets | No general format loader in the public target | Parse the format in application code or another package, then construct verified EASEL geometry/materials; keep the parser boundary explicit. |
| Morph targets and custom vertex shader deformation | No public morph/shader API | Mutate CPU attributes per frame only when the budget allows, or retain the feature as `UNKNOWN`. |
| WebXR and GPU compute | No target runtime contract | Keep the feature in the source application or define a separate approved browser integration. |

## Validation

Use the narrowest checks that cover the changed boundary, then expand for an
integration migration:

```sh
# Target project
bun run typecheck
bun test                  # when tests cover the converted boundary

# Browser smoke proof: run an actual HTMLCanvasElement scene and assert
# renderer.domElement, one render call, and non-empty ImageData.

# If the host provides a skill validator, run it against this directory. A
# typical invocation is:
python3 scripts/validate_skill.py .agents/skills/threejs-to-easeljs

# Optional local install/list smoke test when the skills CLI is available:
bunx skills add . --skill threejs-to-easeljs --list
```

The migration is ready for review when the target revision is recorded, every
source symbol has a status, typecheck passes, a browser frame is observed, and
the report names any visual or unsupported differences. Check resource
replacement paths (`Geometry.dispose()`, `Texture.dispose()`, material/helper
cleanup, `Renderer.dispose()`, and `OrbitControls.dispose()`) when the source
scene rebuilds or unmounts.

## Related skills

- `using-easeljs` for source-grounded EASEL.js scene construction and runtime
  recipes.
- `threejs-to-easeljs` is the focused migration layer; use it together with
  `using-easeljs` when a port also needs a complete target-side example.
