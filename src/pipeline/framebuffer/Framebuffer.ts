import { DepthBuffer } from "./DepthBuffer.ts";

interface ImageDataLike {
	data: Uint8ClampedArray;
	width: number;
	height: number;
}

/** RGBA pixel buffer backed by an Int32Array. */
export class Framebuffer {
	#width: number;
	#height: number;
	#imageData: ImageDataLike;
	#data: Uint8ClampedArray;
	#u32: Uint32Array;
	#depthBuffer: DepthBuffer;

	constructor(width: number, height: number) {
		this.#width = width;
		this.#height = height;
		this.#imageData = this.#createImageData(width, height);
		this.#data = this.#imageData.data;
		this.#u32 = new Uint32Array(
			this.#data.buffer,
			this.#data.byteOffset,
			this.#data.byteLength >> 2,
		);
		this.#depthBuffer = new DepthBuffer(width, height);
	}

	#createImageData(width: number, height: number): ImageDataLike {
		if (typeof globalThis.ImageData !== "undefined") {
			return new globalThis.ImageData(width, height);
		}
		return { data: new Uint8ClampedArray(width * height * 4), width, height };
	}

	get width(): number {
		return this.#width;
	}

	get height(): number {
		return this.#height;
	}

	get imageData(): ImageDataLike {
		return this.#imageData;
	}

	get data(): Uint8ClampedArray {
		return this.#data;
	}

	get u32(): Uint32Array {
		return this.#u32;
	}

	get depthBuffer(): DepthBuffer {
		return this.#depthBuffer;
	}

	setPixel(
		x: number,
		y: number,
		r: number,
		g: number,
		b: number,
		a = 255,
	): void {
		const idx = (y * this.#width + x) << 2;
		this.#data[idx] = r;
		this.#data[idx + 1] = g;
		this.#data[idx + 2] = b;
		this.#data[idx + 3] = a;
	}

	getPixel(
		x: number,
		y: number,
	): { r: number; g: number; b: number; a: number } {
		const idx = (y * this.#width + x) << 2;
		return {
			r: this.#data[idx],
			g: this.#data[idx + 1],
			b: this.#data[idx + 2],
			a: this.#data[idx + 3],
		};
	}

	resize(width: number, height: number): void {
		this.#width = width;
		this.#height = height;
		this.#imageData = this.#createImageData(width, height);
		this.#data = this.#imageData.data;
		this.#u32 = new Uint32Array(
			this.#data.buffer,
			this.#data.byteOffset,
			this.#data.byteLength >> 2,
		);
		this.#depthBuffer.resize(width, height);
	}
}
