import { decodeHsl16, encodeHsl16 } from "../../math/Hsl16.ts";

/** Precomputed alpha blending table for 9-step opacity. */
export class TranslucencyTable {
  /**
   * Blends two HSL16 colors by a step value 0-8.
   * step=0 is fully transparent (returns dst), step=8 is fully opaque (returns src).
   * Hue interpolation uses shortest-arc blending.
   */
  blend(srcHsl16: number, dstHsl16: number, step: number): number {
    if (step === 0) return dstHsl16;
    if (step === 8) return srcHsl16;

    const src = decodeHsl16(srcHsl16);
    const dst = decodeHsl16(dstHsl16);
    const t = step / 8;

    // Shortest-arc hue interpolation
    let dh = src.h - dst.h;
    if (dh > 0.5) dh -= 1;
    if (dh < -0.5) dh += 1;

    const h = dst.h + dh * t;
    const s = dst.s + (src.s - dst.s) * t;
    const l = dst.l + (src.l - dst.l) * t;

    // Normalize hue to [0, 1]
    let hn = h;
    if (hn < 0) hn += 1;
    else if (hn > 1) hn -= 1;

    return encodeHsl16(hn, s, l);
  }
}
