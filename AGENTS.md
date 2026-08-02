# AGENTS.md

EASEL.js is a TypeScript Canvas2D software renderer for browser-side 3D scenes.
The npm/JSR package is `@xsyetopz/easel`; current source revision is `0.6.1`;

## Source of truth

- `package.json` - scripts, package metadata, dependency policy, release gate.
- `src/index.ts` - exported public API and `REVISION`.
- `src/renderers/Renderer.ts` and `src/pipeline/` - renderer behavior and CPU
  rasterization contracts.
- `www/docs/classes/` - API docs source used by `bun run docs:generate`.
- `www/examples/` and `www/examples/registry.ts` - examples shown on the
  website.
- `README.md` and `CONTRIBUTING.md` - user-facing setup and contribution flow.

Read exact files before claims or edits. Do not rely on stale generated output
when the source file exists.

## Repository map

| Path             | Purpose                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `src/core/`      | `EventDispatcher`, `Node`, `Scene`, `Clock`, `Raycaster`, `Layers`, constants              |
| `src/cameras/`   | `Camera`, `OrthographicCamera`, `PerspectiveCamera`                                        |
| `src/math/`      | Vectors, matrices, quaternion, Euler, Color, Ray, Frustum, bounds, utilities               |
| `src/geometry/`  | `Geometry`, attributes, primitive geometry builders                                        |
| `src/materials/` | Material base, basic/lambert/toon/line/points/dashed-line materials                        |
| `src/textures/`  | `Texture`, `CanvasTexture`, `DataTexture`, `FramebufferTexture`, `VideoTexture`            |
| `src/objects/`   | `Mesh`, `Group`, lines, points, sprite, instancing, skinning                               |
| `src/lights/`    | Ambient, directional, point, spot, hemisphere lights                                       |
| `src/animation/` | Animator, actions, clips, tracks, bindings, mixers                                         |
| `src/curves/`    | Curve, path, shape, 2D/3D curve primitives                                                 |
| `src/loaders/`   | File/image/texture/object/material/geometry/animation loaders                              |
| `src/helpers/`   | Axes, box, grid, and light helpers                                                         |
| `src/renderers/` | Public Canvas2D `Renderer`                                                                 |
| `src/pipeline/`  | Traversal, sorting, projection, shading, rasterization, depth/framebuffer, texture helpers |
| `tests/`         | `bun:test` suites mirroring `src/`, mostly `.test.ts`                                      |
| `benchmarks/`    | CLI render benchmarks and comparison tools                                                 |
| `www/`           | Astro website, docs source, examples, styles, generated Starlight content                  |
| `.github/`       | Issue templates, PR template, governance, CI, release, deploy workflows                    |

## Commands

Use the cheapest command that validates the changed surface.

```bash
bun run typecheck           # package TypeScript
bun run typecheck:tests     # tests TypeScript
bun run typecheck:website   # website TypeScript
bun run tests:no-any        # test-suite any guard
bun run examples:source-parity
bun run biome:check         # lint + format gate
bun test            # bun:test
bun run docs:generate       # regenerate Starlight docs from www/docs/classes
bun run www:build           # docs/examples site build
bun run build               # package build
bun run release:check       # full release gate
```

## Pipeline contract

The renderer is CPU-only and Canvas2D-only.

1. `SceneTraversal` walks the scene graph and emits draw calls.
2. `FogCuller` removes fog-hidden work.
3. `PainterSort` groups opaque and transparent calls; opaque calls can render
   front-to-back, transparent calls render sorted for blending.
4. `WorldToView` and `ViewToScreen` project to screen space with integer
   snapping.
5. `LightBaker`, `FlatShader`, and `GouraudShader` bake lighting before
   rasterization.
6. `Rasterizer`, `ScanlineFill`, `EdgeWalker`, `AffineUVSampler`, and
   `GouraudInterpolator` fill pixels.
7. `DepthBuffer` is a CPU `Uint16Array` used for renderer-managed opaque depth
   tests and writes.
8. `Framebuffer`, `PixelWriter`, and `FramebufferUpload` produce Canvas2D
   `ImageData` output.

## Renderer boundaries

Do not add WebGL, GPU buffers, shader programs, shadow maps, PBR materials,
environment maps, or GPU lifecycle concepts.

Allowed constraints and current behavior:

- `OrthographicCamera` and `PerspectiveCamera` both exist.
- UV interpolation is affine. Perspective camera textures may warp; that is
  documented behavior.
- Opaque fragments use a CPU depth buffer when material flags allow it.
- Transparent materials still require sorted draw order and explicit layering
  where scenes overlap.
- Lighting is flat or Gouraud, baked before rasterization; no per-pixel
  Phong/PBR lighting.
- Texture sources clamp to 128×128 and sample nearest-neighbor.
- `Scene.background` accepts `Color`, hex number, or screen-space `Texture`; fog
  color overrides it.
- Opacity is discrete; do not introduce continuous float alpha behavior without
  changing tests/docs.

When adding a rendering feature, ask: would it fit a CPU scanline rasterizer
with Canvas2D upload and no GPU state? If not, it does not belong here.

## Docs and examples

- API docs live in `www/docs/classes/*.ts`; generated Markdown under
  `www/astro/content/docs/docs/` is rebuilt by `bun run docs:generate`.
- Examples live in `www/examples/**/*.js` and must be registered in
  `www/examples/registry.ts`.
- If public API behavior changes, update README, AGENTS, docs source, examples,
  and generated docs as needed in the same change.
- Keep examples crawlable and source-adjacent; do not move them into a separate
  opaque demo shell.

## Code style

- Source is TypeScript. Website pages/components are Astro with TypeScript
  frontmatter and client scripts.
- Tests use `bun:test`; paths mirror `src/` and use the `@/` alias for package
  source.
- Biome owns formatting and import organization. Preserve tabs, double quotes,
  and local naming style.
- Avoid inline suppressions. Fix the type, rule, or contract instead.
- Preserve public exports, constructor shapes, option names, error messages, and
  documented defaults unless the user explicitly asks for an API change.

## Validation reporting

Final replies for code/doc edits must include:

- Files changed.
- What changed.
- Commands run and results.
- Anything not verified.
