import { MathUtils } from "../../math/MathUtils.ts";

function encode(h: number, s: number, l: number): number {
  return MathUtils.packHsl16(h, s, l);
}

function decode(packed: number): { h: number; s: number; l: number } {
  return MathUtils.unpackHsl16(packed);
}

/** 16-bit packed HSL color encoding (6H/3S/7L). */
export interface Hsl16Type {
  encode(h: number, s: number, l: number): number;
  decode(packed: number): { h: number; s: number; l: number };
  BLACK: number;
  WHITE: number;
}

export const Hsl16: Hsl16Type = {
  encode,
  decode,
  BLACK: encode(0, 0, 0),
  WHITE: encode(0, 0, 1),
};
