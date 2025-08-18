/**
 * Represents RGB color and provides utilities for color manipulation.
 * @class
 */
/**
 * @typedef {{ h: number, s: number, l: number }} HSL
 */

import { MathUtils } from "../maths/MathUtils.js";

export class Color {
    /**
     * Red channel. [0,1]
     * @type {number}
     */
    r = 1;
    /**
     * Green channel. [0,1]
     * @type {number}
     */
    g = 1;
    /**
     * Blue channel. [0,1]
     * @type {number}
     */
    b = 1;

    /**
     * @param {...any} args Color value(s) or array
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
     * @param {Color} source - source color
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
     * @param {Color|number|string} value - Color, number, or string
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
     * @param {...any} args - Color value(s) or array
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
     * @param {number} hex - hex value (0xRRGGBB)
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
     * @param {number} h - hue
     * @param {number} s - saturation
     * @param {number} l - lightness
     * @returns {Color}
     */
    setHSL(h, s, l) {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        if (s === 0) {
            this.r = this.g = this.b = l;
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
     * Sets color from RGB values (0-1).
     * @param {number} r - red
     * @param {number} g - green
     * @param {number} b - blue
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
     * @param {string} style - CSS color string (e.g. "#ff00ff", "rgb(255,0,255)", "hsl(300,100%,50%)")
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

        const h = Number(values[0]) / Color.HUE_SCALE;
        const s = Number(values[1]) / Color.SATURATION_SCALE;
        const l = Number(values[2]) / Color.LIGHTNESS_SCALE;

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        const hueToRGB = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        this.r = hueToRGB(p, q, h + 1 / 3);
        this.g = hueToRGB(p, q, h);
        this.b = hueToRGB(p, q, h - 1 / 3);
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

    /**
     * @readonly
     * @type {number}
     */
    static HUE_SCALE = 360;

    /**
     * @readonly
     * @type {number}
     */
    static SATURATION_SCALE = 100;

    /**
     * @readonly
     * @type {number}
     */
    static LIGHTNESS_SCALE = 100;

    /**
     * @readonly
     * @type {number}
     */
    static RGB_SCALE = 255;

    /**
     * Converts color value to RGB object with integer channels.
     * @param {Color|number|string} color
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
}
