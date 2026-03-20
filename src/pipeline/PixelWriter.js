import { MathUtils } from "../math/MathUtils.js";

/**
 * Converts 0-255 RGB to normalized 0-1 HSL.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {{ h: number, s: number, l: number }}
 */
function rgbToHsl(r, g, b) {
	const rn = r / 255;
	const gn = g / 255;
	const bn = b / 255;
	const max = Math.max(rn, gn, bn);
	const min = Math.min(rn, gn, bn);
	const l = (max + min) / 2;
	if (max === min) return { h: 0, s: 0, l };
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h = 0;
	if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
	else if (max === gn) h = ((bn - rn) / d + 2) / 6;
	else h = ((rn - gn) / d + 4) / 6;
	return { h, s, l };
}

/** Writes shaded pixels to the framebuffer with depth testing. */
export class PixelWriter {
	/**
	 * Writes a pixel to the framebuffer, blending by alpha if needed.
	 * @param {import('./framebuffer/Framebuffer.js').Framebuffer} framebuffer
	 * @param {number} x
	 * @param {number} y
	 * @param {number} r
	 * @param {number} g
	 * @param {number} b
	 * @param {number} a
	 * @returns {void}
	 */
	write(framebuffer, x, y, r, g, b, a) {
		if (a <= 0) return;
		if (a >= 255) {
			framebuffer.setPixel(x, y, r, g, b, 255);
			return;
		}
		const existing = framebuffer.getPixel(x, y);
		const t = a / 255;
		const br = Math.round(existing.r + (r - existing.r) * t);
		const bg = Math.round(existing.g + (g - existing.g) * t);
		const bb = Math.round(existing.b + (b - existing.b) * t);
		framebuffer.setPixel(x, y, br, bg, bb, 255);
	}

	/**
	 * Writes an HSL16 color to the framebuffer, applying translucency if opacity < 1.
	 * @param {import('./framebuffer/Framebuffer.js').Framebuffer} framebuffer
	 * @param {number} x
	 * @param {number} y
	 * @param {number} hsl16
	 * @param {import('./color/ColorTable.js').ColorTable} colorTable
	 * @param {number} opacity Value in [0, 1]
	 * @param {import('./color/TranslucencyTable.js').TranslucencyTable} translucencyTable
	 * @returns {void}
	 */
	writeHsl16(framebuffer, x, y, hsl16, colorTable, opacity, translucencyTable) {
		if (opacity <= 0) return;

		let finalHsl16 = hsl16;

		if (opacity < 1) {
			const step = Math.round(opacity * 8);
			const existing = framebuffer.getPixel(x, y);
			const { h, s, l } = rgbToHsl(existing.r, existing.g, existing.b);
			const dstHsl16 = MathUtils.packHsl16(h, s, l);
			finalHsl16 = translucencyTable.blend(hsl16, dstHsl16, step);
		}

		const { r, g, b } = colorTable.lookup(finalHsl16);
		framebuffer.setPixel(x, y, r, g, b, 255);
	}
}
