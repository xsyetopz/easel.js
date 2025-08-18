export class MathUtils {
    /** @readonly */
    static DEG2RAD = 0.017453292519943295;
    /** @readonly */
    static RAD2DEG = 57.29577951308232;
    /** @readonly */
    static PI = 3.141592653589793;
    /** @readonly */
    static TAU = 6.283185307179586;
    /** @readonly */
    static EPSILON = 0.0001;

    /**
     * Ceils to nearest step
     * @param {number} value - value to ceil
     * @param {number} step - step size
     * @returns {number} ceiled value
     */
    static ceilToStep(value, step) {
        return Math.ceil(value / step) * step;
    }

    /**
     * Clamps value between min and max
     * @param {number} value - value to clamp
     * @param {number} min - minimum value
     * @param {number} max - maximum value
     * @returns {number} clamped value
     */
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Shortest angular difference between two angles
     * @param {number} from - starting angle in radians
     * @param {number} to - ending angle in radians
     * @returns {number} shortest angular difference
     */
    static deltaAngle(from, to) {
        const diff = MathUtils.unitizeAngleSigned(to - from);
        return Math.abs(diff) > PI ? diff - MathUtils.sign(diff) * TAU : diff;
    }

    /**
     * Cubic ease-in interpolation
     * @param {number} t - interpolation factor (0-1)
     * @returns {number} eased value
     */
    static easeInCubic(t) {
        return t * t * t;
    }

    /**
     * Cubic ease-in-out interpolation
     * @param {number} t - interpolation factor (0-1)
     * @returns {number} eased value
     */
    static easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    /**
     * Cubic ease-out interpolation
     * @param {number} t - interpolation factor (0-1)
     * @returns {number} eased value
     */
    static easeOutCubic(t) {
        const f = t - 1;
        return f * f * f + 1;
    }

    /**
     * Checks if two values are approx. equal
     * @param {number} a - first value
     * @param {number} b - second value
     * @param {number} [epsilon=EPSILON] - tolerance
     * @returns {boolean} `true` if values are approx. equal
     */
    static equals(a, b, epsilon = EPSILON) {
        return Math.abs(a - b) < epsilon;
    }

    /**
     * Floors to nearest step
     * @param {number} value - value to floor
     * @param {number} step - step size
     * @returns {number} floored value
     */
    static floorToStep(value, step) {
        return Math.floor(value / step) * step;
    }

    /**
     * Fractional part of a number
     * @param {number} x - input value
     * @returns {number} fractional part (always positive)
     */
    static fract(x) {
        return x - Math.floor(x);
    }

    /**
     * Checks if number is power of two
     * @param {number} n - number to check
     * @returns {boolean} true if power of two
     */
    static isPowerOfTwo(n) {
        return (n & (n - 1)) === 0 && n !== 0;
    }

    /**
     * Linear interpolation between two values
     * @param {number} a - start value
     * @param {number} b - end value
     * @param {number} t - interpolation factor (0-1)
     * @returns {number} interpolated value
     */
    static lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /**
     * Maps value from one range to another
     * @param {number} value - value to map
     * @param {number} fromMin - source range minimum
     * @param {number} fromMax - source range maximum
     * @param {number} toMin - target range minimum
     * @param {number} toMax - target range maximum
     * @returns {number} mapped value
     */
    static mapRange(value, fromMin, fromMax, toMin, toMax) {
        return toMin + (value - fromMin) * (toMax - toMin) / (fromMax - fromMin);
    }

    /**
     * Finds next power of two
     * @param {number} n - input number
     * @returns {number} next power of two
     */
    static nextPowerOfTwo(n) {
        return Math.pow(2, Math.ceil(Math.log2(n)));
    }

    /**
     * Rounds to nearest step
     * @param {number} value - value to round
     * @param {number} step - step size
     * @returns {number} rounded value
     */
    static roundToStep(value, step) {
        return Math.round(value / step) * step;
    }

    /**
     * Sign function (-1, 0, or 1)
     * @param {number} x - input value
     * @returns {number} sign of the value
     */
    static sign(x) {
        return x > 0 ? 1 : x < 0 ? -1 : 0;
    }

    /**
     * Smoothstep interpolation (Hermite interpolation)
     * @param {number} edge0 - lower edge
     * @param {number} edge1 - upper edge
     * @param {number} x - input value
     * @returns {number} smoothly interpolated value between 0 and 1
     */
    static smoothstep(edge0, edge1, x) {
        const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
    }

    /**
     * Smoother interpolation (Ken Perlin's improved version)
     * @param {number} edge0 - lower edge
     * @param {number} edge1 - upper edge
     * @param {number} x - input value
     * @returns {number} even smoother interpolated value between 0 and 1
     */
    static smootherstep(edge0, edge1, x) {
        const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    /**
     * Converts radians to degrees
     * @param {number} radians - angle in radians
     * @returns {number} angle in degrees
     */
    static toDegrees(radians) {
        return radians * RAD2DEG;
    }

    /**
     * Converts degrees to radians
     * @param {number} degrees - angle in degrees
     * @returns {number} angle in radians
     */
    static toRadians(degrees) {
        return degrees * DEG2RAD;
    }

    /**
     * Unitize angle to range [0, 2PI)
     * @param {number} angle - angle in radians
     * @returns {number} normalized angle
     */
    static unitizeAngle(angle) {
        return MathUtils.wrap(angle, TAU);
    }

    /**
     * Unitize angle to range [-PI, PI]
     * @param {number} angle - angle in radians
     * @returns {number} normalized angle
     */
    static unitizeAngleSigned(angle) {
        angle = MathUtils.unitizeAngle(angle);
        return angle > PI ? angle - TAU : angle;
    }

    /**
     * Wraps value to range [0, max)
     * @param {number} value - value to wrap
     * @param {number} max - maximum value (exclusive)
     * @returns {number} wrapped value
     */
    static wrap(value, max) {
        return ((value % max) + max) % max;
    }

    /**
     * Wraps value to range [min, max)
     * @param {number} value - value to wrap
     * @param {number} min - minimum value (inclusive)
     * @param {number} max - maximum value (exclusive)
     * @returns {number} wrapped value
     */
    static wrapRange(value, min, max) {
        const range = max - min;
        return min + MathUtils.wrap(value - min, range);
    }
}
