# Library source

Scope: `src/`, except where a nearer guide applies.

## Ownership map
- `index.ts` owns `REVISION` and every public export; update it when adding, removing, or renaming public API.
- Feature directories own implementation and public JSDoc; matching tests normally live under `tests/<feature>/`.
- `renderers/Renderer.ts` orchestrates Canvas2D rendering; `pipeline/` owns CPU traversal through framebuffer upload.
- `loaders/` owns resource lifecycle and format parsing; `geometry/`, `materials/`, `textures/`, `objects/`, and `core/` own the data contracts they consume.

## Change rules
- Inspect the owning declaration, callers, exports, mirrored tests, and relevant docs/examples before editing.
- Follow the Three.js parity and API-style decisions in `CONTRIBUTING.md`; do not copy GPU-only state into this CPU library.
- Public behavior changes require source JSDoc and appropriate tests/examples; generate API Markdown instead of editing generated pages.
- Run the narrowest matching `bun test tests/<feature>` plus `bun run typecheck`; add `bun run api:check-modern`, `bun run docs:check-public`, and `bun run docs:generate` for public API work.
