# three.js `dev` example-port audit

**Revision 2 — 2026-08-05 — audited against the official `dev` tree**

## Objective and scope

Classify the official `three.js` examples that match the official `dev` tree (the installed package is `three@0.185.1`; API decisions use checked-out EASEL source) against the checked-out EASEL.js 0.7.0 CPU Canvas2D contract. The audited population is the 595 IDs listed by the official [`examples/files.json`](https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/files.json) manifest. The manifest is the authoritative current `dev` catalog; it excludes the navigation page and includes the two test-example IDs. This is an implementation-path audit, not a claim that every visual result will match a GPU renderer.

## Reproduction and source provenance

```sh
# from /Users/krystian/CodeProjects/xsyetopz/easel.js
node -p "require('./node_modules/three/package.json').version"  # 0.185.1
curl -fsSL 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/files.json' \
  > /tmp/three-files.json
# Verify the checked-in CSV covers the manifest exactly.
python3 - <<'PY'
import csv, json
manifest = {i for values in json.load(open('/tmp/three-files.json')).values() for i in values}
classified = {row['id'] for row in csv.DictReader(open('references/three-examples-classification.csv'))}
assert manifest == classified, (manifest - classified, classified - manifest)
print(f'{len(classified)} IDs classified')
PY
```

The complete, row-level result (ID, family, status, reason) is [`three-examples-classification.csv`](three-examples-classification.csv), SHA-256 `8294e41177b73b2e596c7587f6761a249317decfc2c8e8ad63b51469527cf65f`. It is the exact-ID authority for all 595 classifications; no name wildcard is being silently omitted.

## Classification criteria

| Status | Meaning |
|---|---|
| **direct** | The demonstrated render feature maps to existing EASEL scene, primitive, camera, light, line, point, or CPU-rasterizer behavior. Port boilerplate still changes package import, `WebGLRenderer` construction, and browser sizing; that does not change the visual feature. |
| **adapt** | CPU rendering is plausible with existing EASEL primitives, but source needs a specific adaptation (animation/control API, utility-generated geometry, data conversion, multi-scene arrangement, or a permitted CPU approximation). It is not a compatibility promise. |
| **unsupported_gpu** | The example's defining result depends on shaders/TSL, WebGL/WebGPU compute, GPU render targets/readback, postprocessing, shadow mapping, PBR/environment processing, continuous blend behavior, texture-array/3D sampling, or another capability prohibited by the CPU renderer contract. |
| **external** | The defining behavior depends on a non-renderer integration: DOM CSS renderer, Web Audio, WebXR/device/media/worker API, physics engine, importer/exporter/decoder, or game input stack. Under the expanded parity policy, this is an implementation candidate when a CPU/browser equivalent exists; it is not automatically out of scope. |

These criteria follow the local renderer implementation at `src/renderers/Renderer.ts` (CPU framebuffer, `CanvasRenderingContext2D`, `ImageData` upload) and the repository renderer constraints in `AGENTS.md`: no WebGL/GPU buffers/shaders/shadow maps/PBR/environment maps; affine nearest sampling; discrete opacity; baked lighting. The public source has `OrbitControls`, `Raycaster`, `InstancedMesh`, `SkinnedMesh`, `Points`, `Sprite`, basic/Lambert/toon/line/points materials, standard primitives, animation classes, CPU format loaders, typed Web Audio, CPU physics, SVG/DOM helpers, and CSS2D/CSS3D overlay renderers. It still has no `WebGPU`, `GLTFLoader`, `EffectComposer`, Ammo, or Rapier implementation.

## Result counts (official `dev` manifest)

| Family | Total | Direct | Adapt | Unsupported GPU | External |
|---|---:|---:|---:|---:|---:|
| css2d | 1 | 0 | 0 | 0 | 1 |
| css3d | 7 | 0 | 0 | 0 | 7 |
| games | 1 | 0 | 0 | 0 | 1 |
| misc | 23 | 0 | 6 | 0 | 17 |
| physics | 13 | 0 | 0 | 0 | 13 |
| svg | 2 | 0 | 0 | 0 | 2 |
| webaudio | 4 | 0 | 0 | 0 | 4 |
| webgl | 297 | 6 | 64 | 165 | 62 |
| webgpu | 221 | 0 | 1 | 204 | 16 |
| webxr | 26 | 0 | 0 | 0 | 26 |
| **Total** | **595** | **6** | **71** | **369** | **149** |

### Direct IDs (6)

`webgl_buffergeometry_lines`, `webgl_buffergeometry_lines_indexed`, `webgl_camera`, `webgl_lines_colors`, `webgl_buffergeometry`, `webgl_buffergeometry_indexed`.

These are feature-level direct ports: EASEL still needs its own imports and renderer setup, and Phong materials in the two indexed/triangle pages become the supported CPU Lambert/basic equivalent.

### Adaptation IDs (70)

`misc_animation_groups`, `misc_animation_keys`, `misc_boxselection`, `misc_controls_orbit`, `misc_raycaster_helper`, `misc_uv_tests`; `webgl_geometry_colors`, `webgl_geometry_cube`, `webgl_geometries`, `webgl_geometry_extrude_shapes`, `webgl_geometry_shapes`, `webgl_lights_hemisphere`, `webgl_math_obb`, `webgl_sprites`; `webgl_animation_keyframes`, `webgl_animation_multiple`, `webgl_animation_skinning_additive_blending`, `webgl_animation_skinning_blending`, `webgl_animation_skinning_ik`, `webgl_animation_skinning_morph`, `webgl_animation_walk`; `webgl_batch_lod_bvh`, `webgl_buffergeometry_attributes_integer`, `webgl_buffergeometry_attributes_none`, `webgl_buffergeometry_drawrange`, `webgl_buffergeometry_instancing`, `webgl_buffergeometry_instancing_interleaved`, `webgl_buffergeometry_selective_draw`; `webgl_geometry_convex`, `webgl_geometry_extrude_splines`, `webgl_geometry_minecraft`, `webgl_geometry_nurbs`, `webgl_geometry_spline_editor`, `webgl_geometry_teapot`, `webgl_geometry_terrain`, `webgl_geometry_terrain_raycast`, `webgl_geometry_text`, `webgl_geometry_text_shapes`, `webgl_geometry_text_stroke`; `webgl_instancing_dynamic`, `webgl_instancing_raycast`, `webgl_interactive_buffergeometry`, `webgl_interactive_cubes`, `webgl_interactive_cubes_ortho`, `webgl_interactive_raycasting_points`; `webgl_lod`, `webgl_marchingcubes`; `webgl_modifier_curve`, `webgl_modifier_simplifier`, `webgl_modifier_subdivision`, `webgl_modifier_tessellation`; `webgl_morphtargets`, `webgl_morphtargets_face`, `webgl_morphtargets_horse`, `webgl_morphtargets_sphere`; `webgl_multiple_elements`, `webgl_multiple_elements_text`, `webgl_multiple_scenes_comparison`, `webgl_multiple_views`; `webgl_panorama_cube`, `webgl_panorama_equirectangular`; `webgl_points_billboards`, `webgl_points_dynamic`, `webgl_points_waves`; `webgl_random_uv`; `webgl_raycaster_bvh`, `webgl_raycaster_sprite`, `webgl_raycaster_texture`; `webgl_shadowmesh`, `webgl_simple_gi`.

Four adaptation IDs are already represented in EASEL's current registry (`www/examples/registry.ts`): `misc_animation_groups`, `misc_animation_keys`, `misc_controls_orbit`, and `misc_raycaster_helper`. They are not catalog-expansion work.
The two remaining misc adaptation IDs (`misc_boxselection` and `misc_uv_tests`) are now registered as Canvas2D examples, so all 76 WebGL direct/adaptation IDs in the manifest have website routes; `webgpu_camera` is an additional portable WebGPU route.

## Adaptation implementation status

The 64 WebGL adaptation IDs are now implemented as Canvas2D examples under `www/examples/canvas/`, with `canvas_` source-file prefixes and exact upstream `webgl_*` route IDs retained in `meta.id`. They are all registered in `www/examples/registry.ts` under the `Canvas2D (adapted)` category. The portable WebGPU `webgpu_camera` route is registered separately under the same category. No `www/examples/webgl/` or `misc-adapted/` directory is used, and no renderer-bound WebGL/WebGPU feature was added.

The example viewer's THREE.js tab now replaces the EASEL canvas with a native THREE.js `WebGLRenderer` canvas and restores the EASEL canvas when switched back. This is a renderer comparison surface; adapted pages remain subject to the CPU substitutions recorded in the classification CSV.

## Expanded non-GPU parity policy

The original counts are a baseline audit, not a final exclusion list. The current parity goal admits every external family whose behavior can run through CPU, Canvas2D, DOM, SVG, WebAudio, physics, or browser APIs:

| Family | Current implementation direction | Boundary that remains excluded |
|---|---|---|
| Physics | Integrate or implement CPU physics and preserve the example's scene/input contract. | GPU-backed physics visualization or GPU compute is excluded; CPU/WASM physics is allowed. |
| WebAudio | Implement browser WebAudio graphs, analyzers, and controls alongside EASEL. | A GPU visualizer stage must have a CPU/Canvas2D replacement. |
| CSS2D/CSS3D/SVG | Implement DOM/SVG overlays and SVG-to-Canvas2D geometry where the example needs it. | A GPU renderer cannot be introduced to fake the output. |
| Loaders/exporters/decoders | Add CPU parsers, serializers, font/SVG conversion, and supported texture decoders. | GPU-only transcoding or shader-defined material semantics need a CPU equivalent or remain excluded. |
| Controls/games | Add Canvas2D pointer, keyboard, first-person, map, transform, and game-input controls. | Device/GPU submission is not part of a Canvas2D control implementation. |
| WebXR | Implement session/input/device integration where useful. | XR frame submission requiring a WebGL/WebGPU layer remains device/GPU-bound. |

Only inherently GPU/device-bound behavior is excluded. The external rows therefore require a second implementation audit rather than being permanently rejected.

Implemented external routes currently include `misc_controls_arcball`,
`misc_controls_drag`, `misc_controls_fly`, `misc_controls_map`,
`misc_controls_pointerlock`, `misc_controls_trackball`, `misc_controls_transform`, `misc_exporter_gltf`, `misc_exporter_gltf_normals`, `misc_exporter_exr`, `misc_exporter_obj`, `misc_exporter_gcode`, `misc_exporter_ply`, `misc_exporter_stl`, `css2d_label`, `css3d_mixed`, `css3d_molecules`, `css3d_orthographic`, `css3d_periodictable`, `css3d_sandbox`, `css3d_sprites`, `css3d_youtube`, `games_fps`, `svg_lines`, `svg_sandbox`, all four
WebAudio IDs, `physics_rapier_basic`, `physics_rapier_character_controller`, and the NRRD/TGA/VOX/G-code/OBJ/PCD/PDB/PLY/STL/SVG/XYZ
loader IDs including the exact CPU TrueType route `webgl_loader_ttf`, `physics_rapier_instancing`, `physics_rapier_terrain`,
`physics_rapier_vehicle_controller`, `physics_ammo_instancing`,
`physics_ammo_terrain`, `physics_jolt_instancing`, `physics_ammo_break`,
`physics_ammo_cloth`, `physics_ammo_rope`, `physics_ammo_volume`, the nine CPU/browser media
routes (`webgl_materials_video`, `webgl_materials_video_webcam`,
`webgpu_materials_video`, `webgpu_video_frame`, `webgpu_video_panorama`,
`webgl_video_kinect`, `webgl_morphtargets_webcam`,
`webgl_video_panorama_equirectangular`, `webgl_worker_offscreencanvas`), plus
the Canvas2D `webgpu_camera` adaptation.
The remaining external rows stay explicit backlog until their reusable CPU or
browser contract and validation exist. WebGPU rows are not blanket exclusions: the
portable subset is audited independently. `webgpu_camera` now has an exact-ID
Canvas2D route and source-matched THREE comparison adapter for its
camera/helpers/basic-wireframe/points behavior, while only
renderer-, shader-, compute-, render-target-, or device-bound behavior remains out
of scope.
The exact external implementation backlog and package/asset boundaries are recorded in [`three-external-candidate-matrix.md`](three-external-candidate-matrix.md).

### Required named families

* **misc:** the camera/input controls have reusable EASEL controls and exact-ID routes, and TransformControls now includes a visible CPU gizmo with projection-based handle picking; `misc_exporter_gltf`, `misc_exporter_gltf_normals`, `misc_exporter_exr`, `misc_exporter_obj`, `misc_exporter_gcode`, `misc_exporter_ply`, and `misc_exporter_stl` have CPU exporter routes, while the remaining exporter pages are format work.
* **physics (all 13):** external integration candidates (`physics_ammo_*`, `physics_jolt_instancing`, `physics_rapier_*`); `physics_rapier_basic` has a CPU fixed-step/AABB baseline, `physics_rapier_character_controller` has a triangle-aware CPU capsule controller, `physics_rapier_instancing` has deterministic CPU sphere/AABB instancing and collision response, `physics_rapier_terrain`/`physics_ammo_terrain` have CPU heightfields, `physics_rapier_vehicle_controller` has CPU wheel/throttle/brake state, `physics_ammo_instancing`/`physics_jolt_instancing` have deterministic CPU instance transforms, `physics_rapier_joints` has deterministic CPU distance/spherical/revolute/spring constraints, and Ammo break/cloth/rope/volume use `ParticleWorld` CPU constraints. WASM engine identity remains a boundary.
* **webaudio (all 4):** external browser-API candidates; all four exact IDs now have typed `AudioGraph`/Canvas2D routes.
* **media/workers:** `webgl_materials_video`, `webgl_materials_video_webcam`, `webgpu_materials_video`, `webgpu_video_frame`, `webgpu_video_panorama`, `webgl_video_kinect`, `webgl_morphtargets_webcam`, `webgl_video_panorama_equirectangular`, and `webgl_worker_offscreencanvas` now have VideoTexture/WebCodecs/OffscreenCanvas CPU routes with explicit permission, decode, worker, and fallback boundaries.
* **svg (all 2):** external SVG/Canvas2D candidates; both exact IDs have partial SVG parser/DOM renderer routes; full SVG shape/style/transform parity remains backlog.
* **css2d/css3d (all 8):** all eight external DOM-overlay IDs now have CSS2D/CSS3D examples and cleanup paths (`css2d_label`; `css3d_mixed`, `molecules`, `orthographic`, `periodictable`, `sandbox`, `sprites`, `youtube`).
* **games:** `games_fps` has CPU/browser pointer-lock, capsule, and AABB collision helpers; the exact three.js GLTF/triangle-octree route remains partial and its renderer path remains Canvas2D.
* **loaders:** all **64** loader pages are implementation candidates—55 `webgl_loader_*` and 9 `webgpu_loader_*`—subject to CPU parser/decoder and material-equivalent work. `webgl_loader_gcode`, `webgl_loader_gltf`, `webgl_loader_gltf_instancing`, `webgl_loader_gltf_progressive_lod`, `webgl_loader_gltf_variants`, `webgl_loader_bvh`, `webgl_loader_imagebitmap`, `webgl_loader_nrrd`, `webgl_loader_texture_tga`, `webgl_loader_vox`, and `webgl_loader_svg` now have exact CPU routes; OBJ/MTL material mapping is CPU-backed; GPU-only compressed/transcoded formats remain conditional.
* **webgl:** its 6 direct plus 64 webgl-adaptation candidates are the only rendering catalog pool. The remaining 165 GPU-specific pages include shaders, render targets, postprocessing, shadow maps, PBR/env maps, GPGPU, fat lines, blending, 3D/array textures, and path tracing; 60 are loader/media/worker external integrations.
* **webgpu:** renderer-bound pages remain excluded only where their defining behavior is GPU/TSL/compute/render-target/PBR/shadow based. `webgpu_camera` now has a CPU/Canvas2D adaptation and source-matched THREE comparison adapter; 16 loader/media/XR rows remain external integrations and the remaining pages require individual behavior audits.
* **webxr:** all 26 are device/session candidates for non-rendering integration; five exact input/session routes now expose Canvas2D desktop fallbacks, while XR frame submission remains GPU/device-bound.
* **tests:** the manifest entries are `misc_uv_tests` (adaptation: EASEL sampler limits differ) and `webgl_furnace_test` (unsupported GPU/material conformance test). The upstream unit/e2e/treeshake test tree is validation code, not website examples.

The seven `dev` IDs absent from the installed r185 snapshot are all classified in the CSV: `webgpu_deferred`, `webgpu_lightprobes`, `webgpu_lightprobes_complex`, `webgpu_lightprobes_sponza`, `webgpu_materials_retroreflection`, `webgpu_particles_soft`, and `webgpu_xr_shadows`. The first six are GPU-bound; the last is WebXR/device-bound.

## Focused source checks and rejected alternatives

1. **“WebGL prefix implies unsupported” — rejected.** The 76 WebGL direct/adaptation pages were fetched and inspected for source features, rather than classifying only by filename. Basic scene/geometry/camera/light/line/point/billboard concepts form the 76-page candidate pool; `webgpu_camera` is audited as a separate portable WebGPU page.
2. **“All candidate pages are direct” — rejected.** `misc_uv_tests` imports `UVsDebug`; `webgl_geometry_extrude_shapes` imports `TrackballControls`; animation, modifier, raycast, multi-view, and generated-geometry pages have material API/data/control differences. They remain adaptation work.
3. **“Spotlights/point sprites are direct” — rejected after source inspection.** `webgl_lights_spotlight.html` enables `PCFShadowMap` and configures spot-light shadows; `webgl_points_sprites.html` needs additive blending and non-discrete transparency. Both are GPU-bound, consistent with EASEL's no-shadow-map and discrete-opacity contract.
4. **“Loader demos work through existing EASEL Loader classes” — only partly true.** `src/index.ts` now exports CPU `OBJLoader` and `STLLoader` in addition to generic loaders; format-specific GLTF/SVG/decoder add-ons still require separate integration work.

## Tests and performance/benchmark surfaces

These are not `examples/*.html` catalog items and must not be copied as showcase ports.

* The upstream r185 snapshot has **263 test blobs**: 232 `test/unit/src/**`, 8 `test/unit/addons/**`, 6 `test/e2e/**`, and 6 `test/treeshake/**` (plus runner/config files). Core math, geometry, camera, animation, event, raycast, and primitive test concepts can inform EASEL unit coverage. Audio, WebGL/WebGPU renderer, addons/loaders/exporters, browser e2e, and treeshaking validate distinct upstream architecture and should not be ported wholesale. Exact paths: `evidence/upstream-test-perf-paths.txt`.
* The upstream r185 snapshot has **no `performance/` tree**. Its benchmark-like example surfaces are `webgl_instancing_performance`, `webgl_performance`, `webgl_shadowmap_performance`, `webgpu_performance`, and `webgpu_performance_renderbundle`; all are correctly non-port targets (GPU/performance mechanism). EASEL instead owns `benchmarks/render-suite.mjs` and `benchmarks/compare-results.mjs` (`package.json` scripts `bench`, `bench:compare`).

## Completed catalog expansion

The adaptation batches covered animation/skinning, geometry and generated shapes, instancing/interaction/modifiers/morph targets, panoramas, points, raycasting, UVs, shadow overlays, lighting approximations, CPU loaders, SVG/DOM output, WebAudio, and physics. Each module keeps the exact upstream route ID while using only EASEL's CPU/Canvas2D or browser integration APIs. Remaining external candidates still need their own implementation and validation; GPU/device-only renderer behavior stays outside this catalog.

## Baseline and validation path for downstream example work

```sh
# baseline (no product changes in this audit)
bun run examples:source-parity                 # expected exit 0, seconds
bun run typecheck:website                      # expected exit 0, usually seconds
bun run biome:check                            # expected exit 0, usually seconds
# after a catalog slice
bun run www:build                              # expected exit 0; docs generation then Astro build
```

For each new page, additionally load it through the website and capture a Canvas2D screenshot; acceptance is that the scene renders with the documented CPU limitations, not GPU-pixel equality. A parity failure means registration/module location diverged; website typecheck failure means registry/example typing diverged; a visual failure requires per-example geometry/material investigation, not relaxing renderer constraints.

## Confidence, unknowns, and constraints

**Confidence: high** for population/counts and the reviewed external boundaries; **medium** for adaptation feasibility and WebGPU rejection coverage because source-level feature presence cannot prove visual quality under CPU rasterization and the WebGPU family still requires a page-level audit. Exact page classifications are intentionally conservative: any mandatory GPU behavior wins over otherwise portable scene setup.

Unresolved owner decisions: desired number of additions per release, whether examples require upstream asset provenance/downloads, and whether optional GUI/control behavior is part of example parity. No product or durable configuration files were edited.
