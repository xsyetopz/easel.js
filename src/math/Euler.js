import { MathUtils } from "./MathUtils.js";
import { Matrix4 } from "./Matrix4.js";
import { Quaternion } from "./Quaternion.js";

/**
 * @typedef {"XYZ" | "YXZ" | "ZXY" | "ZYX" | "YZX" | "XZY"} EulerOrder
 */

/**
 * @typedef {{ axis: "x"|"y"|"z", n: (m: Record<string, number>) => number, d: (m: Record<string, number>) => number }} AxisFn
 * @typedef {{ primary: "x"|"y"|"z", asinVal: (m: Record<string, number>) => number, lockVal: (m: Record<string, number>) => number, locked: { a: AxisFn, b: AxisFn }, unlocked: { a: AxisFn, b: AxisFn } }} RotationOrderConfig
 */

const _m = new Matrix4();

export class Euler {
	static #GIMBAL_LOCK_THRESHOLD = 0.9999999;

	#x = 0;
	#y = 0;
	#z = 0;
	/** @type {EulerOrder} */
	#order = "XYZ";
	/** @type {(() => void) | undefined} */
	#onChangeCallback = undefined;

	/**
	 * @param {number} [x]
	 * @param {number} [y]
	 * @param {number} [z]
	 * @param {EulerOrder} [order]
	 */
	constructor(x = 0, y = 0, z = 0, order = "XYZ") {
		this.#x = x;
		this.#y = y;
		this.#z = z;
		this.#order = order;
	}

	/** @returns {number} */
	get x() {
		return this.#x;
	}

	/** @param {number} value */
	set x(value) {
		this.#x = value;
		this.#onChange();
	}

	/** @returns {number} */
	get y() {
		return this.#y;
	}

	/** @param {number} value */
	set y(value) {
		this.#y = value;
		this.#onChange();
	}

	/** @returns {number} */
	get z() {
		return this.#z;
	}

	/** @param {number} value */
	set z(value) {
		this.#z = value;
		this.#onChange();
	}

	/** @returns {EulerOrder} */
	get order() {
		return this.#order;
	}

	/** @param {EulerOrder} value */
	set order(value) {
		this.#order = value;
		this.#onChange();
	}

	#onChange() {
		if (this.#onChangeCallback) this.#onChangeCallback();
	}

	/**
	 * @returns {Euler}
	 */
	clone() {
		return new Euler(this.x, this.y, this.z, this.order);
	}

	/**
	 * @param {Euler} euler
	 * @returns {this}
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
	 * @param {[number, number, number, EulerOrder?]} array
	 * @returns {this}
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
	 * Re-expresses this euler in a different rotation order, preserving orientation.
	 * @param {EulerOrder} newOrder
	 * @returns {this}
	 */
	reorder(newOrder) {
		const q = new Quaternion().setFromEuler(this);
		return this.setFromQuaternion(q, newOrder);
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @param {EulerOrder} [order]
	 * @returns {this}
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
	 * @param {Quaternion} q
	 * @param {EulerOrder} [order]
	 * @returns {this}
	 */
	setFromQuaternion(q, order) {
		_m.makeRotationFromQuaternion(q);
		return this.setFromRotationMatrix(_m, order);
	}

	/**
	 * @param {Matrix4 | { elements: number[] }} m
	 * @param {EulerOrder} [order]
	 * @returns {this}
	 */
	setFromRotationMatrix(m, order) {
		const te = m.elements;
		const m11 = te[0];
		const m12 = te[4];
		const m13 = te[8];
		const m21 = te[1];
		const m22 = te[5];
		const m23 = te[9];
		const m31 = te[2];
		const m32 = te[6];
		const m33 = te[10];
		const currentOrder = order || this.order;
		this.#applyRotationOrder(
			currentOrder,
			m11,
			m12,
			m13,
			m21,
			m22,
			m23,
			m31,
			m32,
			m33,
		);
		this.order = currentOrder;
		this.#onChange();
		return this;
	}

	/**
	 * @param {EulerOrder} ord
	 * @param {number} m11
	 * @param {number} m12
	 * @param {number} m13
	 * @param {number} m21
	 * @param {number} m22
	 * @param {number} m23
	 * @param {number} m31
	 * @param {number} m32
	 * @param {number} m33
	 */
	#applyRotationOrder(ord, m11, m12, m13, m21, m22, m23, m31, m32, m33) {
		const m = { m11, m12, m13, m21, m22, m23, m31, m32, m33 };
		const cfg = Euler.#ROTATION_ORDER_CONFIG[ord];
		if (cfg === undefined) return;
		this.#applyOrderConfig(cfg, m);
	}

	/**
	 * @param {RotationOrderConfig} cfg
	 * @param {Record<string, number>} m
	 */
	#applyOrderConfig(cfg, m) {
		const { primary, asinVal, lockVal, locked, unlocked } = cfg;
		const asin = asinVal(m);
		this.#setAxis(primary, MathUtils.safeAsin(asin));
		if (Math.abs(lockVal(m)) >= Euler.#GIMBAL_LOCK_THRESHOLD) {
			this.#setAxis(
				locked.a.axis,
				MathUtils.fastAtan2(locked.a.n(m), locked.a.d(m)),
			);
			const fallback = MathUtils.fastAtan2(locked.b.n(m), locked.b.d(m));
			this.#setAxis(
				locked.b.axis,
				this.#getAxis(locked.b.axis) === 0
					? fallback
					: this.#getAxis(locked.b.axis),
			);
		} else {
			this.#setAxis(
				unlocked.a.axis,
				MathUtils.fastAtan2(unlocked.a.n(m), unlocked.a.d(m)),
			);
			this.#setAxis(
				unlocked.b.axis,
				MathUtils.fastAtan2(unlocked.b.n(m), unlocked.b.d(m)),
			);
		}
	}

	/**
	 * @param {"x"|"y"|"z"} axis
	 * @param {number} value
	 */
	#setAxis(axis, value) {
		if (axis === "x") this.x = value;
		else if (axis === "y") this.y = value;
		else this.z = value;
	}

	/**
	 * @param {"x"|"y"|"z"} axis
	 * @returns {number}
	 */
	#getAxis(axis) {
		if (axis === "x") return this.x;
		if (axis === "y") return this.y;
		return this.z;
	}

	/** @type {Record<EulerOrder, RotationOrderConfig>} */
	static #ROTATION_ORDER_CONFIG = {
		XYZ: {
			primary: "y",
			asinVal: (m) => m["m13"],
			lockVal: (m) => m["m13"],
			locked: {
				a: { axis: "x", n: (m) => m["m32"], d: (m) => m["m22"] },
				b: { axis: "z", n: (m) => -m["m12"], d: (m) => m["m11"] },
			},
			unlocked: {
				a: { axis: "x", n: (m) => -m["m23"], d: (m) => m["m33"] },
				b: { axis: "z", n: (m) => -m["m12"], d: (m) => m["m11"] },
			},
		},
		YXZ: {
			primary: "x",
			asinVal: (m) => -m["m23"],
			lockVal: (m) => m["m23"],
			locked: {
				a: { axis: "y", n: (m) => -m["m31"], d: (m) => m["m11"] },
				b: { axis: "z", n: (m) => m["m21"], d: (m) => m["m22"] },
			},
			unlocked: {
				a: { axis: "y", n: (m) => m["m13"], d: (m) => m["m33"] },
				b: { axis: "z", n: (m) => m["m21"], d: (m) => m["m22"] },
			},
		},
		ZXY: {
			primary: "x",
			asinVal: (m) => m["m32"],
			lockVal: (m) => m["m32"],
			locked: {
				a: { axis: "z", n: (m) => m["m21"], d: (m) => m["m11"] },
				b: { axis: "y", n: (m) => -m["m31"], d: (m) => m["m33"] },
			},
			unlocked: {
				a: { axis: "y", n: (m) => -m["m31"], d: (m) => m["m33"] },
				b: { axis: "z", n: (m) => -m["m12"], d: (m) => m["m22"] },
			},
		},
		ZYX: {
			primary: "y",
			asinVal: (m) => -m["m31"],
			lockVal: (m) => m["m31"],
			locked: {
				a: { axis: "z", n: (m) => -m["m12"], d: (m) => m["m22"] },
				b: { axis: "x", n: (m) => m["m32"], d: (m) => m["m33"] },
			},
			unlocked: {
				a: { axis: "x", n: (m) => m["m32"], d: (m) => m["m33"] },
				b: { axis: "z", n: (m) => m["m21"], d: (m) => m["m11"] },
			},
		},
		YZX: {
			primary: "z",
			asinVal: (m) => m["m21"],
			lockVal: (m) => m["m21"],
			locked: {
				a: { axis: "y", n: (m) => m["m13"], d: (m) => m["m33"] },
				b: { axis: "x", n: (m) => -m["m23"], d: (m) => m["m22"] },
			},
			unlocked: {
				a: { axis: "x", n: (m) => -m["m23"], d: (m) => m["m22"] },
				b: { axis: "y", n: (m) => -m["m31"], d: (m) => m["m11"] },
			},
		},
		XZY: {
			primary: "z",
			asinVal: (m) => -m["m12"],
			lockVal: (m) => m["m12"],
			locked: {
				a: { axis: "x", n: (m) => m["m32"], d: (m) => m["m22"] },
				b: { axis: "y", n: (m) => m["m13"], d: (m) => m["m11"] },
			},
			unlocked: {
				a: { axis: "x", n: (m) => m["m32"], d: (m) => m["m22"] },
				b: { axis: "y", n: (m) => m["m13"], d: (m) => m["m11"] },
			},
		},
	};

	/**
	 * Registers a callback invoked whenever x, y, z, or order changes.
	 * @param {() => void} callback
	 * @returns {this}
	 */
	setOnChangeCallback(callback) {
		this.#onChangeCallback = callback;
		return this;
	}
}
