---
name: using-easeljs
description: EASEL.js 0.7.0 browser scenes, CPU Canvas2D APIs, lifecycle; excludes GPU rendering.
---

# Using EASEL.js

The verified baseline is `@xsyetopz/easel@0.7.0` (`REVISION === "0.7.0"`).

## Use this skill

Use for EASEL.js scene graphs, cameras, CPU rendering, geometry, materials,
textures, lighting, fog, animation, picking, audio, controls, loaders,
exporters, browser setup, lifecycle, or performance. This package is
`@xsyetopz/easel`, not CreateJS EaselJS. For a three.js migration, also use the
`threejs-to-easeljs` skill.

Do not use it to design WebGL/WebGPU renderers, GPU buffers, shaders, PBR,
shadow maps, or headless/server rendering without a supplied DOM/canvas host.

## Rules

- Treat `src/index.ts` and owning source declarations as authority. For an
  installed app, verify its `REVISION` and `dist/**/*.d.ts`; state `UNKNOWN`
  when a requested name is absent.
- Import from `@xsyetopz/easel`; do not guess package subpaths. Root exports are
  indexed in [API exports](references/api-exports.md), and high-use call shapes
  are in [API signatures](references/api-signatures.md).
- Rendering is CPU scanline rasterization into `ImageData`, uploaded to
  Canvas2D. UV interpolation is affine, image textures clamp to 128×128, and
  nearest-neighbor sampling is intentional.
- Material opacity is an integer from `0` (opaque) through `8` (fully
  transparent), and blending requires `transparent = true`. Keep transparent
  geometry explicitly ordered.
- After scene, camera, animation, or control changes, call
  `renderer.prepare(scene, camera)` and then `renderer.render(scene, camera)`.
  EASEL 0.7.0 has no renderer animation-loop or pixel-ratio API.
- Use `requestAnimationFrame`; stop it and dispose controls, replaced geometry,
  materials, textures, audio graphs/analyzers, and the renderer as applicable.
- Do not infer APIs from three.js. Notable 0.7.0 spellings include
  `Loop.Repeat`, `new Track(..., { itemSize })`, `renderer.clearColor = value`,
  and standalone audio visualizer functions.
- Geometry index buffers use the writable `index` accessor. Assign typed indices
  directly, assign a number array for conversion to `Uint16Array` or
  `Uint32Array`, or assign `undefined` to clear it. This accessor replaced the
  historical `setIndex()` method; index buffers remain supported.

## Steps

1. Inspect project runtime, lockfile, installed package version, canvas owner,
   and existing render loop.
2. Choose the closest task in the [reference router](references/index.md) and
   read its focused guide. Use the router's API catalog rows only when that
   guide omits the exact export name or call shape.
3. Build the smallest browser scene: real `HTMLCanvasElement`, `Renderer`,
   `Scene`, concrete camera, renderable object, `prepare`, and `render`.
4. Add controls/loaders/audio only after the base frame renders. Attach browser
   listeners once and retain every teardown handle.
5. Validate with the host project's typecheck and a real browser Canvas2D
   render. Confirm resize updates renderer size, camera projection, and control
   viewport state where applicable.

## Resources

- The [reference router](references/index.md) maps each supported subsystem to
  one focused guide. It also routes exact API lookups and starter templates.

## Verify

Done means imports exist in the 0.7.0 root surface, call shapes match owning
source declarations, the frame uses `prepare` then `render`, teardown is
present, and browser Canvas2D behavior was checked. From this package, run
`python3 scripts/check.py`; from a host project, run its typecheck and browser
render check. Report commands, exit codes, and changed paths separately. Mark
registry, network, Deno, browser, template, or behavioral eval checks
`UNVERIFIED` when they were not run.
