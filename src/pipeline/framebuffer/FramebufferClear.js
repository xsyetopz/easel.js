/** Clears the framebuffer and depth buffer to initial state. */
export class FramebufferClear {
	/**
	 * @param {*} framebuffer
	 * @param {number} [r]
	 * @param {number} [g]
	 * @param {number} [b]
	 * @param {number} [a]
	 */
	clear(framebuffer, r = 0, g = 0, b = 0, a = 255) {
		// ImageData is RGBA byte order; on little-endian Uint32Array reads ABGR.
		const packed = (a << 24) | (b << 16) | (g << 8) | r;
		framebuffer.u32.fill(packed);
	}
}
