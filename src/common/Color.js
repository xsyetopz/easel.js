/**
 * @typedef {{ h: number, s: number, l: number }} HSL
 * @typedef {{ r: number, g: number, b: number }} RGB
 * @typedef {RGB & { a: number }} RGBA
 * @typedef {[number, number, number]} HSLArray
 * @typedef {[number, number, number]} RGBArray
 * @typedef {[number, number, number, number]} RGBAArray
 * @typedef {string | number | Color} ColorValue
 */

import { MathUtils } from "../maths/MathUtils.js";

export class Color {
    /**
     * @type {number}
     * @default 1
     */
    r = 1;
    /**
     * @type {number}
     * @default 1
     */
    g = 1;
    /**
     * @type {number}
     * @default 1
     */
    b = 1;

    /**
     * Creates new Color instance.
     * @param {...(ColorValue|RGBArray)} args Color value or RGB array [r,g,b]
     */
    constructor(...args) {
        args.length > 0 ? this.set(...args) : (this.r = this.g = this.b = 0);
    }

    /**
     * Returns color as 24-bit integer. (0xRRGGBB)
     * @readonly @type {number}
     */
    get hex() {
        return ((this.r * Color.RGB_SCALE) << 16) ^
            ((this.g * Color.RGB_SCALE) << 8) ^
            ((this.b * Color.RGB_SCALE) << 0);
    }

    /**
     * Returns color as hex string. (e.g. "#ff00ff")
     * @readonly @type {string}
     */
    get hexString() {
        return `#${this.hex.toString(16).padStart(6, "0")}`;
    }

    /**
     * Returns color as HSL object. {h,s,l}
     * @readonly @type {HSL}
     */
    get hsl() {
        const r = this.r;
        const g = this.g;
        const b = this.b;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);

        let h = 0, s = 0;
        const l = (min + max) / 2;

        if (min !== max) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            h = (max === r)
                ? ((g - b) / d + (g < b ? 6 : 0))
                : (max === g)
                    ? ((b - r) / d + 2)
                    : ((r - g) / d + 4);
            h /= 6;
        }

        return { h, s, l };
    }

    /**
     * Returns color as HSL CSS string. (e.g. "hsl(120,100%,50%)")
     * @readonly @type {string}
     */
    get hslString() {
        const hsl = this.hsl;
        const h = (hsl.h * Color.HUE_SCALE) | 0;
        const s = (hsl.s * Color.SATURATION_SCALE) | 0;
        const l = (hsl.l * Color.LIGHTNESS_SCALE) | 0;
        return `hsl(${h},${s}%,${l}%)`;
    }

    /**
     * Returns new Color instance with same value.
     * @returns {Color}
     */
    clone() {
        return new Color(this);
    }

    /**
     * Copies value from another Color.
     * @param {Color} source
     * @returns {Color}
     */
    copy(source) {
        this.r = source.r;
        this.g = source.g;
        this.b = source.b;
        return this;
    }

    /**
     * Parses value into Color.
     * @param {ColorValue} value - Color, number, or string
     * @returns {Color}
     */
    parse(value) {
        if (value instanceof Color) {
            this.copy(value);
            return this;
        } else if (typeof value === "number") {
            return this.setHex(value);
        } else if (typeof value === "string") {
            return this.setStyle(value);
        }
        throw new Error(`Color.parse(): invalid value: ${value}`);
    }

    /**
     * Sets color from another Color, hex, string, or RGB values.
    * @param {...(ColorValue|RGBArray)} args Color value or RGB array [r,g,b]
     * @returns {Color}
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
     * Sets color from 24-bit hex value.
     * @param {number} hex
     * @returns {Color}
     */
    setHex(hex) {
        if (hex > 0xFFFFFF || hex < 0) {
            throw new Error("Color.setHex(): hex out of range");
        }
        hex = MathUtils.fastTrunc(hex);

        this.r = (hex >> 16) / Color.RGB_SCALE;
        this.g = (hex >> 8 & Color.RGB_SCALE) / Color.RGB_SCALE;
        this.b = (hex & Color.RGB_SCALE) / Color.RGB_SCALE;
        return this;
    }

    /**
     * Sets color from HSL values.
     * @param {number} h
     * @param {number} s
     * @param {number} l
     * @returns {Color}
     */
    setHSL(h, s, l) {
        if (s === 0) {
            this.r = this.g = this.b = l;
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;

            this.r = Color.#hueToRGB(p, q, h + Color.#ONE_THIRD);
            this.g = Color.#hueToRGB(p, q, h);
            this.b = Color.#hueToRGB(p, q, h - Color.#ONE_THIRD);
        }
        return this;
    }

    /**
     * Sets color from RGB values (0-1).
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @returns {Color}
     */
    setRGB(r, g, b) {
        if (r > Color.RGB_SCALE || g > Color.RGB_SCALE || b > Color.RGB_SCALE) {
            throw new Error("Color.setRGB(): rgb out of range");
        }
        this.r = r;
        this.g = g;
        this.b = b;
        return this;
    }

    /**
     * Sets tcolor from CSS style string.
     * @param {string} style
     * @returns {Color}
     */
    setStyle(style) {
        style = style.toLowerCase();
        if (style.startsWith("#")) return this.#parseHex(style);
        if (style.startsWith("rgb")) return this.#parseRGB(style);
        if (style.startsWith("hsl")) return this.#parseHSL(style);
        throw new Error(`Color.setStyle(): invalid style: ${style}`);
    }

    /**
     * Parses hex color string into Color.
     * @private
     * @param {string} style
     * @returns {Color}
     */
    #parseHex(style) {
        if (style.length !== 4 && style.length !== 7) {
            throw new Error(
                "Color.#parseHex(): hex style must be in '#rgb' or '#rrggbb' format",
            );
        }

        const hex = style.length === 4
            ? style.slice(1).split("").map((c) => c + c).join("")
            : style.slice(1);
        return this.setHex(parseInt(hex, 16));
    }

    /**
     * Parses HSL color string into Color.
     * @private
     * @param {string} style
     * @returns {Color}
     */
    #parseHSL(style) {
        const values = style.match(/\d+/g);
        if (!values || values.length < 3) {
            throw new Error(
                "Color.#parseHSL(): hsl(a) style must be in 'hsl(h,s%,l%)' or 'hsla(h,s%,l%,a)' format",
            );
        }

        const h = Number(values[0]) * Color.#ONE_OVER_HUE_SCALE;
        const s = Number(values[1]) * Color.#ONE_OVER_SATURATION_SCALE;
        const l = Number(values[2]) * Color.#ONE_OVER_LIGHTNESS_SCALE;

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        this.r = Color.#hueToRGB(p, q, h + Color.#ONE_THIRD);
        this.g = Color.#hueToRGB(p, q, h);
        this.b = Color.#hueToRGB(p, q, h - Color.#ONE_THIRD);
        return this;
    }

    /**
     * Parses RGB color string into Color.
     * @private
     * @param {string} style
     * @returns {Color}
     */
    #parseRGB(style) {
        const values = style.match(/\d+/g);
        if (!values || values.length < 3) {
            throw new Error(
                "Color.#parseRGB(): rgb style must be in 'rgb(r,g,b)' or 'rgba(r,g,b,a)' format",
            );
        }

        return this.setRGB(
            Number(values[0]) / Color.RGB_SCALE,
            Number(values[1]) / Color.RGB_SCALE,
            Number(values[2]) / Color.RGB_SCALE,
        );
    }

    /** @readonly @type {number} */ static HUE_SCALE = 360;
    /** @readonly @type {number} */ static SATURATION_SCALE = 100;
    /** @readonly @type {number} */ static LIGHTNESS_SCALE = 100;
    /** @readonly @type {number} */ static RGB_SCALE = 255;

    /** @private @readonly @type {number} */
    static #ONE_SIXTH = 0.16666666666666666; // 1 / 6
    /** @private @readonly @type {number} */
    static #ONE_THIRD = 0.3333333333333333; // 1 / 3
    /** @private @readonly @type {number} */
    static #TWO_THIRDS = 0.6666666666666666; // 2 / 3
    /** @private @readonly @type {number} */
    static #ONE_OVER_HUE_SCALE = 0.002777777777777778; // 1 / 360
    /** @private @readonly @type {number} */
    static #ONE_OVER_SATURATION_SCALE = 0.01; // 1 / 100
    /** @private @readonly @type {number} */
    static #ONE_OVER_LIGHTNESS_SCALE = 0.01; // 1 / 100

    /**
     * Converts color value to RGB object with integer channels.
     * @param {ColorValue} color
     * @returns {{r: number, g: number, b: number}}
     */
    static toRGB(color) {
        const tempColor = new Color(color);
        return {
            r: (tempColor.r * Color.RGB_SCALE) | 0,
            g: (tempColor.g * Color.RGB_SCALE) | 0,
            b: (tempColor.b * Color.RGB_SCALE) | 0,
        };
    }

    /**
     * Converts HSL values to RGB object.
     * @param {number} p
     * @param {number} q
     * @param {number} t
     * @returns {number} interpolated RGB value
     */
    static #hueToRGB(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < Color.#ONE_SIXTH) return p + (q - p) * 6 * t;
        if (t < 0.5) return q;
        if (t < Color.#TWO_THIRDS) return p + (q - p) * (Color.#TWO_THIRDS - t) * 6;
        return p;
    }
}
