/** 2D vector with x, y components. */
export class Vector2 {
	#x = 0;
	#y = 0;

	/**
	 * @param {number} [x]
	 * @param {number} [y]
	 */
	constructor(x = 0, y = 0) {
		this.#x = x;
		this.#y = y;
	}

	/** @returns {number} */
	get x() {
		return this.#x;
	}

	/** @param {number} value */
	set x(value) {
		this.#x = value;
	}

	/** @returns {number} */
	get y() {
		return this.#y;
	}

	/** @param {number} value */
	set y(value) {
		this.#y = value;
	}

	/**
	 * @param {Vector2} v
	 * @returns {this}
	 */
	add(v) {
		this.x += v.x;
		this.y += v.y;
		return this;
	}

	/**
	 * @returns {Vector2}
	 */
	clone() {
		return new Vector2(this.x, this.y);
	}

	/**
	 * @param {Vector2} v
	 * @returns {this}
	 */
	copy(v) {
		this.x = v.x;
		this.y = v.y;
		return this;
	}

	/**
	 * 2D cross product (scalar).
	 * @param {Vector2} v
	 * @returns {number}
	 */
	cross(v) {
		return this.x * v.y - this.y * v.x;
	}

	/**
	 * Cross product magnitude of two 2D vectors.
	 * @param {number} x1
	 * @param {number} y1
	 * @param {number} x2
	 * @param {number} y2
	 * @returns {number}
	 */
	static cross(x1, y1, x2, y2) {
		return x1 * y2 - y1 * x2;
	}

	/**
	 * @param {Vector2} v
	 * @returns {number}
	 */
	distanceTo(v) {
		const dx = this.x - v.x;
		const dy = this.y - v.y;
		return Math.sqrt(dx * dx + dy * dy);
	}

	/**
	 * @param {Vector2} v
	 * @returns {number}
	 */
	dot(v) {
		return this.x * v.x + this.y * v.y;
	}

	/**
	 * Dot product of (x, y) with a target vector.
	 * @param {number} x
	 * @param {number} y
	 * @param {Vector2} [target]
	 * @returns {number}
	 */
	static dot(x, y, target = new Vector2()) {
		return x * target.x + y * target.y;
	}

	/**
	 * @param {Vector2} v
	 * @returns {boolean}
	 */
	equals(v) {
		return this.x === v.x && this.y === v.y;
	}

	/**
	 * @param {number[]} array
	 * @returns {this}
	 */
	fromArray(array) {
		this.x = array[0];
		this.y = array[1];
		return this;
	}

	/** @returns {number} */
	get length() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	/** @returns {number} */
	get lengthSq() {
		return this.x * this.x + this.y * this.y;
	}

	/**
	 * @param {Vector2} v
	 * @param {number} alpha
	 * @returns {this}
	 */
	lerp(v, alpha) {
		this.x += (v.x - this.x) * alpha;
		this.y += (v.y - this.y) * alpha;
		return this;
	}

	/**
	 * Component-wise max.
	 * @param {Vector2} v
	 * @returns {this}
	 */
	max(v) {
		this.x = Math.max(this.x, v.x);
		this.y = Math.max(this.y, v.y);
		return this;
	}

	/**
	 * Component-wise min.
	 * @param {Vector2} v
	 * @returns {this}
	 */
	min(v) {
		this.x = Math.min(this.x, v.x);
		this.y = Math.min(this.y, v.y);
		return this;
	}

	/**
	 * @param {number} scalar
	 * @returns {this}
	 */
	mulScalar(scalar) {
		this.x *= scalar;
		this.y *= scalar;
		return this;
	}

	/** @returns {this} */
	normalize() {
		const len = this.length;
		if (len > 0) {
			this.x /= len;
			this.y /= len;
		}
		return this;
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @returns {this}
	 */
	set(x, y) {
		this.x = x;
		this.y = y;
		return this;
	}

	/**
	 * @param {Vector2} v
	 * @returns {this}
	 */
	sub(v) {
		this.x -= v.x;
		this.y -= v.y;
		return this;
	}

	/**
	 * Truncates x and y to integers via Math.trunc().
	 * @returns {this}
	 */
	trunc() {
		this.x = Math.trunc(this.x);
		this.y = Math.trunc(this.y);
		return this;
	}

	*[Symbol.iterator]() {
		yield this.x;
		yield this.y;
	}
}
