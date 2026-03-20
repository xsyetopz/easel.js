import { MathUtils } from "../../math/MathUtils.js";

/** Per-vertex color interpolator for Gouraud shading. */
export class GouraudInterpolator {
	/**
	 * Interpolates between two HSL16-encoded colors across a scanline.
	 * Uses shortest-arc interpolation for hue.
	 * @param {number} hsl1 HSL16-encoded color at start
	 * @param {number} hsl2 HSL16-encoded color at end
	 * @param {number} t Interpolation factor in [0, 1]
	 * @returns {number} HSL16-encoded interpolated color
	 */
	interpolate(hsl1, hsl2, t) {
		const a = MathUtils.unpackHsl16(hsl1);
		const b = MathUtils.unpackHsl16(hsl2);

		let dh = b.h - a.h;
		if (dh > 0.5) dh -= 1;
		else if (dh < -0.5) dh += 1;

		const h = (a.h + dh * t + 1) % 1;
		const s = a.s + (b.s - a.s) * t;
		const l = a.l + (b.l - a.l) * t;

		return MathUtils.packHsl16(h, s, l);
	}
}
