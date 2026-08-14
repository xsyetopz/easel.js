---
title: "Understand the renderer model"
description: "Know what the CPU Canvas2D pipeline does before selecting a feature."
sidebar:
  order: 4
  label: "Renderer model"
---

EASEL is a CPU scanline renderer. It does not create WebGL or WebGPU resources,
compile shaders, or run a per-pixel PBR path. The final image is uploaded as
`ImageData` to a Canvas2D context.

Each `render(scene, camera)` call follows this order:

1. Clear the color and depth buffers from the scene background or fog.
2. Traverse the scene graph and project visible geometry into a draw list.
3. Cull draw calls against scene fog when fog is configured.
4. Painter-sort draw calls when `Renderer.sortObjects` is enabled. See the
   [Renderer API](/docs/renderers/Renderer/) for the complete property list.
5. Bake flat or Gouraud lighting on the CPU.
6. Rasterize triangles, lines, and points with the CPU depth buffer.
7. Upload the framebuffer to Canvas2D.

The renderer's timings object exposes the major stages when profiling is
useful. These stage names describe the actual implementation rather than a GPU
pipeline abstraction.

## Practical limits

- UV interpolation is affine, so perspective texture warping is expected.
- Image textures are cached at no more than 128×128 pixels and sampled with
  nearest-neighbor lookup.
- Transparent materials use sorted draw order and discrete opacity levels.
- Geometry colors multiply material, texture, instance, and baked-light colors.
- Shadows, PBR, shader programs, WebGL, and WebGPU are outside this renderer's
  contract.

Choose a supported CPU path first. If an effect requires a GPU buffer or shader,
keep it outside EASEL and compose the result at the application boundary.

## Related API

- [Renderer](/docs/renderers/Renderer/)
- [RenderTimings](/docs/renderers/RenderTimings/)
- [SceneTraversal](/docs/pipeline/SceneTraversal/)
- [PainterSort](/docs/pipeline/PainterSort/)
- [Rasterizer](/docs/pipeline/Rasterizer/)

## Try an example

[Inspect the runnable examples](/examples/) and compare their source with the
pipeline stages above.
