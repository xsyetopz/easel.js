# Geometry indices and data textures

Cards for two data contracts that do not match three.js. Geometry takes
its index through an accessor. A `DataTexture` is a cropped, cached copy
of its source that you refresh explicitly. The runnable files are in
`assets/examples/`. The tier is Executed with a stub Canvas2D host under
Bun, not a browser. Local numbers come from
`sh assets/examples/verify.sh examples` on macOS arm64 with Bun 1.4.2 and
tsc 7.0.2.

## Contents

- Index accessor
- DataTexture size and update

## Index accessor

**Definition.** `Geometry.index` is a read-write accessor, and `Geometry`
has no `setIndex()` method. Assigning a `Uint16Array` or `Uint32Array`
keeps that array as is. Assigning a `number[]` converts it: to
`Uint32Array` when any index exceeds 65,535, and to `Uint16Array`
otherwise. Assigning `undefined` clears the index, and the vertices are
then drawn in order (`src/geometry/Geometry.ts`). Vertex data goes in
through `setPositions`, `setNormals`, `setUVs`, and `setColors`, or through
`setAttribute(name, new Attribute(array, itemSize))`. `Attribute` replaces
three.js `BufferAttribute`.

**Use when.**

- Building indexed geometry by hand, for example quads or voxel faces, or
  porting `setIndex` calls.

**Do not use when.**

- The mesh has no shared vertices. Leave `index` undefined and emit the
  triangles in order.

**Example.**

```ts
export function createQuad(): Geometry {
  const geometry = new Geometry();
  geometry.setPositions([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);
  // Writable accessor; there is no setIndex() method.
  geometry.index = [0, 1, 2, 2, 3, 0];
  geometry.computeBoundingSphere();
  return geometry;
}
```

Runnable: `assets/examples/geometry-index.ts`.

**Cost removed.** `TypeError: setIndex is not a function`, and quads that
lose a triangle. Local run: the indexed quad drew 361 px. With `index`
cleared, it drew 190 px, because 4 sequential vertices make only one
triangle. A `number[]` became a `Uint16Array`, and an index of 70000
produced a `Uint32Array`.

**Verify.**

1. `sh assets/examples/verify.sh examples` prints `PASS geometry-index`.
1. `bun scripts/easel_api.ts show Geometry` shows `set index(...)` and no
   `setIndex`.

## DataTexture size and update

**Definition.** Each CPU texture cache is at most 128x128 pixels.
`new DataTexture(data, width, height)` requires `data.length` to equal
`width * height * 4`. When the source is larger than 128x128, the cache
keeps only the upper-left 128x128 region. It crops rather than resamples.
The cache is a copy of `texture.image.data`, so writes to the source do
not show until you set `texture.needsUpdate = true` and call
`texture.update()` (`src/textures/DataTexture.ts`,
`src/textures/Texture.ts`). Image-backed textures are also capped at
128x128 and use nearest-neighbor sampling. UVs are interpolated affinely,
not perspective-correct.

**Use when.**

- Building texture atlases, or painting into texture pixels at run time.

**Do not use when.**

- The art needs more than 128x128 texels in one texture. Split it across
  several materials, or lower its resolution.

**Example.**

```ts
export function paintPixel(
  texture: DataTexture,
  x: number,
  y: number,
  rgb: number,
): void {
  const source = texture.image as { data: Uint8ClampedArray; width: number };
  const i = (y * source.width + x) * 4;
  source.data[i] = (rgb >> 16) & 0xff;
  source.data[i + 1] = (rgb >> 8) & 0xff;
  source.data[i + 2] = rgb & 0xff;
  // The sampled cache is a copy; mark it dirty and rebuild it explicitly.
  texture.needsUpdate = true;
  texture.update();
}
```

Runnable: `assets/examples/datatexture.ts`.

**Cost removed.** Atlases that lose three quarters of their tiles, and
painting that never appears. Local run: a 256x256 source reported
`width`/`height` 128x128. After a raw write the red channel read 0, and
after `needsUpdate` plus `update()` it read 255.

**Verify.**

1. `sh assets/examples/verify.sh examples` prints `PASS datatexture`.
1. `texture.width <= 128 && texture.height <= 128` for every atlas.
