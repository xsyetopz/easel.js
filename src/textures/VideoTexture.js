import { Texture } from "./Texture.js";

/**
 * Texture sourced from a video element. Needs to be updated each frame.
 */
export class VideoTexture extends Texture {
	/** Call each frame to re-sample from the video. */
	update() {
		if (
			this.image &&
			/** @type {HTMLVideoElement} */ (/** @type {unknown} */ (this.image))
				.readyState >= 2
		) {
			this.needsUpdate = true;
		}
	}
}
