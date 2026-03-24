/** 2D vector with x, y components. */
export class Vector2 {
	#x = 0;
	#y = 0;

	constructor(x = 0, y = 0) {
		this.#x = x;
		this.#y = y;
	}

	get x(): number {
		return this.#x;
	}

	set x(value: number) {
		this.#x = value;
	}

	get y(): number {
		return this.#y;
	}

	set y(value: number) {
		this.#y = value;
	}

	add(v: Vector2): this {
		this.x += v.x;
		this.y += v.y;
		return this;
	}

	clone(): Vector2 {
		return new Vector2(this.x, this.y);
	}

	copy(v: Vector2): this {
		this.x = v.x;
		this.y = v.y;
		return this;
	}

	/** 2D cross product (scalar). */
	cross(v: Vector2): number {
		return this.x * v.y - this.y * v.x;
	}

	/** Cross product magnitude of two 2D vectors. */
	static cross(x1: number, y1: number, x2: number, y2: number): number {
		return x1 * y2 - y1 * x2;
	}

	distanceTo(v: Vector2): number {
		const dx = this.x - v.x;
		const dy = this.y - v.y;
		return Math.sqrt(dx * dx + dy * dy);
	}

	dot(v: Vector2): number {
		return this.x * v.x + this.y * v.y;
	}

	/** Dot product of (x, y) with a target vector. */
	static dot(x: number, y: number, target: Vector2 = new Vector2()): number {
		return x * target.x + y * target.y;
	}

	equals(v: Vector2): boolean {
		return this.x === v.x && this.y === v.y;
	}

	fromArray(array: number[]): this {
		this.x = array[0];
		this.y = array[1];
		return this;
	}

	get length(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	get lengthSq(): number {
		return this.x * this.x + this.y * this.y;
	}

	lerp(v: Vector2, alpha: number): this {
		this.x += (v.x - this.x) * alpha;
		this.y += (v.y - this.y) * alpha;
		return this;
	}

	/** Component-wise max. */
	max(v: Vector2): this {
		this.x = Math.max(this.x, v.x);
		this.y = Math.max(this.y, v.y);
		return this;
	}

	/** Component-wise min. */
	min(v: Vector2): this {
		this.x = Math.min(this.x, v.x);
		this.y = Math.min(this.y, v.y);
		return this;
	}

	mulScalar(scalar: number): this {
		this.x *= scalar;
		this.y *= scalar;
		return this;
	}

	normalize(): this {
		const len = this.length;
		if (len > 0) {
			this.x /= len;
			this.y /= len;
		}
		return this;
	}

	set(x: number, y: number): this {
		this.x = x;
		this.y = y;
		return this;
	}

	sub(v: Vector2): this {
		this.x -= v.x;
		this.y -= v.y;
		return this;
	}

	/** Truncates x and y to integers via Math.trunc(). */
	trunc(): this {
		this.x = Math.trunc(this.x);
		this.y = Math.trunc(this.y);
		return this;
	}

	*[Symbol.iterator](): Generator<number> {
		yield this.x;
		yield this.y;
	}
}
