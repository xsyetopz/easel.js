---
title: "Use textures and loaders"
description: "Load image data for nearest-neighbor CPU sampling and keep texture limits visible."
sidebar:
  order: 8
  label: "Textures and loaders"
---

[`Texture`](/docs/textures/Texture/) stores image or raw pixel data for the
CPU sampler. The cache is bounded to 128×128 pixels, filtering stays nearest
neighbor, and EASEL does not generate mipmaps. Atlas UVs should point at texel
centers to avoid sampling neighboring cells.

For browser images, use [`TextureLoader`](/docs/loaders/TextureLoader/) and
assign the resulting texture to a material map. Loader callbacks are
asynchronous, so render a fallback material until the image is ready.

```ts
const loader = new EASEL.TextureLoader();
loader.load(
  "/textures/grid.png",
  (texture) => {
    material.map = texture;
    material.needsUpdate = true;
  },
  undefined,
  (error) => {
    console.error("Texture failed to load", error);
  },
);
```

Model loaders such as [`OBJLoader`](/docs/loaders/OBJLoader/) and
[`GLTFLoader`](/docs/loaders/GLTFLoader/) create scene-graph data for the same
CPU renderer. Source images are reduced to the texture cache limit.

<figure class="manual-render" data-manual-example="texture-surface-review">
  <div class="manual-render__stage">
    <canvas width="16" height="9" role="img" aria-label="Nearest-neighbor texture sampling on a rotating mesh.">
      This render needs a Canvas2D-capable browser.
    </canvas>
    <p data-manual-example-status role="status">Loading render…</p>
  </div>
  <figcaption>Nearest-neighbor texture sampling on a rotating mesh.</figcaption>
</figure>

## Related API

- [Texture](/docs/textures/Texture/)
- [TextureLoader](/docs/loaders/TextureLoader/)
- [ImageLoader](/docs/loaders/ImageLoader/)
- [OBJLoader](/docs/loaders/OBJLoader/)
- [GLTFLoader](/docs/loaders/GLTFLoader/)
