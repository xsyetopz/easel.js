import { Texture } from "./Texture.ts";

/** Texture sourced from a video element. Needs to be updated each frame. */
export class VideoTexture extends Texture {
  autoUpdate = true;

  /** Call each frame to re-sample from the video. */
  update(): void {
    if (
      this.image &&
      (this.image as unknown as HTMLVideoElement).readyState >= 2
    ) {
      this.needsUpdate = true;
    }
  }
}
