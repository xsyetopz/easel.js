import { EdgeWalker } from "./EdgeWalker.js";

export class WireframeRasterizer {
	#walker = new EdgeWalker();

	/**
	 * Rasterizes the three edges of a triangle using Bresenham line walking.
	 * @param {number} x1
	 * @param {number} y1
	 * @param {number} x2
	 * @param {number} y2
	 * @param {number} x3
	 * @param {number} y3
	 * @param {(x: number, y: number) => void} callback Called for each edge pixel
	 * @returns {void}
	 */
	rasterize(x1, y1, x2, y2, x3, y3, callback) {
		this.#walker.walk(x1, y1, x2, y2, callback);
		this.#walker.walk(x2, y2, x3, y3, callback);
		this.#walker.walk(x3, y3, x1, y1, callback);
	}
}
