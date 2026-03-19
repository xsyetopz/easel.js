import { Texture } from "./Texture.js";

/**
 * Texture sourced from a canvas element.
 */
export class CanvasTexture extends Texture {
	/**
	 * When true, the renderer sets `needsUpdate = true` before every frame so
	 * the texture is re-uploaded from the canvas automatically.
	 * @type {boolean}
	 */
	autoUpdate = false;

	/**
	 * @param {HTMLCanvasElement} canvas
	 */
	constructor(canvas) {
		super(canvas);
		this.needsUpdate = true;
	}
}
