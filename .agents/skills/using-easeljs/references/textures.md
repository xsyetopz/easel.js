# Textures and atlases

Read this for texture source types, `DataTexture`, canvas pixel extraction,
nearest-neighbor CPU sampling, and atlas construction.

## Contents

- [Sampling limits](#sampling-limits)
- [Textures and assets](#textures-and-assets)
- [Texture atlas pipeline](#texture-atlas-pipeline)
- [Complete example: canvas pixels as a data texture](#complete-example-canvas-pixels-as-a-data-texture)
- [Complete example: checkerboard atlas](#complete-example-checkerboard-atlas)

## Sampling limits

`AffineUVSampler` linearly interpolates UVs along each scanline; it is not
perspective-correct. Textures viewed through a `PerspectiveCamera` can therefore
warp, which is an expected CPU-rasterizer tradeoff rather than a missing GPU
feature.

Every CPU texture cache, including `DataTexture`, is bounded to 128×128.
Image-backed `Texture` updates use nearest-neighbor resampling
(`imageSmoothingEnabled = false`); oversized `DataTexture` data keeps the
upper-left bounded region. Keep atlases compact and choose dimensions
deliberately.

## Textures and assets

Texture exports:

- `Texture`
- `DataTexture`
- `CanvasTexture`
- `FramebufferTexture`
- `VideoTexture`
- loaders: `TextureLoader`, `ImageLoader`, `ImageBitmapLoader`,
  `DataTextureLoader`

`DataTexture` constructor:

```ts
new EASEL.DataTexture(data?: Uint8ClampedArray, width?: number, height?: number)
```

Pixel-art guidance:

- Build compact atlases.
- Use deterministic UV rectangles.
- After mutating texture data/source, set `needsUpdate = true` and call `update()`.
- Keep texture dimensions small enough for CPU sampling costs.

## Texture atlas pipeline

Use this pattern when source images contain tiles or sprites that need CPU-side
packing before `DataTexture` upload.

Pattern:

- Load an image with `HTMLImageElement` or `ImageBitmap`.
- Draw source pixels to a scratch canvas.
- Read `ImageData` from a context created with `{ willReadFrequently: true }`.
- Copy selected tile pixels into a compact atlas `Uint8ClampedArray`.
- Create `DataTexture` from atlas bytes.
- After data changes, set `texture.needsUpdate = true` and call `texture.update()`.

Use typed-array copying for predictable CPU performance; the complete canvas and
checkerboard functions below are complete examples.

## Complete example: canvas pixels as a data texture

```ts
import * as EASEL from "@xsyetopz/easel";

export function dataTextureFromCanvas(
    canvas: HTMLCanvasElement,
): EASEL.DataTexture {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Missing 2D context");
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const texture = new EASEL.DataTexture(
        new Uint8ClampedArray(image.data),
        image.width,
        image.height,
    );
    texture.needsUpdate = true;
    texture.update();
    return texture;
}
```

## Complete example: checkerboard atlas

```ts
import * as EASEL from "@xsyetopz/easel";

export function makeCheckerAtlas(size = 16): EASEL.DataTexture {
    const data = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            const bright = ((x >> 2) + (y >> 2)) % 2 === 0 ? 240 : 60;
            data[i] = bright;
            data[i + 1] = bright;
            data[i + 2] = bright;
            data[i + 3] = 255;
        }
    }
    const texture = new EASEL.DataTexture(data, size, size);
    texture.needsUpdate = true;
    texture.update();
    return texture;
}
```
