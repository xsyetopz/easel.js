// EASEL 0.7.0: Uint8ClampedArray, at most 128x128, Wrapping.Repeat.
// Generate at the limit: squares of 8 texels keep the 16-square pattern.
import { DataTexture, Wrapping } from "@xsyetopz/easel";

export const SIZE = 128;

export function checker(size: number, square: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const on = (Math.floor(x / square) + Math.floor(y / square)) % 2;
      const v = on === 0 ? 255 : 0;
      data.set([v, v, v, 255], (y * size + x) * 4);
    }
  }
  return data;
}

export function build(): DataTexture {
  const texture = new DataTexture(checker(SIZE, 8), SIZE, SIZE);
  texture.wrapS = Wrapping.Repeat;
  texture.wrapT = Wrapping.Repeat;
  texture.needsUpdate = true;
  return texture;
}
