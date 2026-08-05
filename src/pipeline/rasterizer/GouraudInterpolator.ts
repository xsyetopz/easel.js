import { decodeHsl16, encodeHsl16 } from "../../math/Hsl16.ts";

/** Per-vertex color interpolator for Gouraud shading. */
export class GouraudInterpolator {
  /**
   * Interpolates between two HSL16-encoded colors across a scanline.
   * Uses shortest-arc interpolation for hue.
   */
  interpolate(hsl1: number, hsl2: number, t: number): number {
    const a = decodeHsl16(hsl1);
    const b = decodeHsl16(hsl2);

    let dh = b.h - a.h;
    if (dh > 0.5) dh -= 1;
    else if (dh < -0.5) dh += 1;

    const h = (a.h + dh * t + 1) % 1;
    const s = a.s + (b.s - a.s) * t;
    const l = a.l + (b.l - a.l) * t;

    return encodeHsl16(h, s, l);
  }
}
