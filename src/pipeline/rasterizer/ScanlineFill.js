import { MathUtils } from "../../math/MathUtils.js";

/** Fills a horizontal scanline span with shaded pixels. */
export class ScanlineFill {
	/**
	 * Rasterizes a triangle defined by three screen-space integer points.
	 * Calls callback for each covered pixel with barycentric coordinates
	 * relative to the original vertex order (u→v1, v→v2, w→v3).
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
		// Barycentric partial derivatives computed from the original (pre-sort) vertices.
		// denom is shared across all pixels in this triangle.
		const denom = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);

		// Degenerate triangle - no area to fill.
		if (denom === 0) return;

		const invDenom = 1 / denom;

		// Sort three vertices by ascending Y using a sorting network.
		let ax = x1;
		let ay = y1;
		let bx = x2;
		let by = y2;
		let cx = x3;
		let cy = y3;
		if (ay > by) {
			let t;
			t = ax;
			ax = bx;
			bx = t;
			t = ay;
			ay = by;
			by = t;
		}
		if (ay > cy) {
			let t;
			t = ax;
			ax = cx;
			cx = t;
			t = ay;
			ay = cy;
			cy = t;
		}
		if (by > cy) {
			let t;
			t = bx;
			bx = cx;
			cx = t;
			t = by;
			by = cy;
			cy = t;
		}

		if (by === cy) {
			this.#fillFlatBottom(
				ax,
				ay,
				bx,
				by,
				cx,
				cy,
				width,
				height,
				x1,
				y1,
				x2,
				y2,
				x3,
				y3,
				invDenom,
				callback,
			);
		} else if (ay === by) {
			this.#fillFlatTop(
				ax,
				ay,
				bx,
				by,
				cx,
				cy,
				width,
				height,
				x1,
				y1,
				x2,
				y2,
				x3,
				y3,
				invDenom,
				callback,
			);
		} else {
			// Split at middle-vertex Y into flat-bottom + flat-top.
			const t = (by - ay) / (cy - ay);
			const mx = ax + t * (cx - ax);
			const my = by;
			this.#fillFlatBottom(
				ax,
				ay,
				bx,
				by,
				mx,
				my,
				width,
				height,
				x1,
				y1,
				x2,
				y2,
				x3,
				y3,
				invDenom,
				callback,
			);
			this.#fillFlatTop(
				bx,
				by,
				mx,
				my,
				cx,
				cy,
				width,
				height,
				x1,
				y1,
				x2,
				y2,
				x3,
				y3,
				invDenom,
				callback,
			);
		}
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
	 * @param {number} ox1 Original x1
	 * @param {number} oy1 Original y1
	 * @param {number} ox2 Original x2
	 * @param {number} oy2 Original y2
	 * @param {number} ox3 Original x3
	 * @param {number} oy3 Original y3
	 * @param {number} invDenom Pre-computed 1/barycentric denominator
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
		ox1,
		oy1,
		ox2,
		oy2,
		ox3,
		oy3,
		invDenom,
		callback,
	) {
		const dy = botLeftY - topY;
		if (dy === 0) return;
		const slopeL = (botLeftX - topX) / dy;
		const slopeR = (botRightX - topX) / dy;
		const startY = Math.ceil(topY);
		const endY = Math.floor(botLeftY);

		for (let y = startY; y <= endY; y++) {
			if (y < 0 || y >= height) continue;
			const xL = topX + (y - topY) * slopeL;
			const xR = topX + (y - topY) * slopeR;
			this.#fillScanline(
				y,
				xL,
				xR,
				width,
				ox1,
				oy1,
				ox2,
				oy2,
				ox3,
				oy3,
				invDenom,
				callback,
			);
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
	 * @param {number} ox1 Original x1
	 * @param {number} oy1 Original y1
	 * @param {number} ox2 Original x2
	 * @param {number} oy2 Original y2
	 * @param {number} ox3 Original x3
	 * @param {number} oy3 Original y3
	 * @param {number} invDenom Pre-computed 1/barycentric denominator
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
		ox1,
		oy1,
		ox2,
		oy2,
		ox3,
		oy3,
		invDenom,
		callback,
	) {
		const dy = botY - topLeftY;
		if (dy === 0) return;
		const slopeL = (botX - topLeftX) / dy;
		const slopeR = (botX - topRightX) / dy;
		const startY = Math.ceil(topLeftY);
		const endY = Math.floor(botY);

		for (let y = startY; y <= endY; y++) {
			if (y < 0 || y >= height) continue;
			const xL = topLeftX + (y - topLeftY) * slopeL;
			const xR = topRightX + (y - topLeftY) * slopeR;
			this.#fillScanline(
				y,
				xL,
				xR,
				width,
				ox1,
				oy1,
				ox2,
				oy2,
				ox3,
				oy3,
				invDenom,
				callback,
			);
		}
	}

	/**
	 * Fills a horizontal scanline from xLeft to xRight at row y.
	 * Computes proper barycentric (u,v,w) relative to the original triangle vertices.
	 * @param {number} y
	 * @param {number} xLeft
	 * @param {number} xRight
	 * @param {number} width
	 * @param {number} ox1 Original x1
	 * @param {number} oy1 Original y1
	 * @param {number} ox2 Original x2
	 * @param {number} oy2 Original y2
	 * @param {number} ox3 Original x3
	 * @param {number} oy3 Original y3
	 * @param {number} invDenom Pre-computed 1/barycentric denominator
	 * @param {(x: number, y: number, u: number, v: number, w: number) => void} callback
	 * @returns {void}
	 */
	#fillScanline(
		y,
		xLeft,
		xRight,
		width,
		ox1,
		oy1,
		ox2,
		oy2,
		ox3,
		oy3,
		invDenom,
		callback,
	) {
		const startX = MathUtils.clamp(
			Math.ceil(MathUtils.fastMin(xLeft, xRight)),
			0,
			width - 1,
		);
		const endX = MathUtils.clamp(
			MathUtils.fastTrunc(MathUtils.fastMax(xLeft, xRight)),
			0,
			width - 1,
		);

		// Pre-compute y-dependent terms once per scanline.
		const dy3 = y - oy3;
		const uNumerBase = (ox3 - ox2) * dy3;
		const vNumerBase = (ox1 - ox3) * dy3;
		const uDy = oy2 - oy3;
		const vDy = oy3 - oy1;

		for (let x = startX; x <= endX; x++) {
			const dx3 = x - ox3;
			const u = (uDy * dx3 + uNumerBase) * invDenom;
			const v = (vDy * dx3 + vNumerBase) * invDenom;
			const w = 1 - u - v;
			callback(x, y, u, v, w);
		}
	}
}
