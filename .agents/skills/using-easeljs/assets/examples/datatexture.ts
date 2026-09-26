// Card: references/geometry-and-textures.md#datatexture-size-and-update
import { DataTexture } from "@xsyetopz/easel";
import { expect } from "./harness.ts";

/** Solid-color RGBA atlas; keep both sides at or below 128 pixels. */
export function createAtlas(size: number, rgb: number): DataTexture {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = (rgb >> 16) & 0xff;
    data[i + 1] = (rgb >> 8) & 0xff;
    data[i + 2] = rgb & 0xff;
    data[i + 3] = 0xff;
  }
  return new DataTexture(data, size, size);
}

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

export function check(): string {
  const big = createAtlas(256, 0x808080);
  const small = createAtlas(64, 0x000000);

  const source = small.image as { data: Uint8ClampedArray };
  source.data[0] = 0xff; // mutate without needsUpdate/update
  const staleRed = small.data?.data[0];
  paintPixel(small, 0, 0, 0xff0000);
  const freshRed = small.data?.data[0];

  expect(big.width === 128 && big.height === 128, "cache should be 128x128");
  expect(big.image?.width === 256, "source keeps its 256 width");
  expect(staleRed === 0, "unflagged mutation should not reach the cache");
  expect(freshRed === 0xff, "needsUpdate + update() should refresh");
  return `256x256 source -> sampled ${big.width}x${big.height}; ` +
    `red after raw write=${staleRed}, after needsUpdate+update()=${freshRed}`;
}
