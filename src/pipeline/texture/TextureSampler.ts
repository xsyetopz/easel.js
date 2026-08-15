import { TextureClamp } from "./TextureClamp.ts";

interface TextureData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Nearest-neighbor texture sampler from pixel data. */
export class TextureSampler {
  readonly #clamp = new TextureClamp();

  /**
   * Samples a texture at UV coordinates using nearest-neighbour lookup.
   * Clamp-to-edge coordinates map to min(size - 1, floor(clamp(uv) * size)).
   */
  sample(
    texture: TextureData,
    u: number,
    v: number,
  ): { r: number; g: number; b: number; a: number } {
    const { x, y } = this.#clamp.clamp(u, v, texture.width, texture.height);
    const idx = (y * texture.width + x) * 4;
    return {
      r: texture.data[idx],
      g: texture.data[idx + 1],
      b: texture.data[idx + 2],
      a: texture.data[idx + 3],
    };
  }
}
