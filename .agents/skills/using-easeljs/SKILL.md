---
name: using-easeljs
description: >
  Source-grounded guide for AI agents building browser Canvas2D 3D scenes with @xsyetopz/easel (EASEL.js), including Bun/Node, Deno, React, and Astro setup, renderer loops, scene graph, cameras, geometry, materials, textures, lighting, fog, animation, picking, audio, controls, loaders, exporters, and CPU rasterizer constraints. Use when working with @xsyetopz/easel, EASEL.js, Canvas2D software rendering, browser CPU graphics, or retro 3D.
license: MIT
---
# Using EASEL.js

Use this skill for `@xsyetopz/easel` EASEL.js: a CPU software renderer and
Canvas2D rasterizer with a THREE.js-style scene graph API. The bundled API
baseline is `@xsyetopz/easel@0.7.0`; rendering remains browser DOM
`HTMLCanvasElement` + Canvas2D even when Bun, Node, Deno, React, or Astro owns
the build.

## When to use

Use when building, reviewing, or debugging an EASEL.js scene, renderer loop,
scene graph, camera, geometry, material, texture, light/fog, animation,
picking, audio, controls, loader, exporter, or CPU performance path.

## When NOT to use

Do not use for CreateJS EaselJS display-list code, THREE.js/WebGL/WebGPU
implementations, or server/headless rendering without a supplied DOM/canvas
runtime. For a THREE.js migration, also load the dedicated
`threejs-to-easeljs` skill.

## Before coding

1. Identify the runtime and package manager/import mode from project files.
2. Use the installed EASEL revision from `EASEL.REVISION` in your codebase.
3. Read exactly one matching row in the routing table, then follow its linked
   guide. Use the generated API surfaces for names and signatures.
4. Keep examples copy-safe: include imports, browser canvas assumptions,
   renderer/scene/camera/setup, render call, and disposal when resources are
   replaced. Cite the guide used for non-trivial choices.

## Agent anti-rules

- Do not add WebGL/WebGPU, GPU buffers, shader programs, `navigator.gpu`, or
  GPU lifecycle concepts; EASEL.js is CPU scanline rasterization + Canvas2D upload.
- Do not use CreateJS `createjs.Stage`/`Ticker`/`Bitmap`, or THREE.js APIs in an
  EASEL.js implementation.
- Do not invent constructors, options, callbacks, exports, or continuous alpha;
  material opacity is discrete (`0` opaque through `8` nearly transparent).
- Do not import package subpaths unless the project exports and the linked API
  docs prove them. Deno CLI checks are not proof of browser rendering.
- Dispose replaced geometries, textures, materials, and renderers; keep
  transparent geometry explicitly ordered.
- For audio in EASEL 0.7+, use `AudioGraph` instead of global `AudioContext`.

## Task routing

| Need | Read | Then copy | Validate |
| --- | --- | --- | --- |
| Package identity, Bun install, or version | `src/index.ts` (`REVISION = "0.7.0"`) | The import and revision check | Installed version matches `dist/index.d.ts` |
| Deno-managed browser app | [Deno guide](references/deno.md) | The import-map/browser entry or [Deno template](references/templates.md) | `deno task check`, bundle, and a real browser canvas |
| Export names, class shapes, constants, or missing API | [API exports](references/api-exports.md), [API signatures](references/api-signatures.md), [API constants](references/api-constants.md) | Only declarations verified by the source | Installed `dist/index.d.ts`; state `UNKNOWN` if absent |
| Scene graph, transforms, camera, orbit, or resize | [scene and cameras](references/scene-and-cameras.md) | The matching scene/orbit/resize recipe | Matrix update, projection aspect, and browser render |
| Renderer, canvas2D sizing, RAF loop, profiling (RenderTimings, sortObjects), or disposal | [rendering guide](references/rendering.md) | Complete scene or loop section | `renderer.render(scene, camera)` and teardown |
| Internal traversal, sorting, shading, or rasterization debugging | [pipeline guide](references/pipeline.md) | Public `Renderer` first; inspect internals only when needed | Source/declaration stage names |
| Built-in or manual geometry | [geometry guide](references/geometry.md) | Primitive or manual attribute recipe | Positions, normals, UVs, indices, bounding sphere |
| Materials, lighting, fog, side, layer, or opacity | [materials and lighting](references/materials-and-lighting.md) | Lit/unlit/fog section | Discrete opacity, fog/background precedence |
| Texture sources, canvas pixels, or atlases | [textures guide](references/textures.md) | `DataTexture`/atlas recipe | `needsUpdate`, compact dimensions, nearest-neighbor assumptions |
| Clips, tracks, animator, or grouped voxel rigs | [animation guide](references/animation.md) | Named-node or step-track example | `Animator.update(dt)` and track paths |
| Pointer coordinates, `Raycaster`, or voxel DDA | [picking guide](references/picking.md) | DOM scaling or complete DDA implementation | Backing-store pixels, camera adapter, max distance |
| Voxel meshing, chunk streaming, or replacement | [voxel worlds](references/voxel-worlds.md) | Mesher from [template assets](references/templates.md) | Face visibility, rebuild cap, disposal, bounds |
| Lines, points, sprites, or wire overlays | [primitives guide](references/primitives.md) | Matching primitive recipe | Public object/material declarations |
| Loaders, image assets, or serialization | [loaders and serialization](references/loaders-and-serialization.md) | Typed loader or manual image recipe | Exact `.d.ts` callback/promise shape |
| Audio visualization or synthesis | `src/audio/AudioGraph.ts`, `src/audio/CanvasAudioVisualizer.ts` | `AudioGraph` + `drawFrequencyBars`/`drawTimeDomainWaveform` | AudioContext hookup, visualizer configuration |
| CPU budgets, profiling, rebuilds, and lifecycle | [performance and lifecycle](references/performance-and-lifecycle.md) | Structural timing and cleanup recipe | Timing fields, low internal resolution, disposal |
| Controls (orbit, arcball, drag, fly, map, pointerlock, trackball, transform) | `src/controls/*.ts` | Right control class (e.g., `OrbitControls`) | Attach to DOM, enable events, disable when done |
| Cameras with projection (PerspectiveCamera, OrthographicCamera, camera projection presets) | `src/cameras/*.ts`, `src/cameras/Camera.ts` | Correct camera constructor + projection setup | Aspect ratio, near/far, viewport |
| Cameras/controls with projection presets | `www/examples/camera2/*.js` | Direct copy of preset scene | Preview in browser |
| Loaders (GLTF, OBJ, PLY, STL, etc.) | `src/loaders/*.ts` | Correct loader class with callbacks | Progress, error handling, disposal |
| Exporters (OBJ, PLY, STL, GCode, EXR, GLTF) | `src/exporters/*.ts` | Correct exporter class | Read scene graph, write file, disposal |
| Library identity or backend boundary review | [boundaries guide](references/boundaries.md) | CPU/Canvas2D alternative, not GPU code | No CreateJS/THREE/WebGL/WebGPU API leakage |
| Choose and copy a starter project | [template catalog](references/templates.md) | `assets/templates/<name>/` | Native install/check; remote 0.7.0 caveat |

## Categories of examples

EASEL 0.7 ships with examples organized in these categories:

- `canvas/**`: Raw Canvas2D rendering (geometry, interaction, animation, loader helpers)
- `camera2/**`: Camera projection presets (PerspectiveCamera, ortho, arcball, fly, sprint, etc.)
- `camera/**`: Camera controls and utilities
- `css/**`: CSS2D/CSS3D overlay examples
- `css2d/`, `css3d/`: CSS-based 3D overlays
- `games/**`: Simple interactive games
- `misc/**`: Utilities (raycaster helpers, uv tests, exporters)
- `physics/**`: Bullet/Rapier-based character/vehicle physics (CPU, external)
- `svg/**`: SVG piping and sandbox
- `webaudio/**`: Audio tools (orientation, sandbox, timing, visualizer)

Example catalog: 203 files across 9 directories registered in `www/examples/registry.ts`.

## Minimal verified setup (Three.js BoxGeometry + MeshNormalMaterial gist)

```ts
import * as EASEL from "@xsyetopz/easel";

const canvas = new HTMLCanvasElement({ width: 320, height: 180 });
const renderer = new EASEL.Renderer({ width: 320, height: 180, canvas });
const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 70,
  aspect: 320 / 180,
  near: 0.01,
  far: 10,
});
camera.position.z = 1;

const geometry = new EASEL.BoxGeometry(0.2, 0.2, 0.2);
const material = new EASEL.MeshNormalMaterial();

const mesh = new EASEL.Mesh(geometry, material);
scene.add(mesh);
scene.add(new EASEL.AmbientLight(0xffffff, 0.5));

function animate(time: number) {
  mesh.rotation.x = time / 2000;
  mesh.rotation.y = time / 1000;
  renderer.render(scene, camera);
}

// In production apps, use requestAnimationFrame with proper disposal:
renderer.setAnimationLoop(animate);
```

## Unknown API rule

If the linked references and installed declarations do not verify a symbol or
behavior, state `UNKNOWN` with the exact missing name. Do not infer from a
THREE.js or CreateJS equivalent. Inspect `node_modules/@xsyetopz/easel/dist/`
or the Deno type cache before making that claim.

## Renowned changes from 0.6 to 0.7

See `references/migration-0.6-to-0.7.md` for detailed API changes: audio APIs (`AudioGraph`, `CanvasAudioVisualizer`), separate `Camera` base + `OrthographicCamera`/`PerspectiveCamera`, new control sets (FlyControls, MapControls, PointerLockControls, ArcballControls), NURBSCurve/NURBSSurface/NURBSVolume, new exporters (EXR, GLTF, GCode, MTL), unified `Material` base, enhanced loaders (BVHLoader, NRRDLoader, PDBLoader, TTFLoader), character/vehicle physics (`CharacterController`, `VehicleController`), new helpers (`ArrowHelper`, `PolarGridHelper`), and `RenderTimings` profiling扩展。
