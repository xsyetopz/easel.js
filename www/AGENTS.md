# Website and examples

Scope: `www/`; root `astro.config.mjs` owns Astro/Starlight routing, aliases, and build output.

## Ownership map
- `astro/content/manual/` is hand-written documentation; `astro/content/docs/docs/` is ignored output generated from `src/**/*.ts` JSDoc.
- `components/`, `runtime/`, `styles/`, `loaders/`, and `utils/` own the site shell and example execution.
- `examples/**/*.js` owns runnable examples; `examples/registry.ts` owns lazy registration and catalog metadata.
- `public/` owns static site assets. Library test assets belong in repository `assets/` or `fixtures/`, not here.

## Change rules
- Never hand-edit generated API Markdown; edit source JSDoc and run `bun run docs:generate`.
- Register every example, keep module and registry metadata aligned, and update example tests when behavior or catalog content changes.
- Preserve base-path-aware links and browser-only boundaries; do not make package source depend on Astro or website runtime code.
- Run `bun run typecheck:website`, `bun run examples:catalog`, and relevant `bun test tests/examples`; run `bun run www:build` for site/config changes.
