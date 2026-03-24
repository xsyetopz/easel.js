import { Vector2 } from "./Vector2.ts";

const _v = new Vector2();

/** 2D axis-aligned bounding box. */
export class Box2 {
	#min: Vector2 = new Vector2(
		Number.POSITIVE_INFINITY,
		Number.POSITIVE_INFINITY,
	);
	#max: Vector2 = new Vector2(
		Number.NEGATIVE_INFINITY,
		Number.NEGATIVE_INFINITY,
	);

	constructor(
		min: Vector2 = new Vector2(
			Number.POSITIVE_INFINITY,
			Number.POSITIVE_INFINITY,
		),
		max: Vector2 = new Vector2(
			Number.NEGATIVE_INFINITY,
			Number.NEGATIVE_INFINITY,
		),
	) {
		this.#min = min.clone();
		this.#max = max.clone();
	}

	get min(): Vector2 {
		return this.#min;
	}

	set min(value: Vector2) {
		this.#min.copy(value);
	}

	get max(): Vector2 {
		return this.#max;
	}

	set max(value: Vector2) {
		this.#max.copy(value);
	}

	set(min: Vector2, max: Vector2): this {
		this.#min.copy(min);
		this.#max.copy(max);
		return this;
	}

	clone(): Box2 {
		return new Box2(this.#min, this.#max);
	}

	copy(box: Box2): this {
		this.#min.copy(box.min);
		this.#max.copy(box.max);
		return this;
	}

	makeEmpty(): this {
		this.#min.set(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
		this.#max.set(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
		return this;
	}

	isEmpty(): boolean {
		return this.#max.x < this.#min.x || this.#max.y < this.#min.y;
	}

	getCenter(target: Vector2 = new Vector2()): Vector2 {
		return this.isEmpty()
			? target.set(0, 0)
			: target.set(
					(this.#min.x + this.#max.x) * 0.5,
					(this.#min.y + this.#max.y) * 0.5,
				);
	}

	getSize(target: Vector2 = new Vector2()): Vector2 {
		return this.isEmpty()
			? target.set(0, 0)
			: target.set(this.#max.x - this.#min.x, this.#max.y - this.#min.y);
	}

	expandByPoint(point: Vector2): this {
		if (point.x < this.#min.x) this.#min.x = point.x;
		if (point.y < this.#min.y) this.#min.y = point.y;
		if (point.x > this.#max.x) this.#max.x = point.x;
		if (point.y > this.#max.y) this.#max.y = point.y;
		return this;
	}

	expandByVector(vector: Vector2): this {
		this.#min.x -= vector.x;
		this.#min.y -= vector.y;
		this.#max.x += vector.x;
		this.#max.y += vector.y;
		return this;
	}

	expandByScalar(scalar: number): this {
		this.#min.x -= scalar;
		this.#min.y -= scalar;
		this.#max.x += scalar;
		this.#max.y += scalar;
		return this;
	}

	containsPoint(point: Vector2): boolean {
		return (
			point.x >= this.#min.x &&
			point.x <= this.#max.x &&
			point.y >= this.#min.y &&
			point.y <= this.#max.y
		);
	}

	containsBox(box: Box2): boolean {
		return (
			this.#min.x <= box.min.x &&
			box.max.x <= this.#max.x &&
			this.#min.y <= box.min.y &&
			box.max.y <= this.#max.y
		);
	}

	/** Returns [0,1] parameter of point within box dimensions. */
	getParameter(point: Vector2, target: Vector2 = new Vector2()): Vector2 {
		return target.set(
			(point.x - this.#min.x) / (this.#max.x - this.#min.x),
			(point.y - this.#min.y) / (this.#max.y - this.#min.y),
		);
	}

	intersectsBox(box: Box2): boolean {
		return !(
			box.max.x < this.#min.x ||
			box.min.x > this.#max.x ||
			box.max.y < this.#min.y ||
			box.min.y > this.#max.y
		);
	}

	clampPoint(point: Vector2, target: Vector2 = new Vector2()): Vector2 {
		return target.set(
			Math.max(this.#min.x, Math.min(this.#max.x, point.x)),
			Math.max(this.#min.y, Math.min(this.#max.y, point.y)),
		);
	}

	distanceToPoint(point: Vector2): number {
		this.clampPoint(point, _v);
		_v.sub(point);
		return Math.sqrt(_v.x * _v.x + _v.y * _v.y);
	}

	/** Returns the intersection of this box with another. */
	intersect(box: Box2): this {
		this.#min.x = Math.max(this.#min.x, box.min.x);
		this.#min.y = Math.max(this.#min.y, box.min.y);
		this.#max.x = Math.min(this.#max.x, box.max.x);
		this.#max.y = Math.min(this.#max.y, box.max.y);
		return this;
	}

	/** Expands this box to contain another. */
	union(box: Box2): this {
		this.#min.x = Math.min(this.#min.x, box.min.x);
		this.#min.y = Math.min(this.#min.y, box.min.y);
		this.#max.x = Math.max(this.#max.x, box.max.x);
		this.#max.y = Math.max(this.#max.y, box.max.y);
		return this;
	}

	translate(offset: Vector2): this {
		this.#min.add(offset);
		this.#max.add(offset);
		return this;
	}

	equals(box: Box2): boolean {
		return box.min.equals(this.#min) && box.max.equals(this.#max);
	}
}
