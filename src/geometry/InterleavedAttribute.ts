import type { InterleavedBuffer } from "./InterleavedBuffer.ts";

/** View into an InterleavedBuffer at a specific offset and stride. */
export class InterleavedAttribute {
	#data: InterleavedBuffer;
	#itemSize: number;
	#offset: number;
	needsUpdate = false;

	constructor(data: InterleavedBuffer, itemSize: number, offset: number) {
		this.#data = data;
		this.#itemSize = itemSize;
		this.#offset = offset;
	}

	get data(): InterleavedBuffer {
		return this.#data;
	}

	get itemSize(): number {
		return this.#itemSize;
	}

	get offset(): number {
		return this.#offset;
	}

	get count(): number {
		return this.#data.count;
	}

	get array(): Float32Array | Int32Array | Uint32Array | Uint16Array {
		return this.#data.array;
	}

	getX(index: number): number {
		return this.#data.array[index * this.#data.stride + this.#offset];
	}

	getY(index: number): number {
		return this.#data.array[index * this.#data.stride + this.#offset + 1];
	}

	getZ(index: number): number {
		return this.#data.array[index * this.#data.stride + this.#offset + 2];
	}

	getW(index: number): number {
		return this.#data.array[index * this.#data.stride + this.#offset + 3];
	}

	setX(index: number, x: number): this {
		this.#data.array[index * this.#data.stride + this.#offset] = x;
		return this;
	}

	setY(index: number, y: number): this {
		this.#data.array[index * this.#data.stride + this.#offset + 1] = y;
		return this;
	}

	setZ(index: number, z: number): this {
		this.#data.array[index * this.#data.stride + this.#offset + 2] = z;
		return this;
	}

	setW(index: number, w: number): this {
		this.#data.array[index * this.#data.stride + this.#offset + 3] = w;
		return this;
	}
}
