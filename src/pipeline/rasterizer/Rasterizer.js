import { PointRasterizer } from "./PointRasterizer.js";
import { ScanlineFill } from "./ScanlineFill.js";
import { WireframeRasterizer } from "./WireframeRasterizer.js";

export class Rasterizer {
	#scanlineFill = new ScanlineFill();
	#wireframe = new WireframeRasterizer();
	#point = new PointRasterizer();

	/**
	 * Rasterizes a draw call to the framebuffer by dispatching to the appropriate
	 * sub-rasterizer based on the material mode.
	 * @param {{ triangles: Array<{ screenVerts: Array<{ x: number, y: number }> }>, material: { wireframe?: boolean, points?: boolean, pointRadius?: number } }} drawCall
	 * @param {{ width: number, height: number }} framebuffer
	 * @param {unknown} _colorTable
	 * @param {(x: number, y: number, ...args: unknown[]) => void} pixelWriter
	 * @returns {void}
	 */
	rasterize(drawCall, framebuffer, _colorTable, pixelWriter) {
		const { width, height } = framebuffer;
		const { wireframe, points, pointRadius = 2 } = drawCall.material;

		for (const tri of drawCall.triangles) {
			const [a, b, c] = tri.screenVerts;
			const x1 = a.x | 0;
			const y1 = a.y | 0;
			const x2 = b.x | 0;
			const y2 = b.y | 0;
			const x3 = c.x | 0;
			const y3 = c.y | 0;

			if (wireframe) {
				this.#wireframe.rasterize(x1, y1, x2, y2, x3, y3, pixelWriter);
			} else if (points) {
				this.#point.rasterize(x1, y1, pointRadius, width, height, pixelWriter);
				this.#point.rasterize(x2, y2, pointRadius, width, height, pixelWriter);
				this.#point.rasterize(x3, y3, pointRadius, width, height, pixelWriter);
			} else {
				this.#scanlineFill.fill(
					x1,
					y1,
					x2,
					y2,
					x3,
					y3,
					width,
					height,
					pixelWriter,
				);
			}
		}
	}
}
