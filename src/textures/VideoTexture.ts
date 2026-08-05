import type { Wrapping as WrappingMode } from "../core/Constants.ts";
import { Texture, type TextureImageSource } from "./Texture.ts";

/** Texture sourced from a video element and refreshed per frame. */
export class VideoTexture extends Texture {
  /** String marker identifying this concrete texture subtype. */
  readonly isVideoTexture = true;

  /** Constructs a texture from a video element for per-frame CPU sampling. */
  constructor(
    video?: HTMLVideoElement,
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
      video as TextureImageSource,
      mapping,
      wrapS,
      wrapT,
      magFilter,
      minFilter,
      format,
      type,
      anisotropy,
    );
  }

  /** Re-samples the current video frame when one is ready. */
  override update(): this {
    const video = this.image;
    if (isVideo(video)) {
      const minimumReadyState = video.HAVE_CURRENT_DATA || 2;
      if (video.readyState >= minimumReadyState) this.needsUpdate = true;
    }
    return super.update();
  }
}

function isVideo(value: TextureImageSource): value is HTMLVideoElement {
  if (value === undefined || typeof value !== "object") return false;
  return "readyState" in value && typeof value.readyState === "number";
}
