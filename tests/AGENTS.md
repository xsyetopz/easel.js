# Tests

Scope: `tests/`. Tests use `bun:test`, mirror `src/`, and import package source through `@/`; `tests/tsconfig.json` includes source and scripts.

## Ownership map
- Feature directories mirror library areas; `integration/` covers cross-stage pixels, `examples/` covers the site catalog/runtime, and `scripts/` covers policy generators.
- `_helpers/` owns shared assertions, factories, rasterizer fixtures, and Three.js bridges; `types/` owns test-only declarations.

## Change rules
- Put the closest behavioral test beside its mirrored feature and cover failure/edge paths, not only the happy path.
- Reuse helpers and checked-in fixtures. Do not weaken assertions, strict TypeScript settings, production types, or policy checks to make a test pass.
- Test code must pass the no-`any` policy; use explicit fixtures and narrow unknown values instead of broad casts.
- Run `bun test <target>` first, then `bun run typecheck:tests` and `bun run tests:no-any`; use `bun test` for cross-cutting changes.
