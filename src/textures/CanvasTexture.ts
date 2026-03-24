import { Texture } from "./Texture.ts";

/** Texture sourced from a canvas element. */
export class CanvasTexture extends Texture {
	/**
	 * When true, the renderer sets `needsUpdate = true` before every frame so
	 * the texture is re-uploaded from the canvas automatically.
	 */
	autoUpdate = false;

	constructor(canvas: HTMLCanvasElement) {
		super(canvas);
		this.needsUpdate = true;
	}
}
