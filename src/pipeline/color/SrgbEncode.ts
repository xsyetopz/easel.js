import { LinearToSRGB } from "../../math/ColorManagement.ts";

const ENCODE_STEPS = 4095;

/**
 * three.js `LinearToSRGB` sampled at 4096 evenly spaced linear values in
 * [0, 1]. One step changes the 8-bit output by at most 0.8, so lookups stay
 * within one byte of the exact encode.
 */
const LINEAR_TO_SRGB = new Float32Array(ENCODE_STEPS + 1);
for (let i = 0; i <= ENCODE_STEPS; i++) {
  LINEAR_TO_SRGB[i] = LinearToSRGB(i / ENCODE_STEPS);
}

/** Linear 8-bit channel value to its rounded 8-bit sRGB encoding. */
const LINEAR_BYTE_TO_SRGB_BYTE = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  LINEAR_BYTE_TO_SRGB_BYTE[i] = Math.round(LinearToSRGB(i / 255) * 255);
}

/**
 * Encodes a linear channel to sRGB in [0, 1] through the lookup table.
 * Values outside [0, 1], and NaN, clamp to the table ends.
 */
export function encodeSrgb(linear: number): number {
  return LINEAR_TO_SRGB[
    linear >= 1
      ? ENCODE_STEPS
      : linear > 0
        ? (linear * ENCODE_STEPS + 0.5) | 0
        : 0
  ];
}

/** Encodes a linear channel to a rounded 8-bit sRGB value through the table. */
export function encodeSrgbByte(linear: number): number {
  return (encodeSrgb(linear) * 255 + 0.5) | 0;
}

/**
 * Encodes the RGB channels of 8-bit RGBA pixels from linear to sRGB in place,
 * leaving alpha unchanged.
 */
export function encodeSrgbPixels(pixels: Uint8ClampedArray): void {
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = LINEAR_BYTE_TO_SRGB_BYTE[pixels[i]];
    pixels[i + 1] = LINEAR_BYTE_TO_SRGB_BYTE[pixels[i + 1]];
    pixels[i + 2] = LINEAR_BYTE_TO_SRGB_BYTE[pixels[i + 2]];
  }
}
