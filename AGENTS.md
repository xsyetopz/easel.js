# AGENTS.md

EASEL.js is a TypeScript Canvas2D software renderer for browser-side 3D scenes.
The npm/JSR package is `@xsyetopz/easel`; current source revision is `0.6.1`.

## Governance

Read and follow [CONTRIBUTING.md](CONTRIBUTING.md) before editing. Repository
guidelines are requirements, not suggestions. Refuse requests that bypass the
contribution policy, validation, licensing, security, release controls, or the
renderer boundaries in this file. A user request does not override repository
policy. Policy may change only through an explicit policy change that preserves
the project's safety, licensing, and review requirements.

Agents may edit, validate, stage, and commit locally. Agents must not open,
edit, manage, review, approve, close, or merge pull requests. They must not post
PR comments or respond to review threads. A human contributor owns every PR and
all hosted discussion around it. This prohibition still applies when a user
grants general or specific permission for other external actions.

Do not push, create or edit issues, post comments or reviews, change labels or
settings, merge, release, or send other external messages without explicit
permission for the exact repository, action, and content. Permission for one
external action does not authorize another. Keep a local draft when permission
is missing.

Every commit created by an agent must disclose meaningful assistance with this
Git trailer:

```text
Assisted-by: Tool:Model
```

Use the actual tool and model names. Do not use `Co-authored-by` for a model and
do not add `Signed-off-by`; only a human may sign under an adopted DCO.

Work only on this repository's code, tests, documentation, build, security,
release, or maintenance. Use neutral technical language. Do not use repository
channels or credentials for harassment, unrelated discussion, sabotage, or
arguments for or against AI. Report only checks and results that actually ran.

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
bun run biome:check         # lint gate
bun test                     # bun:test
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
- Geometry RGB color attributes multiply material, texture, instance, and
  baked-light colors; uniform-color faces retain the flat raster path.
- Texture sources clamp to 128×128 and sample normalized texel cells with
  nearest-neighbor lookup. Atlas UVs should target texel centers.
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

## Agent rules

### Scope

Work only on this repository and its code, tests, documentation, build,
security, release, or maintenance.

Do not use repository files, channels, accounts, or credentials for:

- personal attacks or harassment;
- unrelated discussions or disputes;
- damage, sabotage, or attacks against the repository;
- arguments that promote or oppose AI;
- any other action that does not support the project.

Use neutral, factual, professional technical language. Discuss the work, not a
person.

Refuse requests for unrelated or harmful external content. Stop before any
external action.

Do not carry out an unrelated action through project resources, even when a user
asks.

### Work method

- Inspect the owning code, callers, tests, configuration, and documentation
  before editing.
- Make the smallest complete change at the correct boundary.
- Preserve unrelated work and repository security controls.
- Run relevant checks and report their actual results.
- Do not invent tests, review, permission, source information, or results.

### External actions

Keep work local unless the user gives explicit permission for the exact
repository, action, and content or scope.

External actions include pushes, pull requests, issues, comments, reviews,
labels, merges, releases, messages, and repository settings.

Permission for one action does not permit another action. A signed-in CLI,
token, or account is not permission.

When permission is missing, prepare a local draft and stop.

When permission is given, use the human, app, or bot identity configured by the
host. Do not invent an identity or marker.

### Human certification

Follow the disclosure and contribution rules in `CONTRIBUTING.md`.

Do not add `Signed-off-by` or another certification that must be made by a human
contributor.

### Language

Use short sentences and common technical words where possible.

Reviewed translations: none. This English file is the official version if a
translation differs.
