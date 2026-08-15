import { decodeHsl16 } from "../../math/Hsl16.ts";

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/** Module-level reusable output for lookup() to avoid per-call allocation. */
const _lookupOut: RgbColor = { r: 0, g: 0, b: 0 };

function hueToRgb(p: number, q: number, t: number): number {
  let channel = t;
  if (channel < 0) channel += 1;
  if (channel > 1) channel -= 1;
  if (channel < 1 / 6) return p + (q - p) * 6 * channel;
  if (channel < 1 / 2) return q;
  if (channel < 2 / 3) return p + (q - p) * (2 / 3 - channel) * 6;
  return p;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const value = Math.round(l * 255);
    return [value, value, value];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
    Math.round(hueToRgb(p, q, h) * 255),
    Math.round(hueToRgb(p, q, h - 1 / 3) * 255),
  ];
}

/** Precomputed HSL16-to-RGB lookup table. */
export class ColorTable {
  readonly #table: Uint32Array;

  /** Builds the precomputed HSL16-to-RGB lookup table. */
  constructor() {
    this.#table = new Uint32Array(65536);
    for (let i = 0; i < 65536; i++) {
      const { h, s, l } = decodeHsl16(i);
      const [r, g, b] = hslToRgb(h, s, l);
      this.#table[i] = (r << 16) | (g << 8) | b;
    }
  }

  /**
   * Looks up an HSL16 value and writes the result into `out`.
   * Pass a custom object to retain the result across calls; omit to use the
   * shared module-level object (zero allocation, safe only when the caller
   * does not need to store the result past the next lookup call).
   */
  lookup(hsl16: number, out: RgbColor = _lookupOut): RgbColor {
    const packed = this.#table[hsl16 & 0xffff];
    out.r = (packed >> 16) & 0xff;
    out.g = (packed >> 8) & 0xff;
    out.b = packed & 0xff;
    return out;
  }
}
