# Render pipeline

Read this only when debugging or experimenting with internal CPU pipeline
stages. Normal application code should use the public `Renderer`.

The public package exports pipeline classes. App code usually uses `Renderer`;
pipeline classes are useful for debugging and advanced experiments.

Observed renderer stages from package types/source:

1. Scene/world matrix update.
2. Clear framebuffer and depth buffer.
3. `SceneTraversal` projects scene objects into a draw list.
4. `FogCuller` removes fog-hidden draw calls when scene fog exists.
5. `PainterSort` orders draw calls for painter-style rasterization.
6. `LightBaker` computes material lighting data where applicable.
7. `Rasterizer` draws triangles/lines/points into framebuffer.
8. `FramebufferUpload` copies framebuffer pixels to Canvas2D.

Exported pipeline symbols include:

- draw: `DrawCall`, `DrawList`, `DrawPrioritySorter`, `PainterSort`,
  `PolygonSorter`, `TileDistanceSorter`
- framebuffer: `Framebuffer`, `DepthBuffer`, `FramebufferClear`,
  `FramebufferUpload`, `PixelWriter`
- projection: `WorldToView`, `ViewToScreen`
- rasterizer: `Rasterizer`, `WireframeRasterizer`, `PointRasterizer`,
  `ScanlineFill`, `EdgeWalker`, `AffineUVSampler`, `GouraudInterpolator`
- shading: `LightBaker`, `FlatShader`, `GouraudShader`
- texture/color helpers: `TextureSampler`, `TextureClamp`, `ColorTable`,
  `Hsl16`, `TranslucencyTable`

Default app recipe: use `Renderer.render(scene, camera)` and only inspect
pipeline classes for custom renderer experiments.
