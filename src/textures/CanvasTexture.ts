import type { Wrapping as WrappingMode } from "../core/Constants.ts";
import { Texture, type TextureImageSource } from "./Texture.ts";

/** Texture sourced from a canvas element. */
export class CanvasTexture extends Texture {
  /** String marker identifying this concrete texture subtype. */
  readonly isCanvasTexture = true;

  /** Constructs a texture from a canvas and marks its CPU cache dirty. */
  constructor(
    canvas?: HTMLCanvasElement,
    mapping = 300,
    wrapS: WrappingMode = 0,
    wrapT: WrappingMode = 0,
    magFilter = 1003,
    minFilter = 1003,
    format = 1023,
    type = 1009,
    anisotropy = 1,
  ) {
    super(
      canvas as TextureImageSource,
      mapping,
      wrapS,
      wrapT,
      magFilter,
      minFilter,
      format,
      type,
      anisotropy,
    );
    this.needsUpdate = true;
  }
}
