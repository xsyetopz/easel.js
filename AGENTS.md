# Repository guide

EASEL.js (`@xsyetopz/easel`) is three.js rebuilt as an optimized,
architecturally consistent CPU renderer that draws only through Canvas2D,
the path three.js dropped long ago. `src/index.ts` owns the public surface
and `REVISION`. `CLAUDE.md` and `GEMINI.md` are symlinks to this file; a
nested `AGENTS.md` refines it for its subtree.

## Design stance

The guiding question is how much a browser CPU rasterizer can do in 3D and
2D before it starts costing users, especially on mobile devices. The answer
can look like an old-school software rasterizer, and that is fine.

- Match three.js API and rendering behavior as far as a CPU rasterizer can
  go with zero overhead. Leave out what is fundamentally GPU-only (shaders,
  render targets, post-processing, shadow maps, PBR/IBL).
- Speed comes first: any change that makes a measured workload 1% or more
  slower is a regression. Measure with `bun run bench` before and after.
- Where full parity would cost CPU time, match three.js only as closely as a
  zero-overhead form allows, and document the approximation. Proven
  rasterizer techniques, JS engine behavior, and Canvas2D tricks are fair
  game when they add no unintended artifacts.
- Artifacts that come from the cheapest math are accepted, not styled:
  affine UVs (perspective correction costs a divide per pixel), vertex
  wobble, 128x128 nearest-neighbor textures, and nine opacity levels. Don't
  "fix" one unless the fix is free.
- Pre-1.0: breaking changes are allowed when they move toward three.js
  parity or speed. Record each one in `CHANGELOG.md`.
- Naming and API style (`Object3D` → `Node`, accessors instead of
  `getX`/`setX`, no statics, `undefined` instead of `null`) follow
  [CONTRIBUTING.md](CONTRIBUTING.md), which also owns contribution, license,
  security, commit, and release policy.

## Commands

Run from the repository root with Bun (`.bun-version`).

- `bun install --frozen-lockfile`
- `bun test` or `bun test <path>`: Bun tests mirroring `src/`
- `bun run typecheck`, `bun run typecheck:tests`, `bun run typecheck:website`
- `bun run biome:lint`
- `bun run api:check-modern` and `bun run docs:check-public`: API style and
  JSDoc policy for public changes
- `bun run api:compare`: regenerates `api-comparison/three-core.txt`
- `bun run examples:registry`: regenerates `www/examples/registry.ts`
- `bun run bench -- --workload=<name>`: render benchmarks (`--list` shows
  the workloads)
- `bun run release:check`: the full gate, and what CI runs

## Map

- `src/`: library source and JSDoc. See `src/AGENTS.md`,
  `src/pipeline/AGENTS.md`, and `src/loaders/AGENTS.md`.
- `tests/`: see `tests/AGENTS.md`.
- `www/`: Astro site, manual, and the three.js r186 example mirror. See
  `www/AGENTS.md`.
- `scripts/`: policy checks and generators. `benchmarks/`: the render
  suite.
- `assets/`: licensed example inputs, pinned by hash in
  `tests/examples/ExampleAssets.test.ts` and listed in `assets/README.md`.
  `fixtures/`: test inputs.
- `references/`: research notes and parity records, including
  `three-examples-mirror-r186.md`.
- `.agents/skills/`: the `using-easeljs` and `threejs-to-easeljs` skills.

## Boundaries

- Don't hand-edit generated files: `api-comparison/three-core.txt`,
  `www/examples/registry.ts`, and the API pages under
  `www/astro/content/docs/`. Rerun their generator instead.
- Add an asset only with license evidence, a hash pin, and an
  `assets/README.md` row. Remove assets that nothing uses.
- Publishing runs only through `.github/workflows/release.yml`.

## Done

- `bun run release:check` passes, or the focused commands for the change
  pass and the report names them.
- Commits follow the attribution rules in `CONTRIBUTING.md`.
