# CPU render pipeline

Scope: `src/pipeline/`; also inspect `src/renderers/Renderer.ts` when stage order, framebuffer ownership, backgrounds, fog, or upload changes.

## Stage map
- `SceneTraversal.ts` and assembly helpers collect/project draw calls; `FogCuller.ts` culls; `PainterSort.ts` orders them.
- `projection/`, `shading/`, `rasterizer/`, `texture/`, and `framebuffer/` own their named CPU stages; `FramebufferUpload.ts` is the Canvas2D boundary.
- `DrawCall.ts`, `TriangleBuffer.ts`, and `LineBuffer.ts` are contracts shared across stages.

## Invariants
- Keep traversal and fog culling, painter sorting, projection, baked flat/Gouraud lighting, scanline rasterization, CPU depth testing, then `ImageData` upload.
- Do not add WebGL, GPU buffers/lifecycle, shader programs, per-pixel Phong/PBR, shadow maps, or environment maps.
- UV interpolation is affine; textures use nearest normalized sampling and clamp to 128x128. Preserve flat-color and geometry/material/texture/instance/light color multiplication paths.
- Opaque fragments may use the `Uint16Array` depth buffer; transparent materials depend on sorted order and explicit layers. Opacity remains discrete unless tests and docs change together.
- Cover stage changes under `tests/pipeline/` and orchestration changes under `tests/renderers/`; run focused `bun test` paths and `bun run typecheck`.
