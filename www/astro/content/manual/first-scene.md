---
title: "Build a first scene"
description: "Create a scene, camera, geometry, material, and Canvas2D render loop."
sidebar:
  order: 3
  label: "First scene"
---

An EASEL scene follows the familiar scene-graph shape: a `Scene` contains a
`Mesh`, the mesh combines `Geometry` and a `Material`, and a camera projects the
result into the renderer's framebuffer.

```ts
import * as EASEL from "@xsyetopz/easel";

const canvas = document.querySelector("canvas");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("A canvas element is required.");
}

const width = 640;
const height = 360;
const renderer = new EASEL.Renderer({ canvas, width, height });

const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 70,
  aspect: width / height,
  near: 0.01,
  far: 10,
});
camera.position.z = 1;

const geometry = new EASEL.BoxGeometry(0.2, 0.2, 0.2);
const material = new EASEL.BasicMaterial({ color: 0x4c8bf5 });
const mesh = new EASEL.Mesh(geometry, material);
scene.add(mesh);

function frame(time: number): void {
  mesh.rotation.x = time / 2000;
  mesh.rotation.y = time / 1000;
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
```

Keep the framebuffer dimensions separate from CSS layout dimensions. When the
canvas changes size, call `Renderer.setSize()` and update the camera's aspect
or frustum before rendering the next frame. See the
[Renderer API](/docs/renderers/Renderer/) for the complete signature.

<figure class="manual-render" data-manual-example="keyframe-timeline">
  <div class="manual-render__stage">
    <canvas width="16" height="9" role="img" aria-label="Animated box rendered to Canvas2D.">
      This render needs a Canvas2D-capable browser.
    </canvas>
    <p data-manual-example-status role="status">Loading render…</p>
  </div>
  <figcaption>Animated box rendered to Canvas2D.</figcaption>
</figure>

## Related API

- [Scene](/docs/core/Scene/)
- [Mesh](/docs/objects/Mesh/)
- [BoxGeometry](/docs/geometry/BoxGeometry/)
- [BasicMaterial](/docs/materials/BasicMaterial/)
- [PerspectiveCamera](/docs/cameras/PerspectiveCamera/)
