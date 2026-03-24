/** 4D vector with x, y, z, w components. */
export class Vector4 {
	/** Computes the dot product of the given components against a target vector. */
	static dot(
		x: number,
		y: number,
		z: number,
		w: number,
		target: Vector4 = new Vector4(),
	): number {
		return x * target.x + y * target.y + z * target.z + w * target.w;
	}

	#x = 0;
	#y = 0;
	#z = 0;
	#w = 1;

	constructor(x = 0, y = 0, z = 0, w = 1) {
		this.#x = x;
		this.#y = y;
		this.#z = z;
		this.#w = w;
	}

	get x(): number {
		return this.#x;
	}

	set x(v: number) {
		this.#x = v;
	}

	get y(): number {
		return this.#y;
	}

	set y(v: number) {
		this.#y = v;
	}

	get z(): number {
		return this.#z;
	}

	set z(v: number) {
		this.#z = v;
	}

	get w(): number {
		return this.#w;
	}

	set w(v: number) {
		this.#w = v;
	}

	get length(): number {
		return Math.sqrt(this.lengthSq);
	}

	get lengthSq(): number {
		const { x, y, z, w } = this;
		return x * x + y * y + z * z + w * w;
	}

	clone(): Vector4 {
		return new Vector4(this.x, this.y, this.z, this.w);
	}

	copy(v: Vector4): this {
		this.x = v.x;
		this.y = v.y;
		this.z = v.z;
		this.w = v.w;
		return this;
	}

	divScalar(s: number): this {
		this.x /= s;
		this.y /= s;
		this.z /= s;
		this.w /= s;
		return this;
	}

	fromArray(a: number[]): this {
		this.x = a[0];
		this.y = a[1];
		this.z = a[2];
		this.w = a[3];
		return this;
	}

	set(x: number, y: number, z: number, w: number): this {
		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;
		return this;
	}

	/** Normalizes this vector to unit length. */
	normalize(): this {
		return this.divScalar(this.length || 1);
	}

	*[Symbol.iterator](): Generator<number> {
		yield this.x;
		yield this.y;
		yield this.z;
		yield this.w;
	}
}
