export const MathUtils = {
	EPSILON: 1e-6,
	TAU: 6.283185307179586,
	HALF_PI: 1.5707963267948966,
	THIRD_PI: 1.0471975511965976,
	QUARTER_PI: 0.7853981633974483,
	SIXTH_PI: 1.0471975511965976,
	RAD2DEG: 57.29577951308232,
	DEG2RAD: 0.017453292519943295,

	/**
	 * Clamps a value between min and max.
	 * @param {number} x
	 * @param {number} min
	 * @param {number} max
	 * @returns {number}
	 */
	clamp(x, min, max) {
		return x < min ? min : x > max ? max : x;
	},

	/**
	 * Fast atan2 approximation via minimax polynomial.
	 * @param {number} y
	 * @param {number} x
	 * @returns {number} Angle in radians
	 */
	fastAtan2(y, x) {
		const abs_y = Math.abs(y) + 1e-10;
		let r;
		let angle;
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

	/**
	 * @param {number} a
	 * @param {number} b
	 * @returns {number}
	 */
	fastMax(a, b) {
		return a > b ? a : b;
	},

	/**
	 * @param {number} a
	 * @param {number} b
	 * @returns {number}
	 */
	fastMin(a, b) {
		return a < b ? a : b;
	},

	/**
	 * @param {number} x
	 * @returns {number}
	 */
	fastRound(x) {
		return (x + 0.5) | 0;
	},

	/**
	 * @param {number} x
	 * @returns {number}
	 */
	fastTrunc(x) {
		return x | 0;
	},

	/**
	 * @param {number} n
	 * @returns {boolean}
	 */
	isPowerOf2(n) {
		return n > 0 && (n & (n - 1)) === 0;
	},

	/**
	 * Returns the next power of two >= n.
	 * @param {number} n
	 * @returns {number}
	 */
	nextPowerOf2(n) {
		let v = n - 1;
		v |= v >> 1;
		v |= v >> 2;
		v |= v >> 4;
		v |= v >> 8;
		v |= v >> 16;
		v++;
		return v;
	},

	/**
	 * asin clamped to [-1, 1] to avoid NaN on floating-point noise.
	 * @param {number} value
	 * @returns {number}
	 */
	safeAsin(value) {
		return Math.asin(value < -1 ? -1 : value > 1 ? 1 : value);
	},

	/**
	 * @param {number} radians
	 * @returns {number}
	 */
	toDegrees(radians) {
		return radians * MathUtils.RAD2DEG;
	},

	/**
	 * @param {number} degrees
	 * @returns {number}
	 */
	toRadians(degrees) {
		return degrees * MathUtils.DEG2RAD;
	},

	/**
	 * Manhattan distance between two points.
	 * @param {{ x: number, y: number }} a
	 * @param {{ x: number, y: number }} b
	 * @returns {number}
	 */
	tileDistance(a, b) {
		return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
	},

	/**
	 * Packs normalized HSL (0–1 each) into a 16-bit integer.
	 * Layout: hue 6 bits [15:10], saturation 3 bits [9:7], lightness 7 bits [6:0].
	 * @param {number} h Hue in [0, 1]
	 * @param {number} s Saturation in [0, 1]
	 * @param {number} l Lightness in [0, 1]
	 * @returns {number}
	 */
	packHsl16(h, s, l) {
		return (
			(Math.round(h * 63) << 10) |
			(Math.round(s * 7) << 7) |
			Math.round(l * 127)
		);
	},

	/**
	 * Unpacks a 16-bit integer produced by packHsl16 back to normalized HSL.
	 * @param {number} value
	 * @returns {{ h: number, s: number, l: number }}
	 */
	unpackHsl16(value) {
		return {
			h: ((value >> 10) & 63) / 63,
			s: ((value >> 7) & 7) / 7,
			l: (value & 127) / 127,
		};
	},
};
