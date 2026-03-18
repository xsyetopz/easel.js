import { MathUtils } from "../../math/MathUtils.js";

/**
 * @param {number} h Hue in [0, 1]
 * @param {number} s Saturation in [0, 1]
 * @param {number} l Lightness in [0, 1]
 * @returns {number}
 */
function encode(h, s, l) {
	return MathUtils.packHsl16(h, s, l);
}

/**
 * @param {number} packed
 * @returns {{ h: number, s: number, l: number }}
 */
function decode(packed) {
	return MathUtils.unpackHsl16(packed);
}

export const Hsl16 = {
	encode,
	decode,
	BLACK: encode(0, 0, 0),
	WHITE: encode(0, 0, 1),
};
