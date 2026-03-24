type TypedArray = Float32Array | Uint16Array | Uint32Array;

/** Typed array wrapper for a single vertex data channel. */
export class Attribute {
	#array: TypedArray;
	#itemSize: number;
	needsUpdate = false;

	constructor(array: TypedArray | number[], itemSize: number) {
		this.#array = Array.isArray(array) ? new Float32Array(array) : array;
		this.#itemSize = itemSize;
	}

	get array(): TypedArray {
		return this.#array;
	}

	get itemSize(): number {
		return this.#itemSize;
	}

	get count(): number {
		return this.#array.length / this.#itemSize;
	}

	getX(index: number): number {
		return this.#array[index * this.#itemSize];
	}

	getY(index: number): number {
		return this.#array[index * this.#itemSize + 1];
	}

	getZ(index: number): number {
		return this.#array[index * this.#itemSize + 2];
	}

	getW(index: number): number {
		return this.#array[index * this.#itemSize + 3];
	}

	setX(index: number, x: number): this {
		this.#array[index * this.#itemSize] = x;
		return this;
	}

	setXY(index: number, x: number, y: number): this {
		const i = index * this.#itemSize;
		this.#array[i] = x;
		this.#array[i + 1] = y;
		return this;
	}

	setXYZ(index: number, x: number, y: number, z: number): this {
		const i = index * this.#itemSize;
		this.#array[i] = x;
		this.#array[i + 1] = y;
		this.#array[i + 2] = z;
		return this;
	}

	setXYZW(index: number, x: number, y: number, z: number, w: number): this {
		const i = index * this.#itemSize;
		this.#array[i] = x;
		this.#array[i + 1] = y;
		this.#array[i + 2] = z;
		this.#array[i + 3] = w;
		return this;
	}

	clone(): Attribute {
		return new Attribute(this.#array.slice(), this.#itemSize);
	}
}
