import { MathUtils } from "../../math/MathUtils.ts";

function encode(h: number, s: number, l: number): number {
	return MathUtils.packHsl16(h, s, l);
}

function decode(packed: number): { h: number; s: number; l: number } {
	return MathUtils.unpackHsl16(packed);
}

/** 16-bit packed HSL color encoding (6H/3S/7L). */
export const Hsl16 = {
	encode,
	decode,
	BLACK: encode(0, 0, 0),
	WHITE: encode(0, 0, 1),
};
