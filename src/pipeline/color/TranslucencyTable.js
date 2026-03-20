import { Hsl16 } from "./Hsl16.js";

/** Precomputed alpha blending table for 9-step opacity. */
export class TranslucencyTable {
	/**
	 * Blends two HSL16 colors by a step value 0-8.
	 * step=0 is fully transparent (returns dst), step=8 is fully opaque (returns src).
	 * Hue interpolation uses shortest-arc blending.
	 *
	 * @param {number} srcHsl16
	 * @param {number} dstHsl16
	 * @param {number} step Integer in [0, 8]
	 * @returns {number} Blended HSL16 value
	 */
	blend(srcHsl16, dstHsl16, step) {
		if (step === 0) return dstHsl16;
		if (step === 8) return srcHsl16;

		const src = Hsl16.decode(srcHsl16);
		const dst = Hsl16.decode(dstHsl16);
		const t = step / 8;

		// Shortest-arc hue interpolation
		let dh = src.h - dst.h;
		if (dh > 0.5) dh -= 1;
		if (dh < -0.5) dh += 1;

		const h = dst.h + dh * t;
		const s = dst.s + (src.s - dst.s) * t;
		const l = dst.l + (src.l - dst.l) * t;

		// Normalize hue to [0, 1]
		const hn = h < 0 ? h + 1 : h > 1 ? h - 1 : h;

		return Hsl16.encode(hn, s, l);
	}
}
