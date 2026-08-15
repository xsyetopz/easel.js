# Rendering and frame lifecycle

`Renderer` owns a CPU framebuffer and optionally uploads it to a Canvas2D
canvas. Application code owns animation scheduling and input listeners.

## Public renderer

```ts
new Renderer({
  width?: number,          // default 300
  height?: number,         // default 150
  canvas?: HTMLCanvasElement,
  sortObjects?: boolean,   // default true
})
```

Public API:

- getters: `domElement`, `width`, `height`, `clearColor`
- setter: `clearColor = Color | packedHex`
- `prepare(scene, camera, force?)`
- `render(scene, camera, timings?)`
- `setSize(width, height)`
- `dispose()`

When no canvas is supplied, a browser host creates one. Without `document`,
`domElement` is `undefined` and render still runs the CPU pipeline without an
upload target. This is not a promise of a complete headless canvas runtime.

EASEL 0.7.0 has no `pixelRatio`, `setPixelRatio`, `setClearColor`, or
`setAnimationLoop`. Use a CSS-scaled low-resolution backing store when desired:

```ts
const renderer = new EASEL.Renderer({ width: 320, height: 180, canvas });
renderer.clearColor = 0x05070a;
canvas.style.width = "960px";
canvas.style.height = "540px";
canvas.style.imageRendering = "pixelated";
```

## Required preparation order

`render()` consumes prepared node world matrices and
`camera.matrixWorldInverse`. It does not update them. After any scene, camera,
animation, or control change:

```ts
renderer.prepare(scene, camera);
renderer.render(scene, camera);
```

`prepare(scene, camera, force)` is equivalent to the renderer's coordinated
scene/camera update boundary. Use `force = true` only when cached transform
state must be rebuilt regardless of dirty flags.

## Frame loop and teardown

```ts
let frameId = 0;
let previous = performance.now();

function frame(now: number): void {
  const dt = Math.min((now - previous) / 1000, 0.25);
  previous = now;

  animator.update(dt);
  controls.update(dt); // omit dt for controls whose update() has no parameter
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  frameId = requestAnimationFrame(frame);
}

frameId = requestAnimationFrame(frame);

function stop(): void {
  cancelAnimationFrame(frameId);
  controls.dispose();
  geometry.dispose();
  material.dispose();
  texture.dispose();
  renderer.dispose();
}
```

`Renderer.dispose()` drops its Canvas2D context reference and drops its
canvas reference only when that canvas is detached. It does not cancel RAF,
remove control listeners, traverse the scene, or dispose scene resources.

## Resize

```ts
function resize(width: number, height: number): void {
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  controls.handleResize?.(); // Trackball/FirstPerson only
}
```

`setSize` resizes framebuffer storage and the canvas backing store. CSS size is
separate. CPU cost primarily follows backing-store pixels and rasterized work.

## Background precedence

`Scene.background` accepts `Color`, packed RGB, `Texture`, or `undefined`.
Texture backgrounds are stretched in screen space from ready CPU pixel data.
When `scene.fog` exists, its color wins the initial clear. Otherwise an absent
or unready background falls back to `renderer.clearColor`.

## Profiling

```ts
const timings: EASEL.RenderTimings = { profileTraversal: true };
renderer.prepare(scene, camera);
renderer.render(scene, camera, timings);
console.table(timings);
```

Timing fields are mutated in place. They cover clear, traversal, fog culling,
sort, shade/raster, upload, total, and optional detailed traversal work.
