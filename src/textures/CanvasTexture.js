import { Texture } from "./Texture.js";

/**
 * Texture sourced from a canvas element.
 */
export class CanvasTexture extends Texture {
	/**
	 * @param {HTMLCanvasElement} canvas
	 */
	constructor(canvas) {
		super(canvas);
		this.needsUpdate = true;
	}
}
