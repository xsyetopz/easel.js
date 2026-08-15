import { Color } from "./Color.ts";
import type { Matrix3 } from "./Matrix3.ts";
import { decodeHsl16, encodeHsl16 } from "./Hsl16.ts";
import { clamp, fastTrunc } from "./MathUtils.ts";
import { CSS_COLOR_NAMES } from "./_ColorNames.ts";

/** RGB channels represented as normalized values in [0, 1]. */
export interface RGB {
  /** Normalized red channel. */
  r: number;
  /** Normalized green channel. */
  g: number;
  /** Normalized blue channel. */
  b: number;
}

/** HSL channels represented with normalized hue, saturation, and lightness. */
export interface HSL {
  /** Normalized hue. */
  h: number;
  /** Normalized saturation. */
  s: number;
  /** Normalized lightness. */
  l: number;
}

/** Tuple containing normalized red, green, and blue channels. */
export type RGBArray = [number, number, number];

/** Accepted color input: Color, packed RGB number, or CSS color string. */
export type ColorValue = number | string | Color;

/** Degrees in one hue revolution. */
export const COLOR_HUE_SCALE = 360;
/** Percentage scale for color saturation. */
export const COLOR_SATURATION_SCALE = 100;
/** Percentage scale for color lightness. */
export const COLOR_LIGHTNESS_SCALE = 100;
/** Maximum value of an 8-bit RGB channel. */
export const COLOR_RGB_SCALE = 255;

/** Converts a color to 8-bit RGB channels. */
export function colorToRgb(color: ColorValue): RGB {
  const c = new Color(color);
  return {
    r: fastTrunc(c.r * COLOR_RGB_SCALE),
    g: fastTrunc(c.g * COLOR_RGB_SCALE),
    b: fastTrunc(c.b * COLOR_RGB_SCALE),
  };
}

/** Decodes a packed HSL16 color. */
export function colorFromHsl16(value: number): Color {
  const { h, s, l } = decodeHsl16(value);
  return new Color().setHSL(h, s, l);
}

/** Clamps an RGB channel to the normalized range. */
export function clampChannel(value: number): number {
  return clamp(value, 0, 1);
}

/** Converts one sRGB channel to linear light. */
export function srgbToLinearChannel(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** Converts one linear-light channel to sRGB. */
export function linearToSrgbChannel(value: number): number {
  const c = clamp(value, 0, 1);
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
}

/** Converts normalized RGB channels to normalized HSL channels. */
export function rgbToHsl(r: number, g: number, b: number): HSL {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (min + max) / 2;
  if (min !== max) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) {
      h = (g - b) / d + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h, s, l };
}

/** Encodes normalized HSL channels into HSL16. */
export function colorHsl16(color: Color): number {
  const { h, s, l } = color.hsl;
  return encodeHsl16(h, s, l);
}

/** Sets a color from normalized HSL channels and returns the same instance. */
export function colorSetHSL(
  color: Color,
  h: number,
  s: number,
  l: number,
): Color {
  const hue = ((h % 1) + 1) % 1;
  const saturation = clampChannel(s);
  const lightness = clampChannel(l);
  const hue2rgb = (p: number, q: number, _t: number): number => {
    let t = _t;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (saturation === 0) {
    color.setRGB(lightness, lightness, lightness);
    return color;
  }
  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  color.setRGB(
    hue2rgb(p, q, hue + 1 / 3),
    hue2rgb(p, q, hue),
    hue2rgb(p, q, hue - 1 / 3),
  );
  return color;
}

/** Converts a color's sRGB channels to linear light in place. */
export function colorConvertSRGBToLinear(color: Color): Color {
  color.r = srgbToLinearChannel(color.r);
  color.g = srgbToLinearChannel(color.g);
  color.b = srgbToLinearChannel(color.b);
  return color;
}

/** Converts a color's linear-light channels to sRGB in place. */
export function colorConvertLinearToSRGB(color: Color): Color {
  color.r = linearToSrgbChannel(color.r);
  color.g = linearToSrgbChannel(color.g);
  color.b = linearToSrgbChannel(color.b);
  return color;
}

/** Multiplies a color by a 3x3 channel matrix and clamps the result. */
export function colorApplyMatrix3(color: Color, matrix: Matrix3): Color {
  const { r, g, b } = color;
  const e = matrix.elements;
  color.r = clampChannel(e[0] * r + e[3] * g + e[6] * b);
  color.g = clampChannel(e[1] * r + e[4] * g + e[7] * b);
  color.b = clampChannel(e[2] * r + e[5] * g + e[8] * b);
  return color;
}

/** Interpolates two colors in HSL space and updates the first color. */
export function colorLerpHSL(color: Color, other: Color, t: number): Color {
  const a = color.hsl;
  const b = other.hsl;
  return color.setHSL(
    a.h + (b.h - a.h) * t,
    a.s + (b.s - a.s) * t,
    a.l + (b.l - a.l) * t,
  );
}

/** Offsets a color's normalized HSL channels and returns the same instance. */
export function colorOffsetHSL(
  color: Color,
  h: number,
  s: number,
  l: number,
): Color {
  const current = color.hsl;
  return color.setHSL(current.h + h, current.s + s, current.l + l);
}

/** Sets a color from a CSS name, defaulting to black for unknown names. */
export function colorSetColorName(color: Color, name: string): Color {
  const hex = CSS_COLOR_NAMES[name.toLowerCase()];
  if (hex === undefined) {
    color.hex = 0x000000;
    return color;
  }
  color.hex = hex;
  return color;
}
