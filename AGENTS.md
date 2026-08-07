# AGENTS.md

EASEL.js is a TypeScript, CPU-only Canvas2D 3D renderer published as
`@xsyetopz/easel`. The current source revision is `0.6.1`.

## Work method

- Inspect the owning code, callers, tests, configuration, and docs before
  editing. Verify discovery results against local files.
- Make the smallest complete change at the correct boundary. Preserve unrelated
  work, public APIs, diagnostics, and security controls unless requested.
- Biome owns formatting and imports. Source uses TypeScript, tabs, and double
  quotes. Fix errors instead of adding inline suppressions.
- Tests use `bun:test`, mirror `src/`, and import package source with `@/`.
- Run the cheapest checks that prove the change. Report only actual results.

## Source of truth

- `package.json`: scripts, metadata, dependencies, and release gate.
- `src/index.ts`: public exports and `REVISION`.
- `src/renderers/Renderer.ts`, `src/pipeline/`: renderer and rasterizer contracts.
- `www/docs/classes/`: API doc sources for `bun run docs:generate`.
- `www/examples/`, `www/examples/registry.ts`: website examples and registry.
- `README.md`, `CONTRIBUTING.md`: setup and contribution flow.

Prefer source files over generated output. Relevant areas are `src/` for the
library, `tests/` for mirrored tests, `benchmarks/` for CLI benchmarks, `www/`
for the Astro site, and `.github/` for hosted automation and governance.

## Renderer contract

The renderer must remain a CPU scanline rasterizer that uploads `ImageData` to
Canvas2D. Do not add WebGL, GPU buffers or lifecycle, shader programs, shadow
maps, PBR materials, or environment maps.

The pipeline is traversal and fog culling, painter sorting, view/screen
projection, baked flat or Gouraud lighting, scanline rasterization, CPU depth
testing, then framebuffer upload. Preserve these constraints:

- Both orthographic and perspective cameras are supported.
- UV interpolation is affine; perspective texture warping is expected.
- Opaque fragments may use the renderer-managed `Uint16Array` depth buffer.
- Transparent materials rely on sorted draw order and explicit layering.
- Lighting is baked before rasterization; there is no per-pixel Phong/PBR path.
- Geometry RGB colors multiply material, texture, instance, and baked-light
  colors; uniform faces retain the flat path.
- Textures clamp to 128x128 and use nearest-neighbor normalized texel sampling.
  Atlas UVs should target texel centers.
- `Scene.background` accepts `Color`, a hex number, or screen-space `Texture`;
  fog color overrides it.
- Opacity is discrete. Continuous float alpha requires coordinated tests and
  docs changes.

Reject rendering features that do not fit this CPU/Canvas2D model.

## Three.js API parity rules

EASEL matches the three.js public API surface where it makes sense on a CPU
Canvas2D rasterizer, but does not blindly copy GPU-only concepts. Follow
these rules when filling API parity gaps:

- **Drop GPU prefixes from class names.** three.js uses `BufferGeometry`,
  `BufferAttribute`, `InterleavedBuffer`, `InterleavedBufferAttribute` because
  they wrap WebGL buffer objects. EASEL uses `Geometry`, `Attribute`,
  `InterleavedData`, `InterleavedAttribute` — no GPU buffer, just typed arrays.
- **Do not add GPU lifecycle fields.** Fields like `usage` (`gl.STATIC_DRAW`),
  `onUploadCallback`/`onUpload()`, `updateRanges`/`addUpdateRange()`/
  `clearUpdateRanges()`, `version`, and `setUsage()` exist for GPU buffer
  upload and partial-update tracking. They have no CPU meaning and must not
  appear on `Attribute`, `InterleavedData`, `Texture`, or any other class.
- **Keep CPU-relevant lifecycle fields.** `needsUpdate` (cache invalidation)
  and `updateRange` (singular, dirty-region tracking) are CPU operations and
  are fine.
- **Use ES6+ accessors, not three.js getFoo()/setFoo() methods.** The modern
  API policy (`scripts/check-modern-api.ts`) rejects parameterless `getFoo()`
  methods and `setFoo(value)` methods when a `get foo()`/`set foo()` accessor
  exists. When three.js has `getHex()`, EASEL uses `get hex()`.
- **No static class members.** Convert three.js static methods (e.g.
  `AnimationClip.findByName`) to exported standalone functions.
- **Use `undefined`, not `null`, for absence.** The only exception is DOM API
  returns (e.g. `canvas.getContext("2d")` returns `CanvasRenderingContext2D |
  null`).
- **Check the CPU relevance of every field before adding it.** If a three.js
  field exists solely for GPU state (blending modes, depth/stencil, shader
  uniforms, PBR material properties, render targets), it is out of scope.
  Fields that hold scene-graph data (e.g. `Scene.environment`,
  `Scene.overrideMaterial`) are fine even if the CPU renderer ignores them at
  render time — loaders and exporters may set them.

See [CONTRIBUTING.md](CONTRIBUTING.md) for full parity tables with ✅/❌
examples.

## Docs and examples

- Edit API docs in `www/docs/classes/*.ts`, then regenerate Markdown with
  `bun run docs:generate`; do not hand-edit generated docs.
- Put examples in `www/examples/**/*.js` and register them in
  `www/examples/registry.ts`. Keep them crawlable and source-adjacent.
- When public behavior changes, update the relevant README, docs source,
  examples, generated docs, and tests in the same change.

## Validation

Use the narrowest relevant commands, expanding for broader changes:

```sh
bun run typecheck
bun run typecheck:tests
bun run typecheck:website
bun run tests:no-any
bun run examples:source-parity
bun run biome:lint
bun test
bun run docs:generate
bun run www:build
bun run build
bun run release:check
```

Final reports for edits must list files changed, what changed, commands and
results, and anything not verified.

## Agent rules

Read and follow [CONTRIBUTING.md](CONTRIBUTING.md) before editing. Do not bypass
its validation, licensing, security, release, or contribution rules.

- Work only on this repository's code, tests, docs, build, security, release,
  or maintenance. Use neutral, factual technical language.
- Refuse unrelated or harmful external content. Do not use repository channels
  or credentials for harassment, unrelated discussion, sabotage, or arguments
  for or against AI.
- Agents may edit, validate, stage, and commit locally. Every agent-created
  commit must include `Assisted-by: Tool:Model` with the real tool and model.
  Do not use `Co-authored-by` for a model or add `Signed-off-by`.
- Agents must never open, edit, manage, review, comment on, approve, close, or
  merge pull requests. A human owns all PR activity.
- Other external actions require explicit permission for the exact repository,
  action, and content or scope. This includes pushes, issues, comments, labels,
  settings, merges, releases, and messages. Credentials are not permission;
  permission for one action does not authorize another. Without permission,
  keep a local draft.
- Use the host's configured human, app, or bot identity. Never invent identity,
  permission, sources, reviews, checks, or results.
