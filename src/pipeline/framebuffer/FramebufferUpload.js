/** Copies the framebuffer contents to a canvas ImageData. */
export class FramebufferUpload {
	/**
	 * @param {*} framebuffer
	 * @param {CanvasRenderingContext2D} context
	 */
	upload(framebuffer, context) {
		context.putImageData(
			/** @type {ImageData} */ (framebuffer.imageData),
			0,
			0,
		);
	}
}
