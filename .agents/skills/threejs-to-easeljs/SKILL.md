---
name: threejs-to-easeljs
description: >
  Translate THREE.js scene code and WebGL assumptions into verified @xsyetopz/easel (EASEL.js) 0.6.1 Canvas2D CPU-renderer code. Use when porting scenes, cameras, geometry, materials, textures, render loops, or GPU-specific effects from THREE.js to EASEL.js, and when reviewing a migration for unsupported APIs.
license: MIT
---
# THREE.js to EASEL.js

Use this skill for a deliberate, source-grounded migration from THREE.js to
`@xsyetopz/easel` 0.6.1. The target is a browser `Canvas2D` software renderer,
not a WebGL/WebGPU backend.

## Migration protocol

1. Identify the existing runtime, canvas, package manager, and THREE.js APIs in
   use. Preserve the app's runtime unless the migration requires a change.
2. Read `REFERENCE.md`, then `reference/threejs-migration.md` for mappings and
   `reference/grounding.md` for target constraints and 0.6.1 API anchors.
3. Inspect the target project's installed declarations first. In this checkout
   use `package.json`, `src/index.ts`, and `dist/**/*.d.ts`; elsewhere inspect
   `node_modules/@xsyetopz/easel/dist/` or the configured Deno type cache.
   Verify `EASEL.REVISION === "0.6.1"` before relying on a mapping.
4. Port one boundary at a time: renderer/canvas, scene graph, camera, geometry,
   material/texture, lights/fog, then animation and input. Keep imports and
   constructor signatures exactly as declarations verify them.
5. Remove WebGL/WebGPU device/context/shader/buffer lifecycle code rather than
   wrapping it in dead compatibility branches. Re-express visual intent with
   CPU geometry, materials, textures, and the Canvas2D render loop.
6. Typecheck and render a minimal scene before porting the next subsystem. Mark
   any unmapped symbol or behavior `UNKNOWN` with the declaration path checked.

## Hard boundaries

- Use `Renderer` with an `HTMLCanvasElement`; do not introduce WebGL, WebGPU,
  shader programs, GPU buffers, shadow maps, PBR, or environment maps.
- Use `Node` instead of `Object3D`, `Geometry` instead of `BufferGeometry`, and
  EASEL material names/signatures instead of THREE.js material classes.
- UV interpolation is affine, texture sources clamp to 128×128, and sampling
  is nearest-neighbor. Do not promise perspective-correct texture mapping.
- `Scene.background` accepts `Color`, a packed number, or a screen-space
  `Texture`; fog color wins the initial clear when `scene.fog` is set.
- Preserve disposal when replacing meshes, textures, geometries, or renderers.

## Bundled references

- `REFERENCE.md` -- independent migration map and completion checklist.
- `reference/threejs-migration.md` -- concept mapping and porting recipe.
- `reference/grounding.md` -- 0.6.1 declarations, imports, renderer, scene,
  texture, and unsupported-backend anchors.
