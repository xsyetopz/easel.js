# Performance and lifecycle

Read this when tuning CPU budgets, profiling, rebuilding geometry, or disposing
renderer-owned resources.

## Contents

- [CPU rasterizer constraints](#cpu-rasterizer-constraints)
- [Performance checklist](#performance-checklist)
- [Lifecycle and disposal](#lifecycle-and-disposal)
- [Structural profiler](#structural-profiler)

## CPU rasterizer constraints

EASEL.js renders in CPU memory and uploads pixels to Canvas2D. Design scenes
around CPU costs.

Practical constraints:

- Internal resolution dominates cost. Start low (for example 320×180 or 480×270)
  and scale with CSS.
- Triangle count and overdraw matter. Painter sorting plus scanline fill is CPU
  work.
- Texture sampling is CPU-side. Use compact atlases and small pixel-art textures
  for retro scenes.
- `Material.opacity` is discrete in the base material: 0 opaque, 8 nearly
  transparent.
- Transparent or semi-transparent surfaces need predictable draw order. Split
  transparent geometry when needed.
- Geometry rebuilds allocate arrays and should be budgeted across frames.
- Dispose replaced geometries/materials/textures when they are no longer used.

Useful defaults:

```ts
const renderer = new EASEL.Renderer({ width: 320, height: 180, canvas });
const material = new EASEL.BasicMaterial({
  side: EASEL.Side.Front,
  shading: EASEL.Shading.Flat,
});
```

For voxel worlds:

- share materials per atlas/pass
- split opaque and transparent meshes
- rebuild only dirty chunks
- cap rebuilds per frame
- compute bounding spheres after mutating position arrays

## Performance checklist

CPU rasterizer performance checklist:

- Lower internal render resolution first.
- Avoid rebuilding geometry every frame.
- Share materials/textures.
- Split static and dynamic scene branches.
- Keep transparent geometry limited and ordered.
- Use fog and render distance to reduce far geometry.
- Profile with the structural timing object in the section below.
- Dispose replaced geometries.

Voxel strategy:

```ts
const MAX_REBUILDS_PER_FRAME = 2;
let rebuilt = 0;
for (const chunk of dirtyChunks) {
  if (rebuilt >= MAX_REBUILDS_PER_FRAME) break;
  rebuild(chunk);
  rebuilt++;
}
```

## Lifecycle and disposal

EASEL.js does not expose WebGL/WebGPU device resources. Cleanup still matters
for arrays, images, and detached canvases.

Common cleanup calls:

```ts
mesh.geometry?.dispose();
material.dispose();
texture.dispose();
renderer.dispose();
```

Chunk replacement pattern:

```ts
const old = meshes.get(key);
if (old) {
  scene.remove(old);
  old.geometry?.dispose();
  meshes.delete(key);
}

const mesh = new EASEL.Mesh(geometry, sharedMaterial);
meshes.set(key, mesh);
scene.add(mesh);
```

Renderer lifecycle:

- create one renderer per canvas
- stop animation loop before disposal
- remove input listeners separately
- call `renderer.dispose()` when canvas renderer is no longer needed

Material sharing:

- share atlas materials across many meshes
- dispose shared materials only after all meshes using them have been removed

## Structural profiler

`RenderTimings` is an internal renderer type rather than a root package export;
pass a structural object to the third `render` argument. Inspect returned timing
fields such as `totalMs`, `shadeRasterMs`, and `uploadMs` when present.

```ts
import type * as EASEL from "@xsyetopz/easel";

export function renderWithTiming(
  renderer: EASEL.Renderer,
  scene: EASEL.Scene,
  camera: EASEL.PerspectiveCamera,
): Record<string, number | boolean | undefined> {
  const timings: Record<string, number | boolean | undefined> = {
    profileTraversal: true,
  };
  renderer.render(scene, camera, timings);
  return timings;
}
```
