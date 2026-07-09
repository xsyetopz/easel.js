# Contributing to EASEL.js

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [Bun](https://bun.sh/)

## Setup

```bash
git clone https://github.com/xsyetopz/easel.js.git
cd easel.js
bun install
```

## Development

```bash
bun run dev                 # generate docs, then run Astro dev server
bun run test:run            # bun:test
bun run typecheck           # package TypeScript check
bun run typecheck:tests     # tests TypeScript check
bun run typecheck:website   # website TypeScript check
bun run biome:check         # Biome lint + format
bun run www:build           # build docs/examples site
```

## Code style

Biome handles formatting and linting. The config enforces:

- Tabs for indentation
- Double quotes
- Organized imports

The package source is TypeScript. Website components and pages are Astro files with TypeScript frontmatter and typed client scripts. Prefer explicit interfaces at module boundaries and keep public exports stable.

Mark overriding members with `override`. Do not add inline lint suppressions; fix the code or adjust the rule in `biome.jsonc` with a clear reason.

## Core principles

- **KISS** - prefer the simplest solution that works today.
- **YAGNI** - do not build future features until they are needed.
- **No over-engineering** - three similar lines of code is better than a premature abstraction.

## Making changes

1. Create a branch from `main`.
2. Make focused changes.
3. Run the checks that cover the touched surface. For broad changes, run:

   ```bash
   bun run biome:check
   bun run typecheck
   bun run typecheck:tests
   bun run typecheck:website
   bun run test:run
   bun run www:build
   ```

4. Open a pull request against `main`.

Keep one concern per PR. If a refactor is needed to support a feature, split it into a separate PR.

## Pull request checklist

- [ ] Relevant typecheck command passes.
- [ ] Relevant tests pass.
- [ ] `bun run biome:check` passes.
- [ ] Docs, examples, and generated docs are updated when public behavior changes.
- [ ] Commit messages explain intent.
- [ ] PR description covers motivation, approach, and validation.

## Architecture

EASEL.js is a Canvas2D software renderer. The pipeline runs on the CPU: scene traversal, fog culling, painter/depth-aware ordering, light baking, scanline rasterization, CPU depth testing for opaque fragments, framebuffer write, and Canvas2D upload.

No WebGL, GPU buffers, shader programs, PBR materials, shadow maps, or environment maps belong in this renderer. See [AGENTS.md](AGENTS.md) for the current repository map and renderer boundaries.

## Code of Conduct

All contributors must follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions will be licensed under the ISC License.
