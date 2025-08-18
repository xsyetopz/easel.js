import { MathUtils } from "./MathUtils.js";

export class Vector3 {
    /**
     * Creates new 3D vector.
     * @constructor
     * @param {number} [x=0] - x component
     * @param {number} [y=0] - y component
     * @param {number} [z=0] - z component
     */
    constructor(x = 0, y = 0, z = 0) {
        /** @type {number} */
        this.x = x;
        /** @type {number} */
        this.y = y;
        /** @type {number} */
        this.z = z;
    }

    /**
     * Adds another vector to this vector.
     * @param {Vector3} v - vector to add
     * @returns {Vector3} this vector for chaining
     */
    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    /**
     * Adds scalar value to this vector.
     * @param {number} scalar - scalar value to add
     * @returns {Vector3} this vector for chaining
     */
    addScalar(scalar) {
        this.x += scalar;
        this.y += scalar;
        this.z += scalar;
        return this;
    }

    /**
     * Applies matrix transformation to this vector.
     * @param {Mat4} m - transformation matrix
     * @returns {Vector3} this vector for chaining
     */
    applyMatrix4(m) {
        const { x, y, z } = this;
        const e = m.elements;

        const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);

        this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
        this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
        this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
        return this;
    }

    /**
     * Applies quaternion rotation to this vector.
     * @param {Quaternion} q - quaternion to apply
     * @returns {Vector3} this vector for chaining
     */
    applyQuaternion(q) {
        // quaternion * vector * quaternion^-1
        const { x, y, z } = this;
        const { x: qx, y: qy, z: qz, w: qw } = q;

        // quat * vector
        const ix = qw * x + qy * z - qz * y;
        const iy = qw * y + qz * x - qx * z;
        const iz = qw * z + qx * y - qy * x;
        const iw = -qx * x - qy * y - qz * z;

        // result * inverse quat
        this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
        this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
        this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
        return this;
    }

    /**
     * Clones this vector
     * @returns {Vector3} new vector with same values
     */
    clone() {
        return new Vector3(this.x, this.y, this.z);
    }

    /**
     * Copies values from another vector.
     * @param {Vector3} v - source vector
     * @returns {Vector3} this vector for chaining
     */
    copy(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }

    /**
     * Calculates cross product with another vector.
     * @param {Vector3} v - other vector
     * @returns {Vector3} this vector for chaining
     */
    cross(v) {
        const { x: ax, y: ay, z: az } = this;
        const { x: bx, y: by, z: bz } = v;
        this.x = ay * bz - az * by;
        this.y = az * bx - ax * bz;
        this.z = ax * by - ay * bx;
        return this;
    }

    /**
     * Sets this vector to cross product of two other vectors.
     * @param {Vector3} a - first vector
     * @param {Vector3} b - second vector
     * @returns {Vector3} this vector for chaining
     */
    crossVectors(a, b) {
        const { x: ax, y: ay, z: az } = a;
        const { x: bx, y: by, z: bz } = b;
        this.x = ay * bz - az * by;
        this.y = az * bx - ax * bz;
        this.z = ax * by - ay * bx;
        return this;
    }

    /**
     * Calculates distance to another vector.
     * @param {Vector3} v - other vector
     * @returns {number} distance
     */
    distanceTo(v) {
        return Math.sqrt(this.distanceToSq(v));
    }

    /**
     * Calculates squared distance to another vector.
     * @param {Vector3} v - other vector
     * @returns {number} squared distance
     */
    distanceToSq(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * Divides this vector by another vector. (component-wise)
     * @param {Vector3} v - vector to divide by
     * @returns {Vector3} this vector for chaining
     */
    div(v) {
        this.x /= v.x;
        this.y /= v.y;
        this.z /= v.z;
        return this;
    }

    /**
     * Divides this vector by scalar value.
     * @param {number} scalar - scalar value to divide by
     * @returns {Vector3} this vector for chaining
     */
    divScalar(scalar) {
        this.x /= scalar;
        this.y /= scalar;
        this.z /= scalar;
        return this;
    }

    /**
     * Calculates dot product with another vector.
     * @param {Vector3} v - other vector
     * @returns {number} dot product
     */
    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    /**
     * Checks if this vector equals another vector.
     * @param {Vector3} v - other vector
     * @returns {boolean} true if equal
     */
    equals(v) {
        return MathUtils.equals(this.x, v.x) &&
            MathUtils.equals(this.y, v.y) &&
            MathUtils.equals(this.z, v.z);
    }

    /**
     * Sets this vector from array values.
     * @param {number[]} array - array with x, y, z values
     * @param {number} [offset=0] - offset into array
     * @returns {Vector3} this vector for chaining
     */
    fromArray(array, offset = 0) {
        this.x = array[offset];
        this.y = array[offset + 1];
        this.z = array[offset + 2];
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
        const { x, y, z } = this;
        return x * x + y * y + z * z;
    }

    /**
     * Linearly interpolates between this vector and another.
     * @param {Vector3} v - target vector
     * @param {number} alpha - interpolation factor (0-1)
     * @returns {Vector3} this vector for chaining
     */
    lerp(v, alpha) {
        this.x = MathUtils.lerp(this.x, v.x, alpha);
        this.y = MathUtils.lerp(this.y, v.y, alpha);
        this.z = MathUtils.lerp(this.z, v.z, alpha);
        return this;
    }

    /**
     * Multiplies this vector by another vector. (component-wise)
     * @param {Vector3} v - vector to multiply by
     * @returns {Vector3} this vector for chaining
     */
    mul(v) {
        this.x *= v.x;
        this.y *= v.y;
        this.z *= v.z;
        return this;
    }

    /**
     * Multiplies this vector by scalar value.
     * @param {number} scalar - scalar value to multiply by
     * @returns {Vector3} this vector for chaining
     */
    mulScalar(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }

    /**
     * Rotates this vector by an angle.
     * @param {number} angle - angle in radians
     * @returns {Vector3} this vector for chaining
     */
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const { x, y, z } = this;
        this.x = x * cos - y * sin;
        this.y = x * sin + y * cos;
        this.z = z;
        return this;
    }

    /**
     * Negates this vector.
     * @returns {Vector3} this vector for chaining
     */
    neg() {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    /**
     * Projects this vector onto another vector.
     * @param {Vector3} v - vector to project onto
     * @returns {Vector3} this vector for chaining
     */
    project(v) {
        const denominator = v.lengthSq();
        if (denominator === 0) return this.set(0, 0, 0);

        const scalar = v.dot(this) / denominator;
        return this.copy(v).mulScalar(scalar);
    }

    /**
     * Sets components of this vector.
     * @param {number} x - x component
     * @param {number} y - y component
     * @param {number} z - z component
     * @returns {Vector3} this vector for chaining
     */
    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    /**
     * Sets this vector from matrix position. (translation component)
     * @param {Matrix4} m - source matrix
     * @returns {Vector3} this vector for chaining
     */
    setFromMatrixPosition(m) {
        const me = m.elements;
        this.x = me[12];
        this.y = me[13];
        this.z = me[14];
        return this;
    }

    /**
     * Sets all components to same scalar value.
     * @param {number} scalar - scalar value to set
     * @returns {Vector3} this vector for chaining
     */
    setScalar(scalar) {
        this.x = scalar;
        this.y = scalar;
        this.z = scalar;
        return this;
    }

    /**
     * Subtracts another vector from this vector.
     * @param {Vector3} v - vector to subtract
     * @returns {Vector3} this vector for chaining
     */
    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    /**
     * Subtracts scalar value from this vector.
     * @param {number} scalar - scalar value to subtract
     * @returns {Vector3} this vector for chaining
     */
    subScalar(scalar) {
        this.x -= scalar;
        this.y -= scalar;
        this.z -= scalar;
        return this;
    }

    /**
     * Sets this vector to difference of two vectors. (a - b)
     * @param {Vector3} a - first vector
     * @param {Vector3} b - second vector to subtract
     * @returns {Vector3} this vector for chaining
     */
    subVectors(a, b) {
        this.x = a.x - b.x;
        this.y = a.y - b.y;
        this.z = a.z - b.z;
        return this;
    }

    /**
     * Returns array representation.
     * @returns {number[]} [x, y, z]
     */
    toArray() {
        return [this.x, this.y, this.z];
    }

    /**
     * Unitizes this vector.
     * @returns {Vector3} this vector for chaining
     */
    unitize() {
        return this.divScalar(this.length() || 1);
    }

    /**
     * Vector with zero values.
     * @type {Vector3}
     */
    static ZERO = new Vector3(0, 0, 0);

    /**
     * Vector with one values.
     * @type {Vector3}
     */
    static ONE = new Vector3(1, 1, 1);

    /**
     * Unit vector pointing up.
     * @type {Vector3}
     */
    static UP = new Vector3(0, 1, 0);

    /**
     * Unit vector pointing down.
     * @type {Vector3}
     */
    static DOWN = new Vector3(0, -1, 0);

    /**
     * Unit vector pointing left.
     * @type {Vector3}
     */
    static LEFT = new Vector3(-1, 0, 0);

    /**
     * Unit vector pointing right.
     * @type {Vector3}
     */
    static RIGHT = new Vector3(1, 0, 0);

    /**
     * Unit vector pointing forward.
     * @type {Vector3}
     */
    static FORWARD = new Vector3(0, 0, -1);

    /**
     * Unit vector pointing back.
     * @type {Vector3}
     */
    static BACK = new Vector3(0, 0, 1);

    /**
     * Calculates cross product of two vectors.
     * @param {Vector3} a - first vector
     * @param {Vector3} b - second vector
     * @returns {Vector3} new vector with cross product result
     */
    static crossVectors(a, b) {
        return new Vector3().copy(a).cross(b);
    }

    /**
     * Creates vector from angle and length.
     * @param {number} angle - angle in radians
     * @param {number} [length=1] - length of vector
     * @returns {Vector3} new vector
     */
    static fromAngle(angle, length = 1) {
        return new Vector3(
            Math.cos(angle) * length,
            Math.sin(angle) * length,
            0 // Z component 0 for 2D angles
        );
    }

    /**
     * Linearly interpolates between two vectors.
     * @param {Vector3} a - start vector
     * @param {Vector3} b - end vector
     * @param {number} alpha - interpolation factor (0-1)
     * @returns {Vector3} new interpolated vector
     */
    static lerpVectors(a, b, alpha) {
        return new Vector3().copy(a).lerp(b, alpha);
    }
}
