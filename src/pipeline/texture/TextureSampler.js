import { TextureClamp } from "./TextureClamp.js";

/** Nearest-neighbor texture sampler from pixel data. */
export class TextureSampler {
	#clamp = new TextureClamp();

	/**
	 * Samples a texture at UV coordinates using nearest-neighbour lookup.
	 * @param {{ data: Uint8ClampedArray, width: number, height: number }} texture
	 * @param {number} u U coordinate in [0, 1]
	 * @param {number} v V coordinate in [0, 1]
	 * @returns {{ r: number, g: number, b: number, a: number }}
	 */
	sample(texture, u, v) {
		const { x, y } = this.#clamp.clamp(u, v, texture.width, texture.height);
		const idx = (y * texture.width + x) * 4;
		return {
			r: texture.data[idx],
			g: texture.data[idx + 1],
			b: texture.data[idx + 2],
			a: texture.data[idx + 3],
		};
	}
}
