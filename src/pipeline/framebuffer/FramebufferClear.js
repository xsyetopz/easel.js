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
		const len = data.length;
		for (let i = 0; i < len; i += 4) {
			data[i] = r;
			data[i + 1] = g;
			data[i + 2] = b;
			data[i + 3] = a;
		}
	}
}
