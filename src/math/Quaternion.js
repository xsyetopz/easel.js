import { Euler } from "./Euler.js";
import { Matrix4 } from "./Matrix4.js";
import { Vector3 } from "./Vector3.js";

export class Quaternion {
    /**
     * Creates Quaternion instance.
     * @param {number} [x=0] - x component
     * @param {number} [y=0] - y component
     * @param {number} [z=0] - z component
     * @param {number} [w=1] - w component
     */
    constructor(
        x = 0,
        y = 0,
        z = 0,
        w = 1,
    ) {
        /**
         * @type {number}
         */
        this.x = x;
        /**
         * @type {number}
         */
        this.y = y;
        /**
         * @type {number}
         */
        this.z = z;
        /**
         * @type {number}
         */
        this.w = w;
    }

    /**
     * Returns clone of this quaternion.
     * @returns {Quaternion}
     */
    clone() {
        return new Quaternion().copy(this);
    }

    /**
     * Copies values from another quaternion.
     * @param {Quaternion} q - source quaternion
     * @returns {Quaternion} this quaternion for chaining
     */
    copy(q) {
        this.x = q.x;
        this.y = q.y;
        this.z = q.z;
        this.w = q.w;
        return this;
    }

    /**
     * Divides this quaternion by scalar value.
     * @param {number} scalar - scalar value to divide by
     * @returns {Quaternion} this quaternion for chaining
     */
    divScalar(scalar) {
        this.x /= scalar;
        this.y /= scalar;
        this.z /= scalar;
        this.w /= scalar;
        return this;
    }

    /**
     * Sets values from array.
     * @param {Array} array - [x, y, z, w]
     * @returns {Quaternion} this quaternion for chaining
     */
    fromArray(array) {
        this.x = array[0];
        this.y = array[1];
        this.z = array[2];
        this.w = array[3];
        return this;
    }

    /**
     * Inverts this quaternion.
     * @returns {Quaternion} this quaternion for chaining
     */
    invert() {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    /**
     * Returns length of this quaternion.
     * @returns {number}
     */
    length() {
        return Math.sqrt(this.lengthSq());
    }

    /**
     * Returns squared length of this quaternion.
     * @returns {number}
     */
    lengthSq() {
        const { x, y, z, w } = this;
        return (x * x) + (y * y) + (z * z) + (w * w);
    }

    /**
     * Premultiplies this quaternion by q.
     * @param {Quaternion} q
     * @returns {Quaternion} this quaternion for chaining
     */
    premul(q) {
        const { x, y, z, w } = this;
        const { x: qx, y: qy, z: qz, w: qw } = q;

        this.x = (qx * w) + (qw * x) + (qy * z) - (qz * y);
        this.y = (qy * w) + (qw * y) + (qz * x) - (qx * z);
        this.z = (qz * w) + (qw * z) + (qx * y) - (qy * x);
        this.w = (qw * w) - (qx * x) - (qy * y) - (qz * z);
        return this;
    }

    /**
     * Sets values.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} w
     * @returns {Quaternion} this quaternion for chaining
     */
    set(x, y, z, w) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
    }

    /**
     * Sets from axis and angle.
     * @param {Vector3} axis
     * @param {number} angle
     * @returns {Quaternion} this quaternion for chaining
     */
    setFromAxisAngle(axis, angle) {
        const halfAngle = angle * 0.5;
        const sin = Math.sin(halfAngle);

        this.x = axis.x * sin;
        this.y = axis.y * sin;
        this.z = axis.z * sin;
        this.w = Math.cos(halfAngle);
        return this;
    }

    /**
     * Sets from Euler angles.
     * @param {Euler} euler
     * @returns {Quaternion} this quaternion for chaining
     */
    setFromEuler(euler) {
        const { x, y, z, order } = euler;

        const c1 = Math.cos(x * 0.5);
        const c2 = Math.cos(y * 0.5);
        const c3 = Math.cos(z * 0.5);
        const s1 = Math.sin(x * 0.5);
        const s2 = Math.sin(y * 0.5);
        const s3 = Math.sin(z * 0.5);

        switch (order) {
            case "XYZ":
                this.x = (s1 * c2 * c3) + (c1 * s2 * s3);
                this.y = (c1 * s2 * c3) - (s1 * c2 * s3);
                this.z = (c1 * c2 * s3) + (s1 * s2 * c3);
                this.w = (c1 * c2 * c3) - (s1 * s2 * s3);
                return this;
            case "YXZ":
                this.x = (s1 * c2 * c3) + (c1 * s2 * s3);
                this.y = (c1 * s2 * c3) - (s1 * c2 * s3);
                this.z = (c1 * c2 * s3) - (s1 * s2 * c3);
                this.w = (c1 * c2 * c3) + (s1 * s2 * s3);
                return this;
            case "ZXY":
                this.x = (s1 * c2 * c3) - (c1 * s2 * s3);
                this.y = (c1 * s2 * c3) + (s1 * c2 * s3);
                this.z = (c1 * c2 * s3) + (s1 * s2 * c3);
                this.w = (c1 * c2 * c3) - (s1 * s2 * s3);
                return this;
            case "ZYX":
                this.x = (s1 * c2 * c3) - (c1 * s2 * s3);
                this.y = (c1 * s2 * c3) + (s1 * s2 * s3);
                this.z = (c1 * c2 * s3) - (s1 * s2 * c3);
                this.w = (c1 * c2 * c3) + (s1 * s2 * s3);
                return this;
            case "YZX":
                this.x = (s1 * c2 * c3) + (c1 * s2 * s3);
                this.y = (c1 * s2 * c3) + (s1 * c2 * s3);
                this.z = (c1 * c2 * s3) - (s1 * s2 * c3);
                this.w = (c1 * c2 * c3) - (s1 * s2 * s3);
                return this;
            case "XZY":
                this.x = (s1 * c2 * c3) - (c1 * s2 * s3);
                this.y = (c1 * s2 * c3) - (s1 * c2 * s3);
                this.z = (c1 * c2 * s3) + (s1 * s2 * c3);
                this.w = (c1 * c2 * c3) + (s1 * s2 * s3);
                return this;
        }
    }

    /**
     * Sets from rotation Matrix4.
     * @param {Matrix4} m
     * @returns {Quaternion} this quaternion for chaining
     */
    setFromRotationMatrix(m) {
        const te = m.elements;

        const m11 = te[0], m12 = te[4], m13 = te[8];
        const m21 = te[1], m22 = te[5], m23 = te[9];
        const m31 = te[2], m32 = te[6], m33 = te[10];

        const trace = m11 + m22 + m33;
        if (trace > 0) {
            const scalar = 0.5 / Math.sqrt(trace + 1.0);
            this.w = 0.25 / scalar;
            this.x = (m32 - m23) * scalar;
            this.y = (m13 - m31) * scalar;
            this.z = (m21 - m12) * scalar;
        } else if (m11 > m22 && m11 > m33) {
            const scalar = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33);
            this.w = (m32 - m23) / scalar;
            this.x = 0.25 * scalar;
            this.y = (m12 + m21) / scalar;
            this.z = (m13 + m31) / scalar;
        } else if (m22 > m33) {
            const scalar = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33);
            this.w = (m13 - m31) / scalar;
            this.x = (m12 + m21) / scalar;
            this.y = 0.25 * scalar;
            this.z = (m23 + m32) / scalar;
        } else {
            const scalar = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22);
            this.w = (m21 - m12) / scalar;
            this.x = (m13 + m31) / scalar;
            this.y = (m23 + m32) / scalar;
            this.z = 0.25 * scalar;
        }
        return this;
    }

    /**
     * Normalizes this quaternion.
     * @returns {Quaternion} this quaternion for chaining
     */
    unitize() {
        return this.divScalar(this.length() || 1);
    }

    /**
     * Iterator for quaternion components.
     */
    *[Symbol.iterator]() {
        yield this.x;
        yield this.y;
        yield this.z;
        yield this.w;
    }
}
