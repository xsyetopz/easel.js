---
name: using-easeljs
description: >
  Source-grounded guide for AI agents building browser Canvas2D 3D scenes with @xsyetopz/easel (EASEL.js), including Bun/Node, Deno, React, and Astro setup, renderer loops, scene graph, cameras, geometry, materials, textures, lighting, fog, animation, picking, voxel worlds, and CPU rasterizer constraints. Use when working with @xsyetopz/easel, EASEL.js, Canvas2D software rendering, browser CPU graphics, or retro 3D.
license: MIT
---
# Using EASEL.js

Use this skill for `@xsyetopz/easel` EASEL.js: a CPU software renderer and
Canvas2D rasterizer with a THREE.js-style scene graph API. The bundled API
baseline is `@xsyetopz/easel@0.6.1`; rendering remains browser DOM
`HTMLCanvasElement` + Canvas2D even when Bun, Node, Deno, React, or Astro owns
the build.

## When to use

Use when building, reviewing, or debugging an EASEL.js scene, renderer loop,
scene graph, camera, geometry, material, texture, light/fog, animation,
picking, voxel world, loader, or CPU performance path.

## When NOT to use

Do not use for CreateJS EaselJS display-list code, THREE.js/WebGL/WebGPU
implementations, or server/headless rendering without a supplied DOM/canvas
runtime. For a THREE.js migration, also load the dedicated
`threejs-to-easeljs` skill.

## Before coding

1. Identify the runtime and package manager/import mode from project files.
2. Preserve an installed EASEL version; otherwise target the bundled 0.6.1
   declarations and confirm `EASEL.REVISION`.
3. Read exactly one matching row in the routing table, then follow its linked
   guide. Use the generated API surfaces for names and signatures.
4. Keep examples copy-safe: include imports, browser canvas assumptions,
   renderer/scene/camera setup, render call, and disposal when resources are
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

## Task routing

| Need | Read | Then copy | Validate |
| --- | --- | --- | --- |
| Package identity, install, npm/Bun/Node, or version provenance | [getting-started](references/getting-started.md) | The import and `EASEL.REVISION` probe | Installed version; local source if registry 0.6.1 is unavailable |
| Deno-managed browser app | [Deno guide](references/deno.md) | The import-map/browser entry or [Deno template](references/templates.md) | `deno task check`, bundle, and a real browser canvas |
| Export names, class shapes, constants, or missing API lookup | [API exports](references/api-exports.md), [API signatures](references/api-signatures.md), [API constants](references/api-constants.md) | Only declarations verified by the source | Installed `dist/*.d.ts`; state `UNKNOWN` if absent |
| Scene graph, transforms, camera, orbit, or resize | [scene and cameras](references/scene-and-cameras.md) | The matching scene/orbit/resize recipe | Matrix update, projection aspect, and browser render |
| Renderer, Canvas2D sizing, RAF loop, profiling, or disposal | [rendering guide](references/rendering.md) | Complete scene or loop section | `renderer.render(scene, camera)` and teardown |
| Internal traversal, sorting, shading, or rasterization debugging | [pipeline guide](references/pipeline.md) | Public `Renderer` first; inspect internals only when needed | Source/declaration stage names |
| Built-in or manual geometry | [geometry guide](references/geometry.md) | Primitive or manual attribute recipe | Positions, normals, UVs, indices, bounding sphere |
| Materials, lighting, fog, side, layer, or opacity | [materials and lighting](references/materials-and-lighting.md) | Lit/unlit/fog section | Discrete opacity, fog/background precedence |
| Texture sources, canvas pixels, or atlases | [textures guide](references/textures.md) | `DataTexture`/atlas recipe | `needsUpdate`, compact dimensions, nearest-neighbor assumptions |
| Clips, tracks, animator, or grouped voxel rigs | [animation guide](references/animation.md) | Named-node or step-track example | `Animator.update(dt)` and track paths |
| Pointer coordinates, `Raycaster`, or voxel DDA | [picking guide](references/picking.md) | DOM scaling or complete DDA implementation | Backing-store pixels, camera adapter, max distance |
| Voxel meshing, chunk streaming, or replacement | [voxel worlds](references/voxel-worlds.md) | Canonical mesher from [template assets](references/templates.md) | Face visibility, rebuild cap, disposal, bounds |
| Lines, points, sprites, or wire overlays | [primitives guide](references/primitives.md) | Matching primitive recipe | Public object/material declarations |
| Loaders, image assets, or serialization | [loaders and serialization](references/loaders-and-serialization.md) | Typed loader or manual image recipe | Exact `.d.ts` callback/promise shape |
| CPU budgets, profiling, rebuilds, and lifecycle | [performance and lifecycle](references/performance-and-lifecycle.md) | Structural timing and cleanup recipe | Timing fields, low internal resolution, disposal |
| Library identity or backend boundary review | [boundaries guide](references/boundaries.md) | CPU/Canvas2D alternative, not GPU code | No CreateJS/THREE/WebGL/WebGPU API leakage |
| Choose and copy a starter project | [template catalog](references/templates.md) | `assets/templates/<name>/` | Native install/check; remote 0.6.1 caveat |

## Minimal verified setup

```ts
import * as EASEL from "@xsyetopz/easel";

const renderer = new EASEL.Renderer({ width: 320, height: 180, canvas });
const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
	fov: 60,
	aspect: 320 / 180,
	near: 0.1,
	far: 100,
});
camera.position.set(2, 2, 4);
camera.lookAt(0, 0, 0);
scene.add(new EASEL.AmbientLight(0xffffff, 0.35));
scene.add(
	new EASEL.Mesh(
		new EASEL.BoxGeometry(1, 1, 1),
		new EASEL.LambertMaterial({ color: 0xff5533 }),
	),
);

function frame() {
	scene.updateMatrixWorld();
	renderer.render(scene, camera);
	requestAnimationFrame(frame);
}
frame();
```

## Unknown API rule

If the linked references and installed declarations do not verify a symbol or
behavior, state `UNKNOWN` with the exact missing name. Do not infer from a
THREE.js or CreateJS equivalent. Inspect `node_modules/@xsyetopz/easel/dist/`
or the Deno type cache before making that claim.
