# Website and examples

Scope: `www/`; root `astro.config.mjs` owns Astro/Starlight routing, aliases, and build output.

## Ownership map
- `astro/content/manual/` is hand-written documentation; `astro/content/docs/docs/` is ignored output generated from `src/**/*.ts` JSDoc.
- `components/`, `runtime/`, `styles/`, `loaders/`, and `utils/` own the site shell and example execution.
- `examples/<category>/<id>/` mirrors one three.js r186 example, named by `meta.upstream`: `three.js` is the original adapted to `setup(canvas, params)`, `easel.js` is the EASEL port, and helper modules may sit beside them. EASEL renders with Canvas2D, so upstream `webgl_*` ids become `canvas_*` ids in the `canvas` category; `misc_*` and `webaudio_*` ids stay as they are. `examples/registry.ts` is generated from those modules by `bun run examples:registry`.
- `public/` owns static site assets. Library test assets belong in repository `assets/` or `fixtures/`, not here.

## Change rules
- Never hand-edit generated API Markdown; edit source JSDoc and run `bun run docs:generate`.
- Port line by line and keep upstream counts, camera, and colors. List every visible or behavioral difference in `meta.differences`; never emulate three.js output with per-pixel CPU work.
- Start each `three.js` file with `// Adapted from three.js r186 examples/<upstream>.html.` and `// Copyright 2010-2026 three.js authors. MIT License.`; listen on the canvas, not `window` or `document`, and release every listener in `cleanup`.
- Annotate non-empty `controls` exports with `/** @type {import("../../../types/controls.ts").ControlDefinition[]} */`, or `typecheck:website` fails once the example is registered.
- Both sides parse the same checked-in data from `assets/` (`?raw`, or a `.base64` sibling for binary). Copy an upstream asset only with license evidence, pin its hash in `tests/examples/ExampleAssets.test.ts`, and add its `assets/README.md` row; otherwise substitute and record it as a difference.
- Pass three.js light intensities and `colorSpace` settings verbatim; EASEL matches r186 lighting scale and color management.
- Preserve base-path-aware links and browser-only boundaries; do not make package source depend on Astro or website runtime code.
- Run `bun run examples:registry`, `bun run typecheck:website`, `bun run examples:catalog`, and `bun test tests/examples`; run `bun run www:build` for site/config changes.
