# Rendering and frame loops

Read this for the public `Renderer`, Canvas2D framebuffer upload, sizing,
background precedence, subsystem ownership, animation loops, disposal, and
structural timing. App code should call `Renderer.render(scene, camera)`; the
advanced pipeline is documented separately in [the pipeline guide](pipeline.md).

## Contents

- [Renderer and framebuffer](#renderer-and-framebuffer)
- [Scene background precedence](#scene-background-precedence)
- [Renderer orchestration](#renderer-orchestration)
- [Render-loop recipes](#render-loop-recipes)
- [Complete example: mounting a complete scene](#complete-example-mounting-a-complete-scene)
- [Complete example: responsive canvas resize](#complete-example-responsive-canvas-resize)

## Renderer and framebuffer

`Renderer` orchestrates the CPU pipeline and uploads the software framebuffer to
a Canvas2D context.

Constructor:

```ts
new Renderer({ width?: number, height?: number, canvas?: HTMLCanvasElement, pixelRatio?: number })
```

Public properties/methods:

- `domElement: HTMLCanvasElement | undefined`
- `width: number`
- `height: number`
- `pixelRatio: number`
- `render(scene, camera, timings?)`
- `setSize(width, height)`
- `setPixelRatio(ratio)`
- `setClearColor(Color | hex | r,g,b)`
- `dispose()`

Renderer setup:

```ts
const renderer = new EASEL.Renderer({ width: 320, height: 180, canvas });
renderer.setClearColor(0x000000);
```

Canvas sizing model:

- `width` and `height` are internal render target dimensions.
- Canvas CSS size can differ from internal resolution for pixel-art scaling.
- `setSize` resizes framebuffer and canvas backing store.
- CPU work scales with internal pixel count, not CSS size.

For profiling, use the structural timing recipe in the
[performance and lifecycle guide](performance-and-lifecycle.md). `RenderTimings`
is an internal renderer type rather than a root package export; pass a
structural object to the third `render` argument instead.

## Scene background precedence

`Scene.background` accepts a `Color`, packed hex number, or ready `Texture`. The
renderer clears a texture background in screen space: it stretches the texture
to the framebuffer and samples source pixels with nearest-neighbor coordinates.
A texture with no ready pixel data falls back to the renderer's clear color.
Before clearing, auto-updating background textures are refreshed when
`scene.fog` is absent. Fog always wins the initial clear: when fog is set, the
framebuffer is cleared to the fog color and the background texture/color is not
used. Geometry is then rasterized with the same fog color.

## Renderer orchestration

Use this pattern when an app owns the canvas, camera, scene, fog, and per-frame
render call in one rendering subsystem.

Pattern:

- Create `Renderer` with fixed internal width/height and supplied canvas.
- Create one long-lived `Scene`.
- Create `PerspectiveCamera` with config-derived `fov`, `aspect`, `near`, and
  `far`.
- Create `Fog`, assign `scene.fog`, and set clear color before rendering.
- Use orbit-camera math or another camera controller to set camera position and
  `lookAt` target.
- Call `scene.updateMatrixWorld()` before `renderer.render(scene, camera)` when
  transforms changed outside renderer-managed traversal.

Recipe:

```ts
const renderer = new EASEL.Renderer({ width, height, canvas });
const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
    fov,
    aspect: width / height,
    near,
    far,
});
scene.fog = new EASEL.Fog({
    color: new EASEL.Color(0, 0, 0),
    near: fogStart,
    far: fogEnd,
});
renderer.setClearColor(0, 0, 0);
```

## Render-loop recipes

Basic loop:

```ts
let frameId = 0;
function frame() {
    update();
    scene.updateMatrixWorld();
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(frame);
}
frameId = requestAnimationFrame(frame);
```

Stop loop:

```ts
cancelAnimationFrame(frameId);
renderer.dispose();
```

Delta time:

```ts
let last = performance.now();
function frame(now: number) {
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    animator.update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
}
```

## Complete example: mounting a complete scene

```ts
import * as EASEL from "@xsyetopz/easel";

export function mountBasicScene(canvas: HTMLCanvasElement): () => void {
    const renderer = new EASEL.Renderer({ width: 320, height: 180, canvas });
    const scene = new EASEL.Scene();
    const camera = new EASEL.PerspectiveCamera({
        fov: 60,
        aspect: 320 / 180,
        near: 0.1,
        far: 100,
    });
    camera.position.set(2, 2, 4);
    camera.lookAt(0, 0, 0);
    const mesh = new EASEL.Mesh(
        new EASEL.BoxGeometry(1, 1, 1),
        new EASEL.LambertMaterial({ color: 0xff6644 }),
    );
    scene.add(new EASEL.AmbientLight(0xffffff, 0.35));
    scene.add(mesh);
    let frameId = 0;
    function frame() {
        mesh.rotation.y += 0.02;
        scene.updateMatrixWorld();
        renderer.render(scene, camera);
        frameId = requestAnimationFrame(frame);
    }
    frame();
    return () => {
        cancelAnimationFrame(frameId);
        mesh.geometry?.dispose();
        mesh.material?.dispose();
        renderer.dispose();
    };
}
```

## Complete example: responsive canvas resize

```ts
import type * as EASEL from "@xsyetopz/easel";

export function resizeRenderer(
    renderer: EASEL.Renderer,
    camera: EASEL.PerspectiveCamera,
    width: number,
    height: number,
): void {
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}
```
