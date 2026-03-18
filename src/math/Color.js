import { MathUtils } from "./MathUtils.js";

/**
 * @typedef {{ r: number, g: number, b: number }} RGB
 * @typedef {{ h: number, s: number, l: number }} HSL
 * @typedef {number[]} RGBArray  Three-element [r, g, b] tuple (0–1 range)
 * @typedef {number | string | Color} ColorValue
 */

export class Color {
	static HUE_SCALE = 360;
	static SATURATION_SCALE = 100;
	static LIGHTNESS_SCALE = 100;

	static RGB_SCALE = 255;

	/**
	 * @param {ColorValue} color
	 * @returns {RGB}
	 */
	static toRGB(color) {
		const tempColor = new Color(color);
		return {
			r: MathUtils.fastTrunc(tempColor.r * Color.RGB_SCALE),
			g: MathUtils.fastTrunc(tempColor.g * Color.RGB_SCALE),
			b: MathUtils.fastTrunc(tempColor.b * Color.RGB_SCALE),
		};
	}

	/**
	 * Creates a Color from a packed 16-bit HSL integer produced by
	 * {@link MathUtils.packHsl16}.
	 *
	 * @param {number} value
	 * @returns {Color}
	 */
	static fromHsl16(value) {
		const { h, s, l } = MathUtils.unpackHsl16(value);
		return new Color().setHSL(h, s, l);
	}

	r = 1;
	g = 1;
	b = 1;

	/**
	 * Accepts a single ColorValue or three separate r, g, b components.
	 * With no arguments the color is initialised to black.
	 *
	 * @param {...any} args
	 */
	constructor(...args) {
		if (args.length > 0) {
			this.set(...args);
		} else {
			this.r = 0;
			this.g = 0;
			this.b = 0;
		}
	}

	/** @returns {number} */
	get hex() {
		return (
			((this.r * Color.RGB_SCALE) << 16) ^
			((this.g * Color.RGB_SCALE) << 8) ^
			((this.b * Color.RGB_SCALE) << 0)
		);
	}

	/** @returns {string} */
	get hexString() {
		return `#${this.hex.toString(16).padStart(6, "0")}`;
	}

	/** @returns {HSL} */
	get hsl() {
		const r = this.r;
		const g = this.g;
		const b = this.b;

		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);

		let h = 0;
		let s = 0;
		const l = (min + max) / 2;

		if (min !== max) {
			const d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

			h =
				max === r
					? (g - b) / d + (g < b ? 6 : 0)
					: max === g
						? (b - r) / d + 2
						: (r - g) / d + 4;
			h /= 6;
		}

		return { h, s, l };
	}

	/**
	 * Returns the color as a packed 16-bit HSL integer.
	 *
	 * @returns {number}
	 */
	get hsl16() {
		const { h, s, l } = this.hsl;
		return MathUtils.packHsl16(h, s, l);
	}

	/** @returns {string} */
	get hslString() {
		const hsl = this.hsl;

		const h = MathUtils.fastTrunc(hsl.h * Color.HUE_SCALE);
		const s = MathUtils.fastTrunc(hsl.s * Color.SATURATION_SCALE);
		const l = MathUtils.fastTrunc(hsl.l * Color.LIGHTNESS_SCALE);
		return `hsl(${h},${s}%,${l}%)`;
	}

	/** @returns {Color} */
	clone() {
		return new Color(this);
	}

	/**
	 * @param {Color} source
	 * @returns {this}
	 */
	copy(source) {
		this.r = source.r;
		this.g = source.g;
		this.b = source.b;
		return this;
	}

	/**
	 * Writes h, s, l into target and returns it.
	 *
	 * @param {{ h: number, s: number, l: number }} [target]
	 * @returns {{ h: number, s: number, l: number }}
	 */
	getHSL(target = { h: 0, s: 0, l: 0 }) {
		const { h, s, l } = this.hsl;
		target.h = h;
		target.s = s;
		target.l = l;
		return target;
	}

	/**
	 * @param {Color} c1
	 * @param {Color} c2
	 * @param {number} t
	 * @returns {this}
	 */
	lerpColors(c1, c2, t) {
		this.r = c1.r + (c2.r - c1.r) * t;
		this.g = c1.g + (c2.g - c1.g) * t;
		this.b = c1.b + (c2.b - c1.b) * t;
		return this;
	}

	/**
	 * @param {ColorValue} value
	 * @returns {this}
	 */
	parse(value) {
		if (value instanceof Color) {
			this.copy(value);
			return this;
		}
		if (typeof value === "number") {
			return this.setHex(value);
		}
		if (typeof value === "string") {
			return this.setStyle(value);
		}

		throw new Error(`EASEL.Color.parse(): invalid value: ${value}`);
	}

	/**
	 * Accepts a single ColorValue or three separate r, g, b components.
	 *
	 * @param {...any} args
	 * @returns {this}
	 */
	set(...args) {
		if (args.length === 1) {
			const value = args[0];

			if (value instanceof Color) {
				this.copy(value);
			} else if (typeof value === "number") {
				this.setHex(value);
			} else if (typeof value === "string") {
				this.setStyle(value);
			}
		} else if (args.length === 3) {
			this.setRGB(args[0], args[1], args[2]);
		}

		return this;
	}

	/**
	 * @param {number} value  24-bit integer (0x000000–0xFFFFFF)
	 * @returns {this}
	 */
	setHex(value) {
		if (value > 0xffffff || value < 0) {
			throw new Error("EASEL.Color.setHex(): hex out of range");
		}
		const hex = MathUtils.fastTrunc(value);

		this.r = (hex >> 16) / Color.RGB_SCALE;
		this.g = ((hex >> 8) & Color.RGB_SCALE) / Color.RGB_SCALE;
		this.b = (hex & Color.RGB_SCALE) / Color.RGB_SCALE;
		return this;
	}

	/**
	 * @param {number} h  Hue in [0, 1]
	 * @param {number} s  Saturation in [0, 1]
	 * @param {number} l  Lightness in [0, 1]
	 * @returns {this}
	 */
	setHSL(h, s, l) {
		const hue2rgb = (
			/** @type {number} */ p,
			/** @type {number} */ q,
			/** @type {number} */ _t,
		) => {
			let t = _t;
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};

		if (s === 0) {
			this.r = l;
			this.g = l;
			this.b = l;
		} else {
			const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
			const p = 2 * l - q;

			this.r = hue2rgb(p, q, h + 1 / 3);
			this.g = hue2rgb(p, q, h);
			this.b = hue2rgb(p, q, h - 1 / 3);
		}

		return this;
	}

	/**
	 * Components must be in [0, 1] range (not 0–255).
	 *
	 * @param {number} r
	 * @param {number} g
	 * @param {number} b
	 * @returns {this}
	 */
	setRGB(r, g, b) {
		if (r > Color.RGB_SCALE || g > Color.RGB_SCALE || b > Color.RGB_SCALE) {
			throw new Error("EASEL.Color.setRGB(): rgb out of range");
		}

		this.r = r;
		this.g = g;
		this.b = b;
		return this;
	}

	/**
	 * @param {string} value  CSS color string: `#rgb`, `#rrggbb`, `rgb(…)`, `hsl(…)`
	 * @returns {this}
	 */
	setStyle(value) {
		const style = value.toLowerCase();
		if (style.startsWith("#")) return this.#parseHex(style);
		if (style.startsWith("rgb")) return this.#parseRGB(style);
		if (style.startsWith("hsl")) return this.#parseHSL(style);

		throw new Error(`EASEL.Color.setStyle(): invalid style: ${style}`);
	}

	/**
	 * @param {string} style
	 * @returns {this}
	 */
	#parseHex(style) {
		if (style.length !== 4 && style.length !== 7) {
			throw new Error(
				"EASEL.Color.#parseHex(): hex style must be in '#rgb' or '#rrggbb' format",
			);
		}

		const hex =
			style.length === 4
				? style
						.slice(1)
						.split("")
						.map((c) => c + c)
						.join("")
				: style.slice(1);
		return this.setHex(Number.parseInt(hex, 16));
	}

	/**
	 * @param {string} style
	 * @returns {this}
	 */
	#parseHSL(style) {
		const values = style.match(/\d+/g);
		if (!values || values.length < 3) {
			throw new Error(
				"EASEL.Color.#parseHSL(): hsl(a) style must be in 'hsl(h,s%,l%)' or 'hsla(h,s%,l%,a)' format",
			);
		}

		const h = Number(values[0]) / Color.HUE_SCALE;
		const s = Number(values[1]) / Color.SATURATION_SCALE;
		const l = Number(values[2]) / Color.LIGHTNESS_SCALE;

		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;

		const hueToRGB = (
			/** @type {number} */ pp,
			/** @type {number} */ qq,
			/** @type {number} */ _t,
		) => {
			let t = _t;
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return pp + (qq - pp) * 6 * t;
			if (t < 1 / 2) return qq;
			if (t < 2 / 3) return pp + (qq - pp) * (2 / 3 - t) * 6;
			return pp;
		};

		this.r = hueToRGB(p, q, h + 1 / 3);
		this.g = hueToRGB(p, q, h);
		this.b = hueToRGB(p, q, h - 1 / 3);
		return this;
	}

	/**
	 * @param {string} style
	 * @returns {this}
	 */
	#parseRGB(style) {
		const values = style.match(/\d+/g);
		if (!values || values.length < 3) {
			throw new Error(
				"EASEL.Color.#parseRGB(): rgb style must be in 'rgb(r,g,b)' or 'rgba(r,g,b,a)' format",
			);
		}

		return this.setRGB(
			Number(values[0]) / Color.RGB_SCALE,
			Number(values[1]) / Color.RGB_SCALE,
			Number(values[2]) / Color.RGB_SCALE,
		);
	}
}
