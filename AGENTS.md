# Repository guide

EASEL.js is `@xsyetopz/easel`, a TypeScript CPU-only Canvas2D 3D renderer; `src/index.ts` owns the public surface and `REVISION`.
Read [CONTRIBUTING.md](CONTRIBUTING.md) before editing; it owns contribution, API-parity, validation, license, security, PR, commit, and release policy.
The nearest nested `AGENTS.md` adds subtree instructions and takes precedence when it differs from this file.

## Map
- `src/`: library source and API JSDoc; see `src/AGENTS.md` and narrower guides.
- `tests/`: Bun tests mirroring source plus integration, example, and policy tests; see `tests/AGENTS.md`.
- `www/`: Astro site, manual, generated API pages, and registered examples; see `www/AGENTS.md`.
- `scripts/` and `package.json`: policy generators, checks, build scripts, and the release gate; `benchmarks/` owns CLI performance suites.
- `assets/` and `fixtures/`: licensed sample inputs; `references/` records research and migrations.
- `.github/`: CI, release, Pages, Dependabot, and contribution templates; see `.github/AGENTS.md`.

## Validation and agency
- Choose focused commands from `package.json`; use `bun run release:check` for the full gate.
- Report changed files and actual command results; never invent results, permission, identity, sources, or reviews.
- Agents may edit, validate, stage, and commit locally; local commits must follow the attribution rules in `CONTRIBUTING.md`.
- A human owns all PR activity. Every other external write needs explicit permission for the exact repository, action, and content; credentials are not permission, and otherwise keep a local draft.
- Work only on this repository, use neutral technical language, and refuse unrelated or harmful external content.
