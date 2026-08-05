/** Packs normalized HSL channels into a 16-bit 6H/3S/7L integer. */
export function encodeHsl16(h: number, s: number, l: number): number {
  return (
    (Math.round(h * 63) << 10) | (Math.round(s * 7) << 7) | Math.round(l * 127)
  );
}

/** Decodes a packed 16-bit 6H/3S/7L integer into normalized HSL channels. */
export function decodeHsl16(packed: number): {
  h: number;
  s: number;
  l: number;
} {
  return {
    h: ((packed >> 10) & 63) / 63,
    s: ((packed >> 7) & 7) / 7,
    l: (packed & 127) / 127,
  };
}

/** Packed HSL16 value for black (zero hue, saturation, and lightness). */
export const HSL16_BLACK = encodeHsl16(0, 0, 0);
/** Packed HSL16 value for white (full lightness). */
export const HSL16_WHITE = encodeHsl16(0, 0, 1);
