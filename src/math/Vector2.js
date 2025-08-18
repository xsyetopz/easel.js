import { MathUtils } from "./MathUtils.js";

export class Vector2 {
    /**
     * Creates new 2D vector.
     * @constructor
     * @param {number} [x=0] - x component
     * @param {number} [y=0] - y component
     */
    constructor(x = 0, y = 0) {
        /** @type {number} */
        this.x = x;
        /** @type {number} */
        this.y = y;
    }

    /**
     * Adds another vector to this vector.
     * @param {Vector2} v - vector to add
     * @returns {Vector2} this vector for chaining
     */
    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    /**
     * Adds scalar value to this vector.
     * @param {number} scalar - scalar value to add
     * @returns {Vector2} this vector for chaining
     */
    addScalar(scalar) {
        this.x += scalar;
        this.y += scalar;
        return this;
    }

    /**
     * Calculates angle of this vector in radians.
     * @returns {number} angle in radians
     */
    angle() {
        return Math.atan2(-this.y, -this.x) + Math.PI;
    }

    /**
     * Clones this vector.
     * @returns {Vector2} new vector with same values
     */
    clone() {
        return new Vector2(this.x, this.y);
    }

    /**
     * Copies values from another vector.
     * @param {Vector2} v - source vector
     * @returns {Vector2} this vector for chaining
     */
    copy(v) {
        this.x = v.x;
        this.y = v.y;
        return this;
    }

    /**
     * Calculates 2D cross product (z component) with another vector.
     * @param {Vector2} v - other vector
     * @returns {number} cross product z component
     */
    cross(v) {
        return this.x * v.y - this.y * v.x;
    }

    /**
     * Calculates distance to another vector.
     * @param {Vector2} v - other vector
     * @returns {number} distance
     */
    distanceTo(v) {
        return Math.sqrt(this.distanceToSq(v));
    }

    /**
     * Calculates squared distance to another vector.
     * @param {Vector2} v - other vector
     * @returns {number} squared distance
     */
    distanceToSq(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return dx * dx + dy * dy;
    }

    /**
     * Divides this vector by another vector. (component-wise)
     * @param {Vector2} v - vector to divide by
     * @returns {Vector2} this vector for chaining
     */
    div(v) {
        this.x /= v.x;
        this.y /= v.y;
        return this;
    }

    /**
     * Divides this vector by scalar value.
     * @param {number} scalar - scalar value to divide by
     * @returns {Vector2} this vector for chaining
     */
    divScalar(scalar) {
        this.x /= scalar;
        this.y /= scalar;
        return this;
    }

    /**
     * Calculates dot product with another vector.
     * @param {Vector2} v - other vector
     * @returns {number} dot product
     */
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    /**
     * Checks if this vector equals another vector.
     * @param {Vector2} v - other vector
     * @returns {boolean} true if equal
     */
    equals(v) {
        return MathUtils.equals(this.x, v.x) && MathUtils.equals(this.y, v.y);
    }

    /**
     * Sets this vector from array values.
     * @param {number[]} array - array with x, y values
     * @param {number} [offset=0] - offset into array
     * @returns {Vector2} this vector for chaining
     */
    fromArray(array, offset = 0) {
        this.x = array[offset];
        this.y = array[offset + 1];
        return this;
    }

    /**
     * Calculates length of this vector.
     * @returns {number} length
     */
    length() {
        return Math.sqrt(this.lengthSq());
    }


    /**
     * Calculates squared length of this vector.
     * @returns {number} squared length
     */
    lengthSq() {
        const { x, y } = this;
        return x * x + y * y;
    }

    /**
     * Linearly interpolates between this vector and another.
     * @param {Vector2} v - target vector
     * @param {number} alpha - interpolation factor (0-1)
     * @returns {Vector2} this vector for chaining
     */
    lerp(v, alpha) {
        this.x = MathUtils.lerp(this.x, v.x, alpha);
        this.y = MathUtils.lerp(this.y, v.y, alpha);
        return this;
    }

    /**
     * Multiplies this vector by another vector. (component-wise)
     * @param {Vector2} v - vector to multiply by
     * @returns {Vector2} this vector for chaining
     */
    mul(v) {
        this.x *= v.x;
        this.y *= v.y;
        return this;
    }

    /**
     * Multiplies this vector by scalar value.
     * @param {number} scalar - scalar value to multiply by
     * @returns {Vector2} this vector for chaining
     */
    mulScalar(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    /**
     * Rotates this vector by an angle.
     * @param {number} angle - angle in radians
     * @returns {Vector2} this vector for chaining
     */
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const { x, y } = this;
        this.x = x * cos - y * sin;
        this.y = x * sin + y * cos;
        return this;
    }

    /**
     * Negates this vector.
     * @returns {Vector2} this vector for chaining
     */
    neg() {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }

    /**
     * Sets components of this vector.
     * @param {number} x - x component
     * @param {number} y - y component
     * @returns {Vector2} this vector for chaining
     */
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    /**
     * Sets all components to same scalar value.
     * @param {number} scalar - scalar value to set
     * @returns {Vector2} this vector for chaining
     */
    setScalar(scalar) {
        this.x = scalar;
        this.y = scalar;
        return this;
    }

    /**
     * Subtracts another vector from this vector.
     * @param {Vector2} v - vector to subtract
     * @returns {Vector2} this vector for chaining
     */
    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    /**
     * Subtracts scalar value from this vector.
     * @param {number} scalar - scalar value to subtract
     * @returns {Vector2} this vector for chaining
     */
    subScalar(scalar) {
        this.x -= scalar;
        this.y -= scalar;
        return this;
    }

    /**
     * Returns array representation.
     * @returns {number[]} [x, y]
     */
    toArray() {
        return [this.x, this.y];
    }

    /**
     * Unitizes this vector.
     * @returns {Vector2} this vector for chaining
     */
    unitize() {
        return this.div(this.length() || 1);
    }

    /**
     * Vector with zero values.
     * @type {Vector2}
     */
    static ZERO = new Vector2(0, 0);

    /**
     * Vector with one values.
     * @type {Vector2}
     */
    static ONE = new Vector2(1, 1);

    /**
     * Unit vector pointing up.
     * @type {Vector2}
     */
    static UP = new Vector2(0, 1);

    /**
     * Unit vector pointing down.
     * @type {Vector2}
     */
    static DOWN = new Vector2(0, -1);

    /**
     * Unit vector pointing right.
     * @type {Vector2}
     */
    static LEFT = new Vector2(-1, 0);

    /**
     * Right unit vector. (1, 0)
     * @type {Vector2}
     */
    static RIGHT = new Vector2(1, 0);

    /**
     * Calculates cross product of two vectors.
     * @param {Vector2} a - first vector
     * @param {Vector2} b - second vector
     * @returns {Vector2} new vector with cross product result
     */
    static crossVectors(a, b) {
        return new Vector2().copy(a).cross(b);
    }

    /**
     * Linearly interpolates between two vectors.
     * @param {Vector2} a - start vector
     * @param {Vector2} b - end vector
     * @param {number} alpha - interpolation factor (0-1)
     * @returns {Vector2} new interpolated vector
     */
    static lerpVectors(a, b, alpha) {
        return new Vector2().copy(a).lerp(b, alpha);
    }
}
