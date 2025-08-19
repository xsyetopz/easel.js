import { Matrix4 } from "./Matrix4.ts";
import { Quaternion } from "./Quaternion.ts";

const _m = new Matrix4();

/**
 * @typedef {"XYZ" | "YXZ" | "ZXY" | "ZYX" | "YZX" | "XZY"} EulerOrder
 */

export class Euler {
    /** @private @readonly */
    static #GIMBAL_LOCK_THRESHOLD = 0.9999999;

    /**
     * @private @type {number}
     * @default 0
     */
    #x = 0;

    /**
     * @private @type {number}
     * @default 0
     */
    #y = 0;

    /**
     * @private @type {number}
     * @default 0
     */
    #z = 0;

    /**
     * @private @type {EulerOrder}
     * @default "XYZ"
     */
    #order = "XYZ";

    /**
     * @private
     * @default undefined
     */
    #onChangeCallback = undefined;

    /**
     * Creates Euler instance.
     * @param {number} [x=0] - x rotation in radians
     * @param {number} [y=0] - y rotation in radians
     * @param {number} [z=0] - z rotation in radians
     * @param {EulerOrder} [order="XYZ"] - rotation order
     */
    constructor(
        x = 0,
        y = 0,
        z = 0,
        order = "XYZ",
    ) {
        /** @type {number} */
        this.#x = x;
        /** @type {number} */
        this.#y = y;
        /** @type {number} */
        this.#z = z;
        /** @type {EulerOrder} */
        this.#order = order;
    }

    /** @readonly */
    get x() { return this.#x; }
    set x(value) {
        this.#x = value;
        this.#onChange();
    }
    /** @readonly */
    get y() { return this.#y; }
    set y(value) {
        this.#y = value;
        this.#onChange();
    }
    /** @readonly */
    get z() { return this.#z; }
    set z(value) {
        this.#z = value;
        this.#onChange();
    }
    /** @readonly */
    get order() { return this.#order; }
    set order(value) {
        this.#order = value;
        this.#onChange();
    }

    /**
     * Returns clone of this Euler.
     * @returns {Euler}
     */
    clone() {
        return new Euler(this.x, this.y, this.z, this.order);
    }

    /**
     * Copies values from another Euler.
     * @param {Euler} euler - source Euler
     * @returns {Euler} this Euler for chaining
     */
    copy(euler) {
        this.x = euler.x;
        this.y = euler.y;
        this.z = euler.z;
        this.order = euler.order;
        this.#onChange();
        return this;
    }

    /**
     * Sets values from array.
     * @param {Array} array - [x, y, z, order]
     * @returns {Euler} this Euler for chaining
     */
    fromArray(array) {
        this.x = array[0];
        this.y = array[1];
        this.z = array[2];
        this.order = array[3] ?? this.order;
        this.#onChange();
        return this;
    }

    /**
     * Changes rotation order and updates angles.
     * @param {EulerOrder} newOrder
     * @returns {Euler} this Euler for chaining
     */
    reorder(newOrder) {
        const q = new Quaternion().setFromEuler(this);
        return this.setFromQuaternion(q, newOrder);
    }

    /**
     * Sets values.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {EulerOrder} [order]
     * @returns {Euler} this Euler for chaining
     */
    set(x, y, z, order) {
        this.x = x;
        this.y = y;
        this.z = z;
        if (order !== undefined) this.order = order;
        this.#onChange();
        return this;
    }

    /**
     * Sets from Quaternion.
     * @param {Quaternion} q
     * @param {EulerOrder} [order]
     * @returns {Euler} this Euler for chaining
     */
    setFromQuaternion(q, order) {
        _m.makeRotationFromQuaternion(q);
        return this.setFromRotationMatrix(_m, order);
    }

    /**
     * Sets from rotation Matrix4.
     * @param {Matrix4} m
     * @param {EulerOrder} [order]
     * @returns {Euler} this Euler for chaining
     */
    setFromRotationMatrix(m, order) {
        const te = m.elements;

        const m11 = te[0], m12 = te[4], m13 = te[8];
        const m21 = te[1], m22 = te[5], m23 = te[9];
        const m31 = te[2], m32 = te[6], m33 = te[10];

        const currentOrder = order || this.order;

        const isGimbalLock = (value) =>
            Math.abs(value) >= Euler.#GIMBAL_LOCK_THRESHOLD;

        switch (currentOrder) {
            case "XYZ":
                this.y = Math.asin(m13);
                if (isGimbalLock(m13)) {
                    this.x = Math.atan2(m32, m22);
                    this.z = this.z === 0 ? Math.atan2(-m12, m11) : this.z;
                } else {
                    this.x = Math.atan2(-m23, m33);
                    this.z = Math.atan2(-m12, m11);
                }
                break;
            case "YXZ":
                this.x = Math.asin(-m23);
                if (isGimbalLock(m23)) {
                    this.y = Math.atan2(-m31, m11);
                    this.z = this.z === 0 ? Math.atan2(m21, m22) : this.z;
                } else {
                    this.y = Math.atan2(m13, m33);
                    this.z = Math.atan2(m21, m22);
                }
                break;
            case "ZXY":
                this.x = Math.asin(m32);
                if (isGimbalLock(m32)) {
                    this.z = Math.atan2(m21, m11);
                    this.y = this.y === 0 ? Math.atan2(-m31, m33) : this.y;
                } else {
                    this.y = Math.atan2(-m31, m33);
                    this.z = Math.atan2(-m12, m22);
                }
                break;
            case "ZYX":
                this.y = Math.asin(-m31);
                if (isGimbalLock(m31)) {
                    this.z = Math.atan2(-m12, m22);
                    this.x = this.x === 0 ? Math.atan2(m32, m33) : this.x;
                } else {
                    this.x = Math.atan2(m32, m33);
                    this.z = Math.atan2(m21, m11);
                }
                break;
            case "YZX":
                this.z = Math.asin(m21);
                if (isGimbalLock(m21)) {
                    this.y = Math.atan2(m13, m33);
                    this.x = this.x === 0 ? Math.atan2(-m23, m22) : this.x;
                } else {
                    this.x = Math.atan2(-m23, m22);
                    this.y = Math.atan2(-m31, m11);
                }
                break;
            case "XZY":
                this.z = Math.asin(-m12);
                if (isGimbalLock(m12)) {
                    this.x = Math.atan2(m32, m22);
                    this.y = this.y === 0 ? Math.atan2(m13, m11) : this.y;
                } else {
                    this.x = Math.atan2(m32, m22);
                    this.y = Math.atan2(m13, m11);
                }
                break;
        }
        this.order = currentOrder;
        this.#onChange();
        return this;
    }

    /**
     * Sets callback for change events.
     * @param {Function} callback
     * @returns {Euler} this Euler for chaining
     */
    setOnChangeCallback(callback) {
        this.#onChangeCallback = callback;
        return this;
    }

    /**
     * @private
     */
    #onChange() {
        if (this.#onChangeCallback) this.#onChangeCallback();
    }
}
