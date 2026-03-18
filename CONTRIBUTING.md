# Contributing to Easel.js

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
bun run dev            # Vite dev server
bun run test           # Vitest (watch mode)
bun run test:run       # Vitest (single run)
bun run typecheck      # tsc --noEmit
bun run biome:check    # Biome lint + format
```

## Code style

Biome handles formatting and linting. The config enforces:

- Tabs for indentation
- Double quotes
- Organized imports

Types are written as JSDoc annotations (`@param`, `@returns`, `@typedef`), not `.ts` files. TypeScript runs in `checkJs` mode for type checking only.

Mark overriding members with `@override`. Do not add inline lint suppressions — fix the code or adjust the rule in `biome.jsonc`.

## Core principles

- **KISS** — prefer the simplest solution that works today.
- **YAGNI** — do not build future features until they are needed.
- **No over-engineering** — three similar lines of code is better than a premature abstraction.

## Making changes

1. Create a branch from `main`
2. Make your changes
3. Run all checks:

   ```bash
   bun run biome:check
   bun run typecheck
   bun run test:run
   ```

4. Open a pull request against `main`

Keep changes focused. One concern per PR. If a refactor is needed to support a feature, split it into separate PRs.

## Pull request checklist

- [ ] `bun run biome:check` passes with no errors
- [ ] `bun run typecheck` passes with no errors
- [ ] `bun run test:run` passes all tests
- [ ] Commit messages explain intent (the *why*, not the *what*)
- [ ] PR description covers motivation, approach, and how it was tested

## Architecture

Easel.js is a Canvas2D software renderer. The rendering pipeline runs entirely on the CPU — no WebGL, no GPU. Before adding a feature, ask: "Would this exist in a CPU scanline rasterizer with no z-buffer?" If no, it does not belong here.

See [`docs/EASEL_vs_THREE.md`](docs/EASEL_vs_THREE.md) for the full design reference.

## Code of Conduct

All contributors must follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
