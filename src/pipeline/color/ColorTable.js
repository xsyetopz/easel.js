import { MathUtils } from "../../math/MathUtils.js";

export class ColorTable {
	#table;

	constructor() {
		this.#table = new Uint32Array(65536);
		for (let i = 0; i < 65536; i++) {
			const { h, s, l } = MathUtils.unpackHsl16(i);
			const [r, g, b] = ColorTable.#hslToRgb(h, s, l);
			this.#table[i] = (r << 16) | (g << 8) | b;
		}
	}

	/**
	 * @param {number} p
	 * @param {number} q
	 * @param {number} t
	 * @returns {number}
	 */
	static #hue2rgb(p, q, t) {
		let tc = t;
		if (tc < 0) tc += 1;
		if (tc > 1) tc -= 1;
		if (tc < 1 / 6) return p + (q - p) * 6 * tc;
		if (tc < 1 / 2) return q;
		if (tc < 2 / 3) return p + (q - p) * (2 / 3 - tc) * 6;
		return p;
	}

	/**
	 * @param {number} h
	 * @param {number} s
	 * @param {number} l
	 * @returns {[number, number, number]}
	 */
	static #hslToRgb(h, s, l) {
		if (s === 0) {
			const v = Math.round(l * 255);
			return [v, v, v];
		}
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		return [
			Math.round(ColorTable.#hue2rgb(p, q, h + 1 / 3) * 255),
			Math.round(ColorTable.#hue2rgb(p, q, h) * 255),
			Math.round(ColorTable.#hue2rgb(p, q, h - 1 / 3) * 255),
		];
	}

	/**
	 * @param {number} hsl16
	 * @returns {{ r: number, g: number, b: number }}
	 */
	lookup(hsl16) {
		const val = this.#table[hsl16];
		return {
			r: (val >> 16) & 0xff,
			g: (val >> 8) & 0xff,
			b: val & 0xff,
		};
	}
}
