/** 4D vector with x, y, z, w components. */
export class Vector4 {
	/**
	 * Computes the dot product of the given components against a target vector.
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @param {number} w
	 * @param {Vector4} [target]
	 * @returns {number}
	 */
	static dot(x, y, z, w, target = new Vector4()) {
		return x * target.x + y * target.y + z * target.z + w * target.w;
	}

	#x = 0;
	#y = 0;
	#z = 0;
	#w = 1;

	/**
	 * @param {number} [x]
	 * @param {number} [y]
	 * @param {number} [z]
	 * @param {number} [w]
	 */
	constructor(x = 0, y = 0, z = 0, w = 1) {
		this.#x = x;
		this.#y = y;
		this.#z = z;
		this.#w = w;
	}

	/** @returns {number} */
	get x() {
		return this.#x;
	}

	/** @param {number} v */
	set x(v) {
		this.#x = v;
	}

	/** @returns {number} */
	get y() {
		return this.#y;
	}

	/** @param {number} v */
	set y(v) {
		this.#y = v;
	}

	/** @returns {number} */
	get z() {
		return this.#z;
	}

	/** @param {number} v */
	set z(v) {
		this.#z = v;
	}

	/** @returns {number} */
	get w() {
		return this.#w;
	}

	/** @param {number} v */
	set w(v) {
		this.#w = v;
	}

	/** @returns {number} */
	get length() {
		return Math.sqrt(this.lengthSq);
	}

	/** @returns {number} */
	get lengthSq() {
		const { x, y, z, w } = this;
		return x * x + y * y + z * z + w * w;
	}

	/**
	 * @returns {Vector4}
	 */
	clone() {
		return new Vector4(this.x, this.y, this.z, this.w);
	}

	/**
	 * @param {Vector4} v
	 * @returns {this}
	 */
	copy(v) {
		this.x = v.x;
		this.y = v.y;
		this.z = v.z;
		this.w = v.w;
		return this;
	}

	/**
	 * @param {number} s
	 * @returns {this}
	 */
	divScalar(s) {
		this.x /= s;
		this.y /= s;
		this.z /= s;
		this.w /= s;
		return this;
	}

	/**
	 * @param {number[]} a
	 * @returns {this}
	 */
	fromArray(a) {
		this.x = a[0];
		this.y = a[1];
		this.z = a[2];
		this.w = a[3];
		return this;
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @param {number} w
	 * @returns {this}
	 */
	set(x, y, z, w) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;
		return this;
	}

	/**
	 * Normalizes this vector to unit length.
	 * @returns {this}
	 */
	normalize() {
		return this.divScalar(this.length || 1);
	}

	*[Symbol.iterator]() {
		yield this.x;
		yield this.y;
		yield this.z;
		yield this.w;
	}
}
