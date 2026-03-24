import { Texture } from "./Texture.ts";

/** Texture created from raw pixel data. */
export class DataTexture extends Texture {
	#imageData: ImageData | undefined = undefined;

	constructor(data: Uint8ClampedArray, width: number, height: number) {
		super(undefined);
		this.#imageData = new ImageData(
			data as Uint8ClampedArray<ArrayBuffer>,
			width,
			height,
		);
	}

	override get data(): ImageData | undefined {
		return this.#imageData;
	}

	override get width(): number {
		return this.#imageData ? this.#imageData.width : 0;
	}

	override get height(): number {
		return this.#imageData ? this.#imageData.height : 0;
	}

	override dispose(): void {
		this.#imageData = undefined;
		super.dispose();
	}
}
