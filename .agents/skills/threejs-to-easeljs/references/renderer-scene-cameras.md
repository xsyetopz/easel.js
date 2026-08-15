# Renderer, scene, and cameras

## Main renderer contract

`src/renderers/Renderer.ts` declares one options object:

```ts
const renderer = new EASEL.Renderer({
  canvas,
  width,
  height,
  sortObjects: true,
});
```

Verified public members include `domElement`, `width`, `height`, `sortObjects`, `prepare(scene, camera, force?)`, `render(scene, camera, timings?)`, `setSize(width, height)`, the `clearColor` accessor, and `dispose()`.

The renderer performs CPU scene traversal, fog culling, painter sorting, view and screen projection, baked lighting, scanline rasterization, depth testing, and Canvas2D `ImageData` upload. It has no public WebGL/WebGPU context, pixel-ratio option, `setPixelRatio()`, `setAnimationLoop()`, `setClearColor()`, render target, viewport/scissor, clear-depth/stencil, shader, shadow-map, postprocess, or GPU-resource lifecycle.

Port a Three renderer explicitly:

```ts
const renderer = new EASEL.Renderer({ canvas, width, height, sortObjects: true });
renderer.clearColor = 0x101820;

let request = 0;
function frame(now: number): void {
  update(now);
  renderer.render(scene, camera);
  request = requestAnimationFrame(frame);
}
request = requestAnimationFrame(frame);

function dispose(): void {
  cancelAnimationFrame(request);
  renderer.dispose();
}
```

The constructor and `setSize()` define the internal resolution. If the source used device pixel ratio, choose the framebuffer and CSS sizes explicitly; CPU cost scales with framebuffer pixels.

Resize both renderer and perspective projection:

```ts
renderer.setSize(width, height);
camera.aspect = width / height;
camera.updateProjectionMatrix();
```

Call `renderer.prepare(scene, camera)` when picking or another subsystem needs prepared world, view, and projection state before the next render. Audit custom `matrixAutoUpdate` and `matrixWorldAutoUpdate` behavior against current `Node` signatures rather than copying Three's boolean arguments.

## Scene graph

| Three r185 | EASEL 0.7.0 | Decision |
| --- | --- | --- |
| `Object3D` | `Node` | Adapt the name; verify transform, hierarchy, matrix-update, event, callback, serialization, and subclass uses. |
| `Scene`, `Group` | `Scene`, `Group` | Same roles, but inspect the relied-on fields and consumers. |
| `Scene.background` | `Color`, hex number, or screen-space `Texture` | Adapt environment/cube backgrounds; fog color overrides the initial clear. |
| `Scene.environment` | stored field | Surface-only for the main renderer; the CPU renderer ignores it. |
| `Scene.overrideMaterial` | stored field | Surface-only unless current renderer consumption is established. |

Do not force loader state, physics state, or DOM overlays into renderer parity. Keep application data and subsystem ownership separate where the target boundary permits it.

`src/pipeline/SceneTraversal.ts` establishes main draw branches for ordinary `Mesh`, `Points`, `Line` subclasses with `LineMaterial`, and `InstancedMesh`. An exported subclass without a matching traversal and raster path remains `surface-only` or `UNKNOWN` for drawing.

## Cameras

Both target cameras use one options object, not Three's positional arguments:

```ts
const perspective = new EASEL.PerspectiveCamera({
  fov: 50,
  aspect: width / height,
  near: 0.1,
  far: 1000,
});

const orthographic = new EASEL.OrthographicCamera({
  left: -5,
  right: 5,
  top: 5,
  bottom: -5,
  near: 0.1,
  far: 1000,
});
```

`Camera` owns `projectionMatrixInverse` and `matrixWorldInverse`; projection updates refresh the inverse. Prepared current EASEL cameras can be passed directly to `Raycaster.setFromCamera`. Do not retain an older manual inverse-projection adapter.

| Three r185 camera | Target | Decision |
| --- | --- | --- |
| `PerspectiveCamera` | `PerspectiveCamera({ fov, aspect, near, far, zoom?, tileSize? })` | Adapt constructor and projection updates. |
| `OrthographicCamera` | `OrthographicCamera({ left, right, top, bottom, near, far, zoom?, tileSize? })` | Adapt constructor and projection updates. |
| `ArrayCamera` | exported `ArrayCamera` | Surface-only for multi-view until viewport and subcamera orchestration are established. |
| `StereoCamera` | exported `StereoCamera` | The helper exists; application code owns two-eye composition and viewport behavior. |
| `CubeCamera` | no verified equivalent | Unsupported for cube render-target capture, or `UNKNOWN` if a different role is required. |

The main renderer owns one CPU framebuffer. Multi-view, cube capture, XR, viewport, and scissor composition require a separate design rather than an identically named camera alone.
