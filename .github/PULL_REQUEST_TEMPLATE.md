## Summary

-

## Renderer boundary

- [ ] Fits the CPU-only Canvas2D renderer model.
- [ ] Does not add WebGL state, GPU buffers, shader programs, z-buffer behavior, PBR materials, environment maps, or shadow maps.
- [ ] Preserves public API shape unless the change is explicitly breaking.

## Validation

Run the checks that cover this change and paste the results.

- [ ] `bun run biome:check`
- [ ] `bun run typecheck`
- [ ] `bun run test:run`
- [ ] `bun run www:build` when docs, examples, or website files changed

## Docs and examples

- [ ] Updated docs/examples when behavior or public API changed.
- [ ] Added or updated tests for renderer, math, pipeline, or examples behavior.
