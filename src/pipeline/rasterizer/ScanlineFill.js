import { MathUtils } from "../../math/MathUtils.ts";

/** Fills a horizontal scanline span with shaded pixels. */
export class ScanlineFill {
	/**
	 * Rasterizes a triangle defined by three screen-space integer points.
	 * Calls callback once per scanline with barycentric start values and
	 * per-pixel deltas, relative to the original vertex order (u→v1, v→v2).
	 * @param {number} x1
	 * @param {number} y1
	 * @param {number} x2
	 * @param {number} y2
	 * @param {number} x3
	 * @param {number} y3
	 * @param {number} width Framebuffer width
	 * @param {number} height Framebuffer height
	 * @param {(y: number, xStart: number, xEnd: number, uStart: number, vStart: number, duDx: number, dvDx: number) => void} callback
	 * @returns {void}
	 */
	fill(x1, y1, x2, y2, x3, y3, width, height, callback) {
		// Barycentric partial derivatives computed from the original (pre-sort) vertices.
		const denom = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);

		// Degenerate triangle - no area to fill.
		if (denom === 0) return;

		const invDenom = 1 / denom;

		// Per-triangle barycentric X-deltas (constant across all scanlines).
		const duDx = (y2 - y3) * invDenom;
		const dvDx = (y3 - y1) * invDenom;

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
				duDx,
				dvDx,
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
				duDx,
				dvDx,
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
				duDx,
				dvDx,
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
				duDx,
				dvDx,
				callback,
			);
		}
	}

	/**
	 * @param {number} topX
	 * @param {number} topY
	 * @param {number} botLeftX
	 * @param {number} botLeftY
	 * @param {number} botRightX
	 * @param {number} _botRightY
	 * @param {number} width
	 * @param {number} height
	 * @param {number} ox1
	 * @param {number} oy1
	 * @param {number} ox2
	 * @param {number} oy2
	 * @param {number} ox3
	 * @param {number} oy3
	 * @param {number} invDenom
	 * @param {number} duDx
	 * @param {number} dvDx
	 * @param {(y: number, xStart: number, xEnd: number, uStart: number, vStart: number, duDx: number, dvDx: number) => void} callback
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
		duDx,
		dvDx,
		callback,
	) {
		const dy = botLeftY - topY;
		if (dy === 0) return;
		const slopeL = (botLeftX - topX) / dy;
		const slopeR = (botRightX - topX) / dy;
		const clampedStart = Math.ceil(topY) < 0 ? 0 : Math.ceil(topY);
		const clampedEnd =
			Math.floor(botLeftY) >= height ? height - 1 : Math.floor(botLeftY);
		if (clampedStart > clampedEnd) return;

		// Hoisted barycentric coefficients (constant per triangle).
		const uDy = (ox3 - ox2) * invDenom;
		const uDx = (oy2 - oy3) * invDenom;
		const vDy = (ox1 - ox3) * invDenom;
		const vDx = (oy3 - oy1) * invDenom;

		let xL = topX + (clampedStart - topY) * slopeL;
		let xR = topX + (clampedStart - topY) * slopeR;

		for (
			let y = clampedStart;
			y <= clampedEnd;
			y++, xL += slopeL, xR += slopeR
		) {
			this.#fillScanline(
				y,
				xL,
				xR,
				width,
				ox3,
				oy3,
				uDy,
				uDx,
				vDy,
				vDx,
				duDx,
				dvDx,
				callback,
			);
		}
	}

	/**
	 * @param {number} topLeftX
	 * @param {number} topLeftY
	 * @param {number} topRightX
	 * @param {number} _topRightY
	 * @param {number} botX
	 * @param {number} botY
	 * @param {number} width
	 * @param {number} height
	 * @param {number} ox1
	 * @param {number} oy1
	 * @param {number} ox2
	 * @param {number} oy2
	 * @param {number} ox3
	 * @param {number} oy3
	 * @param {number} invDenom
	 * @param {number} duDx
	 * @param {number} dvDx
	 * @param {(y: number, xStart: number, xEnd: number, uStart: number, vStart: number, duDx: number, dvDx: number) => void} callback
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
		duDx,
		dvDx,
		callback,
	) {
		const dy = botY - topLeftY;
		if (dy === 0) return;
		const slopeL = (botX - topLeftX) / dy;
		const slopeR = (botX - topRightX) / dy;
		const clampedStart = Math.ceil(topLeftY) < 0 ? 0 : Math.ceil(topLeftY);
		const clampedEnd =
			Math.floor(botY) >= height ? height - 1 : Math.floor(botY);
		if (clampedStart > clampedEnd) return;

		// Hoisted barycentric coefficients (constant per triangle).
		const uDy = (ox3 - ox2) * invDenom;
		const uDx = (oy2 - oy3) * invDenom;
		const vDy = (ox1 - ox3) * invDenom;
		const vDx = (oy3 - oy1) * invDenom;

		let xL = topLeftX + (clampedStart - topLeftY) * slopeL;
		let xR = topRightX + (clampedStart - topLeftY) * slopeR;

		for (
			let y = clampedStart;
			y <= clampedEnd;
			y++, xL += slopeL, xR += slopeR
		) {
			this.#fillScanline(
				y,
				xL,
				xR,
				width,
				ox3,
				oy3,
				uDy,
				uDx,
				vDy,
				vDx,
				duDx,
				dvDx,
				callback,
			);
		}
	}

	/**
	 * Computes barycentric start values for the scanline and calls callback once.
	 * @param {number} y
	 * @param {number} xLeft
	 * @param {number} xRight
	 * @param {number} width
	 * @param {number} ox3
	 * @param {number} oy3
	 * @param {number} uDy Pre-hoisted (ox3-ox2)*invDenom
	 * @param {number} uDx Pre-hoisted (oy2-oy3)*invDenom
	 * @param {number} vDy Pre-hoisted (ox1-ox3)*invDenom
	 * @param {number} vDx Pre-hoisted (oy3-oy1)*invDenom
	 * @param {number} duDx
	 * @param {number} dvDx
	 * @param {(y: number, xStart: number, xEnd: number, uStart: number, vStart: number, duDx: number, dvDx: number) => void} callback
	 * @returns {void}
	 */
	#fillScanline(
		y,
		xLeft,
		xRight,
		width,
		ox3,
		oy3,
		uDy,
		uDx,
		vDy,
		vDx,
		duDx,
		dvDx,
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
		if (startX > endX) return;

		// Barycentric start values at (startX, y) using pre-hoisted coefficients.
		const dy3 = y - oy3;
		const dx3Start = startX - ox3;
		const uStart = uDx * dx3Start + uDy * dy3;
		const vStart = vDx * dx3Start + vDy * dy3;

		callback(y, startX, endX, uStart, vStart, duDx, dvDx);
	}
}
