/** Common math utilities: clamp, lerp, remap, UUID generation. */
export interface MathUtilsType {
  EPSILON: number;
  TAU: number;
  HALF_PI: number;
  THIRD_PI: number;
  QUARTER_PI: number;
  SIXTH_PI: number;
  RAD2DEG: number;
  DEG2RAD: number;
  clamp(x: number, min: number, max: number): number;
  fastAtan2(y: number, x: number): number;
  fastMax(a: number, b: number): number;
  fastMin(a: number, b: number): number;
  fastRound(x: number): number;
  fastTrunc(x: number): number;
  isPowerOf2(n: number): boolean;
  nextPowerOf2(n: number): number;
  safeAsin(value: number): number;
  toDegrees(radians: number): number;
  toRadians(degrees: number): number;
  tileDistance(
    a: { x: number; y: number },
    b: { x: number; y: number },
  ): number;
  packHsl16(h: number, s: number, l: number): number;
  unpackHsl16(value: number): { h: number; s: number; l: number };
}

export const MathUtils: MathUtilsType = {
  EPSILON: 1e-6,
  TAU: 6.283185307179586,
  HALF_PI: 1.5707963267948966,
  THIRD_PI: 1.0471975511965976,
  QUARTER_PI: 0.7853981633974483,
  SIXTH_PI: 1.0471975511965976,
  RAD2DEG: 57.29577951308232,
  DEG2RAD: 0.017453292519943295,

  /** Clamps a value between min and max. */
  clamp(x: number, min: number, max: number): number {
    return x < min ? min : x > max ? max : x;
  },

  /**
   * Fast atan2 approximation via minimax polynomial.
   * @returns Angle in radians
   */
  fastAtan2(y: number, x: number): number {
    const abs_y = Math.abs(y) + 1e-10;
    let r: number;
    let angle: number;
    if (x >= 0) {
      r = (x - abs_y) / (x + abs_y);
      angle = MathUtils.QUARTER_PI;
    } else {
      r = (x + abs_y) / (abs_y - x);
      angle = 3 * MathUtils.QUARTER_PI;
    }
    angle += (0.1963 * r * r - 0.9817) * r;
    return y < 0 ? -angle : angle;
  },

  fastMax(a: number, b: number): number {
    return a > b ? a : b;
  },

  fastMin(a: number, b: number): number {
    return a < b ? a : b;
  },

  fastRound(x: number): number {
    return (x + 0.5) | 0;
  },

  fastTrunc(x: number): number {
    return x | 0;
  },

  isPowerOf2(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
  },

  /** Returns the next power of two >= n. */
  nextPowerOf2(n: number): number {
    let v = n - 1;
    v |= v >> 1;
    v |= v >> 2;
    v |= v >> 4;
    v |= v >> 8;
    v |= v >> 16;
    v++;
    return v;
  },

  /** asin clamped to [-1, 1] to avoid NaN on floating-point noise. */
  safeAsin(value: number): number {
    return Math.asin(value < -1 ? -1 : value > 1 ? 1 : value);
  },

  toDegrees(radians: number): number {
    return radians * MathUtils.RAD2DEG;
  },

  toRadians(degrees: number): number {
    return degrees * MathUtils.DEG2RAD;
  },

  /** Manhattan distance between two points. */
  tileDistance(
    a: { x: number; y: number },
    b: { x: number; y: number },
  ): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  },

  /**
   * Packs normalized HSL (0-1 each) into a 16-bit integer.
   * Layout: hue 6 bits [15:10], saturation 3 bits [9:7], lightness 7 bits [6:0].
   * @param h Hue in [0, 1]
   * @param s Saturation in [0, 1]
   * @param l Lightness in [0, 1]
   */
  packHsl16(h: number, s: number, l: number): number {
    return (
      (Math.round(h * 63) << 10) |
      (Math.round(s * 7) << 7) |
      Math.round(l * 127)
    );
  },

  /** Unpacks a 16-bit integer produced by packHsl16 back to normalized HSL. */
  unpackHsl16(value: number): { h: number; s: number; l: number } {
    return {
      h: ((value >> 10) & 63) / 63,
      s: ((value >> 7) & 7) / 7,
      l: (value & 127) / 127,
    };
  },
};
