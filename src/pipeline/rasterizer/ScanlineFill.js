import { MathUtils } from "../../math/MathUtils.js";

export class ScanlineFill {
	/**
	 * Rasterizes a triangle defined by three screen-space integer points.
	 * Calls callback for each covered pixel with barycentric coordinates.
	 * @param {number} x1
	 * @param {number} y1
	 * @param {number} x2
	 * @param {number} y2
	 * @param {number} x3
	 * @param {number} y3
	 * @param {number} width Framebuffer width
	 * @param {number} height Framebuffer height
	 * @param {(x: number, y: number, u: number, v: number, w: number) => void} callback
	 * @returns {void}
	 */
	fill(x1, y1, x2, y2, x3, y3, width, height, callback) {
		const [ax, ay, bx, by, cx, cy] = this.#sortByY(x1, y1, x2, y2, x3, y3);

		if (by === cy) {
			this.#fillFlatBottom(ax, ay, bx, by, cx, cy, width, height, callback);
		} else if (ay === by) {
			this.#fillFlatTop(ax, ay, bx, by, cx, cy, width, height, callback);
		} else {
			// Split at middle vertex y into flat-bottom + flat-top
			const t = (by - ay) / (cy - ay);
			const mx = ax + t * (cx - ax);
			const my = by;
			this.#fillFlatBottom(ax, ay, bx, by, mx, my, width, height, callback);
			this.#fillFlatTop(bx, by, mx, my, cx, cy, width, height, callback);
		}
	}

	/**
	 * Sorts three vertices by ascending Y.
	 * @param {number} x1
	 * @param {number} y1
	 * @param {number} x2
	 * @param {number} y2
	 * @param {number} x3
	 * @param {number} y3
	 * @returns {number[]} [ax,ay, bx,by, cx,cy] sorted top-to-bottom
	 */
	#sortByY(x1, y1, x2, y2, x3, y3) {
		let ax = x1;
		let ay = y1;
		let bx = x2;
		let by = y2;
		let cx = x3;
		let cy = y3;
		if (ay > by) [ax, ay, bx, by] = [bx, by, ax, ay];
		if (ay > cy) [ax, ay, cx, cy] = [cx, cy, ax, ay];
		if (by > cy) [bx, by, cx, cy] = [cx, cy, bx, by];
		return [ax, ay, bx, by, cx, cy];
	}

	/**
	 * Fills a flat-bottom triangle (top vertex, two bottom vertices).
	 * @param {number} topX
	 * @param {number} topY
	 * @param {number} botLeftX
	 * @param {number} botLeftY
	 * @param {number} botRightX
	 * @param {number} _botRightY
	 * @param {number} width
	 * @param {number} height
	 * @param {(x: number, y: number, u: number, v: number, w: number) => void} callback
	 * @returns {void}
	 */
	#fillFlatBottom(
		topX,
		topY,
		botLeftX,
		botLeftY,
		botRightX,
		_botRightY,
		width,
		height,
		callback,
	) {
		const dy = botLeftY - topY;
		if (dy === 0) return;
		const slopeL = (botLeftX - topX) / dy;
		const slopeR = (botRightX - topX) / dy;
		const startY = Math.ceil(topY);
		const endY = Math.ceil(botLeftY) - 1;

		for (let y = startY; y <= endY; y++) {
			if (y < 0 || y >= height) continue;
			const xL = topX + (y - topY) * slopeL;
			const xR = topX + (y - topY) * slopeR;
			this.#fillScanline(y, xL, xR, width, callback);
		}
	}

	/**
	 * Fills a flat-top triangle (two top vertices, one bottom vertex).
	 * @param {number} topLeftX
	 * @param {number} topLeftY
	 * @param {number} topRightX
	 * @param {number} _topRightY
	 * @param {number} botX
	 * @param {number} botY
	 * @param {number} width
	 * @param {number} height
	 * @param {(x: number, y: number, u: number, v: number, w: number) => void} callback
	 * @returns {void}
	 */
	#fillFlatTop(
		topLeftX,
		topLeftY,
		topRightX,
		_topRightY,
		botX,
		botY,
		width,
		height,
		callback,
	) {
		const dy = botY - topLeftY;
		if (dy === 0) return;
		const slopeL = (botX - topLeftX) / dy;
		const slopeR = (botX - topRightX) / dy;
		const startY = Math.ceil(topLeftY);
		const endY = Math.ceil(botY) - 1;

		for (let y = startY; y <= endY; y++) {
			if (y < 0 || y >= height) continue;
			const xL = topLeftX + (y - topLeftY) * slopeL;
			const xR = topRightX + (y - topLeftY) * slopeR;
			this.#fillScanline(y, xL, xR, width, callback);
		}
	}

	/**
	 * Fills a horizontal scanline from x1 to x2 at row y, clamped to [0, width-1].
	 * @param {number} y
	 * @param {number} x1
	 * @param {number} x2
	 * @param {number} width
	 * @param {(x: number, y: number, u: number, v: number, w: number) => void} callback
	 * @returns {void}
	 */
	#fillScanline(y, x1, x2, width, callback) {
		const startX = MathUtils.clamp(
			Math.ceil(MathUtils.fastMin(x1, x2)),
			0,
			width - 1,
		);
		const endX = MathUtils.clamp(
			MathUtils.fastTrunc(MathUtils.fastMax(x1, x2)),
			0,
			width - 1,
		);
		const spanW = endX - startX;
		for (let x = startX; x <= endX; x++) {
			const t = spanW > 0 ? (x - startX) / spanW : 0;
			callback(x, y, t, 0, 0);
		}
	}
}
