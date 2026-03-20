import { Vector2 } from "./Vector2.js";

const _v = new Vector2();

/** 2D axis-aligned bounding box. */
export class Box2 {
	#min = new Vector2(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
	#max = new Vector2(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

	/**
	 * @param {Vector2} [min]
	 * @param {Vector2} [max]
	 */
	constructor(
		min = new Vector2(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY),
		max = new Vector2(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY),
	) {
		this.#min = min.clone();
		this.#max = max.clone();
	}

	/** @returns {Vector2} */
	get min() {
		return this.#min;
	}

	/** @param {Vector2} value */
	set min(value) {
		this.#min.copy(value);
	}

	/** @returns {Vector2} */
	get max() {
		return this.#max;
	}

	/** @param {Vector2} value */
	set max(value) {
		this.#max.copy(value);
	}

	/**
	 * @param {Vector2} min
	 * @param {Vector2} max
	 * @returns {this}
	 */
	set(min, max) {
		this.#min.copy(min);
		this.#max.copy(max);
		return this;
	}

	/** @returns {Box2} */
	clone() {
		return new Box2(this.#min, this.#max);
	}

	/**
	 * @param {Box2} box
	 * @returns {this}
	 */
	copy(box) {
		this.#min.copy(box.min);
		this.#max.copy(box.max);
		return this;
	}

	/** @returns {this} */
	makeEmpty() {
		this.#min.set(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
		this.#max.set(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
		return this;
	}

	/** @returns {boolean} */
	isEmpty() {
		return this.#max.x < this.#min.x || this.#max.y < this.#min.y;
	}

	/**
	 * @param {Vector2} [target]
	 * @returns {Vector2}
	 */
	getCenter(target = new Vector2()) {
		return this.isEmpty()
			? target.set(0, 0)
			: target.set(
					(this.#min.x + this.#max.x) * 0.5,
					(this.#min.y + this.#max.y) * 0.5,
				);
	}

	/**
	 * @param {Vector2} [target]
	 * @returns {Vector2}
	 */
	getSize(target = new Vector2()) {
		return this.isEmpty()
			? target.set(0, 0)
			: target.set(this.#max.x - this.#min.x, this.#max.y - this.#min.y);
	}

	/**
	 * @param {Vector2} point
	 * @returns {this}
	 */
	expandByPoint(point) {
		if (point.x < this.#min.x) this.#min.x = point.x;
		if (point.y < this.#min.y) this.#min.y = point.y;
		if (point.x > this.#max.x) this.#max.x = point.x;
		if (point.y > this.#max.y) this.#max.y = point.y;
		return this;
	}

	/**
	 * @param {Vector2} vector
	 * @returns {this}
	 */
	expandByVector(vector) {
		this.#min.x -= vector.x;
		this.#min.y -= vector.y;
		this.#max.x += vector.x;
		this.#max.y += vector.y;
		return this;
	}

	/**
	 * @param {number} scalar
	 * @returns {this}
	 */
	expandByScalar(scalar) {
		this.#min.x -= scalar;
		this.#min.y -= scalar;
		this.#max.x += scalar;
		this.#max.y += scalar;
		return this;
	}

	/**
	 * @param {Vector2} point
	 * @returns {boolean}
	 */
	containsPoint(point) {
		return (
			point.x >= this.#min.x &&
			point.x <= this.#max.x &&
			point.y >= this.#min.y &&
			point.y <= this.#max.y
		);
	}

	/**
	 * @param {Box2} box
	 * @returns {boolean}
	 */
	containsBox(box) {
		return (
			this.#min.x <= box.min.x &&
			box.max.x <= this.#max.x &&
			this.#min.y <= box.min.y &&
			box.max.y <= this.#max.y
		);
	}

	/**
	 * Returns [0,1] parameter of point within box dimensions.
	 * @param {Vector2} point
	 * @param {Vector2} [target]
	 * @returns {Vector2}
	 */
	getParameter(point, target = new Vector2()) {
		return target.set(
			(point.x - this.#min.x) / (this.#max.x - this.#min.x),
			(point.y - this.#min.y) / (this.#max.y - this.#min.y),
		);
	}

	/**
	 * @param {Box2} box
	 * @returns {boolean}
	 */
	intersectsBox(box) {
		return !(
			box.max.x < this.#min.x ||
			box.min.x > this.#max.x ||
			box.max.y < this.#min.y ||
			box.min.y > this.#max.y
		);
	}

	/**
	 * @param {Vector2} point
	 * @param {Vector2} [target]
	 * @returns {Vector2}
	 */
	clampPoint(point, target = new Vector2()) {
		return target.set(
			Math.max(this.#min.x, Math.min(this.#max.x, point.x)),
			Math.max(this.#min.y, Math.min(this.#max.y, point.y)),
		);
	}

	/**
	 * @param {Vector2} point
	 * @returns {number}
	 */
	distanceToPoint(point) {
		this.clampPoint(point, _v);
		_v.sub(point);
		return Math.sqrt(_v.x * _v.x + _v.y * _v.y);
	}

	/**
	 * Returns the intersection of this box with another.
	 * @param {Box2} box
	 * @returns {this}
	 */
	intersect(box) {
		this.#min.x = Math.max(this.#min.x, box.min.x);
		this.#min.y = Math.max(this.#min.y, box.min.y);
		this.#max.x = Math.min(this.#max.x, box.max.x);
		this.#max.y = Math.min(this.#max.y, box.max.y);
		return this;
	}

	/**
	 * Expands this box to contain another.
	 * @param {Box2} box
	 * @returns {this}
	 */
	union(box) {
		this.#min.x = Math.min(this.#min.x, box.min.x);
		this.#min.y = Math.min(this.#min.y, box.min.y);
		this.#max.x = Math.max(this.#max.x, box.max.x);
		this.#max.y = Math.max(this.#max.y, box.max.y);
		return this;
	}

	/**
	 * @param {Vector2} offset
	 * @returns {this}
	 */
	translate(offset) {
		this.#min.add(offset);
		this.#max.add(offset);
		return this;
	}

	/**
	 * @param {Box2} box
	 * @returns {boolean}
	 */
	equals(box) {
		return box.min.equals(this.#min) && box.max.equals(this.#max);
	}
}
