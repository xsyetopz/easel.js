/** Clears the framebuffer and depth buffer to initial state. */
export class FramebufferClear {
	/**
	 * @param {import('./Framebuffer.js').Framebuffer} framebuffer
	 * @param {number} [r]
	 * @param {number} [g]
	 * @param {number} [b]
	 * @param {number} [a]
	 */
	clear(framebuffer, r = 0, g = 0, b = 0, a = 255) {
		const data = framebuffer.data;
		const u32 = new Uint32Array(
			data.buffer,
			data.byteOffset,
			data.byteLength >> 2,
		);
		// ImageData is RGBA byte order; on little-endian Uint32Array reads ABGR.
		const packed = (a << 24) | (b << 16) | (g << 8) | r;
		u32.fill(packed);
	}
}
