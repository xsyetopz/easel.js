/** Small tolerance used by numeric comparisons. */
export const EPSILON = 1e-6;
/** Full-turn angle in radians (2π). */
export const TAU = 6.283185307179586;
/** Right-angle half-turn in radians (π/2). */
export const HALF_PI = 1.5707963267948966;
/** One-third of π in radians. */
export const THIRD_PI = 1.0471975511965976;
/** One-quarter of π in radians. */
export const QUARTER_PI = 0.7853981633974483;
/** One-sixth of π in radians. */
export const SIXTH_PI = 0.5235987755982988;
/** Multiplier converting radians to degrees. */
export const RAD2DEG = 57.29577951308232;
/** Multiplier converting degrees to radians. */
export const DEG2RAD = 0.017453292519943295;

/** Clamps `x` to the inclusive range [`min`, `max`]. */
export function clamp(x: number, min: number, max: number): number {
  return x < min ? min : x > max ? max : x;
}

/** Fast atan2 approximation via a minimax polynomial. */
export function fastAtan2(y: number, x: number): number {
  const absoluteY = Math.abs(y) + 1e-10;
  let ratio: number;
  let angle: number;
  if (x >= 0) {
    ratio = (x - absoluteY) / (x + absoluteY);
    angle = QUARTER_PI;
  } else {
    ratio = (x + absoluteY) / (absoluteY - x);
    angle = 3 * QUARTER_PI;
  }
  angle += (0.1963 * ratio * ratio - 0.9817) * ratio;
  return y < 0 ? -angle : angle;
}

/** Returns the larger of `a` and `b` without allocating. */
export function fastMax(a: number, b: number): number {
  return a > b ? a : b;
}

/** Returns the smaller of `a` and `b` without allocating. */
export function fastMin(a: number, b: number): number {
  return a < b ? a : b;
}

/** Rounds `x` with the renderer's integer fast path. */
export function fastRound(x: number): number {
  return (x + 0.5) | 0;
}

/** Truncates `x` with the renderer's integer fast path. */
export function fastTrunc(x: number): number {
  return x | 0;
}

/** Returns true when positive integer `n` is a power of two. */
export function isPowerOf2(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/** Returns the smallest power of two greater than or equal to `n`. */
export function nextPowerOf2(n: number): number {
  let value = n - 1;
  value |= value >> 1;
  value |= value >> 2;
  value |= value >> 4;
  value |= value >> 8;
  value |= value >> 16;
  return value + 1;
}

/** Returns asin(`value`) after clamping the input to [-1, 1]. */
export function safeAsin(value: number): number {
  return Math.asin(value < -1 ? -1 : value > 1 ? 1 : value);
}

/** Converts an angle in radians to degrees. */
export function toDegrees(radians: number): number {
  return radians * RAD2DEG;
}

/** Converts an angle in degrees to radians. */
export function toRadians(degrees: number): number {
  return degrees * DEG2RAD;
}

/** Returns the Manhattan distance between two integer-grid positions. */
export function tileDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
