import { PointRasterizer } from "./PointRasterizer.js";
import { ScanlineFill } from "./ScanlineFill.js";
import { WireframeRasterizer } from "./WireframeRasterizer.js";

/**
 * 4×4 Bayer ordered dither thresholds, normalized to [0, 1).
 * Indexed as BAYER4[(y & 3) << 2 | (x & 3)].
 * @type {Float64Array}
 */
const BAYER4 = Float64Array.of(
	0 / 16,
	8 / 16,
	2 / 16,
	10 / 16,
	12 / 16,
	4 / 16,
	14 / 16,
	6 / 16,
	3 / 16,
	11 / 16,
	1 / 16,
	9 / 16,
	15 / 16,
	7 / 16,
	13 / 16,
	5 / 16,
);

/** Scanline triangle rasterizer with texture sampling and shading. */
export class Rasterizer {
	#scanlineFill = new ScanlineFill();
	#wireframe = new WireframeRasterizer();
	#point = new PointRasterizer();

	// Per-triangle state fields (set once per triangle, read in scanline handlers).
	/** @type {*['depthBuffer']} */
	#depthBuf = /** @type {*} */ (undefined);
	/** @type {Uint16Array} */
	#dbData = /** @type {*} */ (undefined);
	/** @type {number} */
	#dbWidth = 0;
	/** @type {number} */
	#ndcZ0 = 0;
	/** @type {number} */
	#ndcZ1 = 0;
	/** @type {number} */
	#ndcZ2 = 0;
	/** @type {number} */
	#flatR = 0;
	/** @type {number} */
	#flatG = 0;
	/** @type {number} */
	#flatB = 0;
	/** @type {Float32Array | undefined} */
	#gouraudData;
	/** @type {number} */
	#gouraudBase = 0;
	/** @type {number} */
	#baseR = 255;
	/** @type {number} */
	#baseG = 255;
	/** @type {number} */
	#baseB = 255;
	/** @type {Uint8ClampedArray | undefined} */
	#texData;
	/** @type {number} */
	#texW = 0;
	/** @type {number} */
	#texWm1 = 0;
	/** @type {number} */
	#texHm1 = 0;
	/** @type {number} */
	#uv0u = 0;
	/** @type {number} */
	#uv0v = 0;
	/** @type {number} */
	#uv1u = 0;
	/** @type {number} */
	#uv1v = 0;
	/** @type {number} */
	#uv2u = 0;
	/** @type {number} */
	#uv2v = 0;
	/** @type {Uint32Array} */
	#fbU32 = /** @type {*} */ (undefined);

	// Fog state
	/** @type {boolean} */
	#hasFog = false;
	/** @type {number} */
	#fogR = 0;
	/** @type {number} */
	#fogG = 0;
	/** @type {number} */
	#fogB = 0;
	/** @type {number} */
	#fogF0 = 0;
	/** @type {number} */
	#fogF1 = 0;
	/** @type {number} */
	#fogF2 = 0;

	// Brightness-copy texture levels
	/** @type {Uint8ClampedArray[] | undefined} */
	#brightnessLevels;

	// FlatTex optimization: pre-selected brightness level for constant litFactor
	/** @type {Uint8ClampedArray | undefined} */
	#selectedBrightTex;
	/** @type {number} */
	#flatLitFactor = 1;

	// UV wrapping mode (0 = ClampToEdge, 1 = Repeat)
	/** @type {number} */
	#wrapS = 0;
	/** @type {number} */
	#wrapT = 0;

	// Bound callbacks - created once, reused for every triangle.
	#cbFlat = this.#fillFlat.bind(this);
	#cbGouraud = this.#fillGouraud.bind(this);
	#cbFlatTex = this.#fillFlatTex.bind(this);
	#cbGouraudTex = this.#fillGouraudTex.bind(this);
	#cbUnlitTex = this.#fillUnlitTex.bind(this);

	/**
	 * @param {number} y
	 * @param {number} xStart
	 * @param {number} xEnd
	 * @param {number} u
	 * @param {number} v
	 * @param {number} duDx
	 * @param {number} dvDx
	 */
	#fillFlat(y, xStart, xEnd, u, v, duDx, dvDx) {
		const w = 1 - u - v;

		const dNdcZ =
			duDx * (this.#ndcZ0 - this.#ndcZ2) + dvDx * (this.#ndcZ1 - this.#ndcZ2);

		let ndcZ = u * this.#ndcZ0 + v * this.#ndcZ1 + w * this.#ndcZ2;

		const dbData = this.#dbData;
		const dbW = this.#dbWidth;
		const hasFog = this.#hasFog;
		const flatR = this.#flatR;
		const flatG = this.#flatG;
		const flatB = this.#flatB;
		const fbU32 = this.#fbU32;
		let dIdx = y * dbW + xStart;

		let dFogF = 0;
		let fogF = 0;
		let fogR = 0;
		let fogG = 0;
		let fogB = 0;
		if (hasFog) {
			dFogF =
				duDx * (this.#fogF0 - this.#fogF2) + dvDx * (this.#fogF1 - this.#fogF2);
			fogF = u * this.#fogF0 + v * this.#fogF1 + w * this.#fogF2;
			fogR = this.#fogR;
			fogG = this.#fogG;
			fogB = this.#fogB;
		}

		for (let x = xStart; x <= xEnd; x++, dIdx++, ndcZ += dNdcZ) {
			const depth16 = ((ndcZ + 1) * 32767.5 + 0.5) | 0;
			if (depth16 > dbData[dIdx]) continue;
			dbData[dIdx] = depth16;

			let r = flatR;
			let g = flatG;
			let b = flatB;
			if (hasFog) {
				const d = BAYER4[((y & 3) << 2) | (x & 3)];
				const f = fogF < 0 ? 0 : fogF > 1 ? 1 : fogF;
				r = (r + (fogR - r) * f + d) | 0;
				g = (g + (fogG - g) * f + d) | 0;
				b = (b + (fogB - b) * f + d) | 0;
			}
			fbU32[dIdx] = 0xff000000 | (b << 16) | (g << 8) | r;

			if (hasFog) fogF += dFogF;
		}
	}

	/**
	 * @param {number} y
	 * @param {number} xStart
	 * @param {number} xEnd
	 * @param {number} u
	 * @param {number} v
	 * @param {number} duDx
	 * @param {number} dvDx
	 */
	#fillGouraud(y, xStart, xEnd, u, v, duDx, dvDx) {
		const w = 1 - u - v;

		const dNdcZ =
			duDx * (this.#ndcZ0 - this.#ndcZ2) + dvDx * (this.#ndcZ1 - this.#ndcZ2);

		const gd = /** @type {Float32Array} */ (this.#gouraudData);
		const b0 = this.#gouraudBase;
		const dLR = duDx * (gd[b0] - gd[b0 + 6]) + dvDx * (gd[b0 + 3] - gd[b0 + 6]);
		const dLG =
			duDx * (gd[b0 + 1] - gd[b0 + 7]) + dvDx * (gd[b0 + 4] - gd[b0 + 7]);
		const dLB =
			duDx * (gd[b0 + 2] - gd[b0 + 8]) + dvDx * (gd[b0 + 5] - gd[b0 + 8]);

		let ndcZ = u * this.#ndcZ0 + v * this.#ndcZ1 + w * this.#ndcZ2;
		let lr = u * gd[b0] + v * gd[b0 + 3] + w * gd[b0 + 6];
		let lg = u * gd[b0 + 1] + v * gd[b0 + 4] + w * gd[b0 + 7];
		let lb = u * gd[b0 + 2] + v * gd[b0 + 5] + w * gd[b0 + 8];

		const dbData = this.#dbData;
		const dbW = this.#dbWidth;
		const baseR = this.#baseR;
		const baseG = this.#baseG;
		const baseB = this.#baseB;
		const hasFog = this.#hasFog;
		const fbU32 = this.#fbU32;
		let dIdx = y * dbW + xStart;

		let dFogF = 0;
		let fogF = 0;
		let fogR = 0;
		let fogG = 0;
		let fogB = 0;
		if (hasFog) {
			dFogF =
				duDx * (this.#fogF0 - this.#fogF2) + dvDx * (this.#fogF1 - this.#fogF2);
			fogF = u * this.#fogF0 + v * this.#fogF1 + w * this.#fogF2;
			fogR = this.#fogR;
			fogG = this.#fogG;
			fogB = this.#fogB;
		}

		for (
			let x = xStart;
			x <= xEnd;
			x++, dIdx++, ndcZ += dNdcZ, lr += dLR, lg += dLG, lb += dLB
		) {
			const depth16 = ((ndcZ + 1) * 32767.5 + 0.5) | 0;
			if (depth16 > dbData[dIdx]) continue;
			dbData[dIdx] = depth16;

			const d = BAYER4[((y & 3) << 2) | (x & 3)];
			let r = (baseR * (lr < 0 ? 0 : lr > 1 ? 1 : lr) + d) | 0;
			let g = (baseG * (lg < 0 ? 0 : lg > 1 ? 1 : lg) + d) | 0;
			let bl = (baseB * (lb < 0 ? 0 : lb > 1 ? 1 : lb) + d) | 0;
			if (hasFog) {
				const f = fogF < 0 ? 0 : fogF > 1 ? 1 : fogF;
				r = (r + (fogR - r) * f + d) | 0;
				g = (g + (fogG - g) * f + d) | 0;
				bl = (bl + (fogB - bl) * f + d) | 0;
			}
			fbU32[dIdx] = 0xff000000 | (bl << 16) | (g << 8) | r;

			if (hasFog) fogF += dFogF;
		}
	}

	/**
	 * @param {number} y
	 * @param {number} xStart
	 * @param {number} xEnd
	 * @param {number} u
	 * @param {number} v
	 * @param {number} duDx
	 * @param {number} dvDx
	 */
	#fillFlatTex(y, xStart, xEnd, u, v, duDx, dvDx) {
		const w = 1 - u - v;

		const dNdcZ =
			duDx * (this.#ndcZ0 - this.#ndcZ2) + dvDx * (this.#ndcZ1 - this.#ndcZ2);
		const dTexU =
			duDx * (this.#uv0u - this.#uv2u) + dvDx * (this.#uv1u - this.#uv2u);
		const dTexV =
			duDx * (this.#uv0v - this.#uv2v) + dvDx * (this.#uv1v - this.#uv2v);

		let ndcZ = u * this.#ndcZ0 + v * this.#ndcZ1 + w * this.#ndcZ2;
		let texU = u * this.#uv0u + v * this.#uv1u + w * this.#uv2u;
		let texV = u * this.#uv0v + v * this.#uv1v + w * this.#uv2v;

		const dbData = this.#dbData;
		const dbW = this.#dbWidth;
		const texWm1 = this.#texWm1;
		const texHm1 = this.#texHm1;
		const texW = this.#texW;
		const hasFog = this.#hasFog;
		const fbU32 = this.#fbU32;
		let dIdx = y * dbW + xStart;

		// FlatTex: litFactor is constant per triangle — use pre-selected brightness level
		const brightTex = this.#selectedBrightTex;
		const litFactor = this.#flatLitFactor;
		const texD = /** @type {Uint8ClampedArray} */ (this.#texData);
		const wS = this.#wrapS;
		const wT = this.#wrapT;

		let dFogF = 0;
		let fogF = 0;
		let fogR = 0;
		let fogG = 0;
		let fogB = 0;
		if (hasFog) {
			dFogF =
				duDx * (this.#fogF0 - this.#fogF2) + dvDx * (this.#fogF1 - this.#fogF2);
			fogF = u * this.#fogF0 + v * this.#fogF1 + w * this.#fogF2;
			fogR = this.#fogR;
			fogG = this.#fogG;
			fogB = this.#fogB;
		}

		for (
			let x = xStart;
			x <= xEnd;
			x++, dIdx++, ndcZ += dNdcZ, texU += dTexU, texV += dTexV
		) {
			const depth16 = ((ndcZ + 1) * 32767.5 + 0.5) | 0;
			if (depth16 > dbData[dIdx]) continue;
			dbData[dIdx] = depth16;

			const cu = wS
				? texU - Math.floor(texU)
				: texU < 0
					? 0
					: texU > 1
						? 1
						: texU;
			const cv = wT
				? texV - Math.floor(texV)
				: texV < 0
					? 0
					: texV > 1
						? 1
						: texV;
			const tx = (cu * texWm1 + 0.5) | 0;
			const ty = (cv * texHm1 + 0.5) | 0;
			const tidx = (ty * texW + tx) << 2;

			const d = BAYER4[((y & 3) << 2) | (x & 3)];
			let r;
			let g;
			let b;
			if (brightTex) {
				r = brightTex[tidx];
				g = brightTex[tidx + 1];
				b = brightTex[tidx + 2];
			} else {
				r = (texD[tidx] * litFactor + d) | 0;
				g = (texD[tidx + 1] * litFactor + d) | 0;
				b = (texD[tidx + 2] * litFactor + d) | 0;
			}

			if (hasFog) {
				const f = fogF < 0 ? 0 : fogF > 1 ? 1 : fogF;
				r = (r + (fogR - r) * f + d) | 0;
				g = (g + (fogG - g) * f + d) | 0;
				b = (b + (fogB - b) * f + d) | 0;
			}
			fbU32[dIdx] = 0xff000000 | (b << 16) | (g << 8) | r;

			if (hasFog) fogF += dFogF;
		}
	}

	/**
	 * @param {number} y
	 * @param {number} xStart
	 * @param {number} xEnd
	 * @param {number} u
	 * @param {number} v
	 * @param {number} duDx
	 * @param {number} dvDx
	 */
	#fillGouraudTex(y, xStart, xEnd, u, v, duDx, dvDx) {
		const w = 1 - u - v;

		const dNdcZ =
			duDx * (this.#ndcZ0 - this.#ndcZ2) + dvDx * (this.#ndcZ1 - this.#ndcZ2);
		const dTexU =
			duDx * (this.#uv0u - this.#uv2u) + dvDx * (this.#uv1u - this.#uv2u);
		const dTexV =
			duDx * (this.#uv0v - this.#uv2v) + dvDx * (this.#uv1v - this.#uv2v);

		const gd = /** @type {Float32Array} */ (this.#gouraudData);
		const b0 = this.#gouraudBase;
		const dLR = duDx * (gd[b0] - gd[b0 + 6]) + dvDx * (gd[b0 + 3] - gd[b0 + 6]);
		const dLG =
			duDx * (gd[b0 + 1] - gd[b0 + 7]) + dvDx * (gd[b0 + 4] - gd[b0 + 7]);
		const dLB =
			duDx * (gd[b0 + 2] - gd[b0 + 8]) + dvDx * (gd[b0 + 5] - gd[b0 + 8]);

		let ndcZ = u * this.#ndcZ0 + v * this.#ndcZ1 + w * this.#ndcZ2;
		let texU = u * this.#uv0u + v * this.#uv1u + w * this.#uv2u;
		let texV = u * this.#uv0v + v * this.#uv1v + w * this.#uv2v;
		let lr = u * gd[b0] + v * gd[b0 + 3] + w * gd[b0 + 6];
		let lg = u * gd[b0 + 1] + v * gd[b0 + 4] + w * gd[b0 + 7];
		let lb = u * gd[b0 + 2] + v * gd[b0 + 5] + w * gd[b0 + 8];

		const dbData = this.#dbData;
		const dbW = this.#dbWidth;
		const texD = /** @type {Uint8ClampedArray} */ (this.#texData);
		const texWm1 = this.#texWm1;
		const texHm1 = this.#texHm1;
		const texW = this.#texW;
		const baseR = this.#baseR;
		const baseG = this.#baseG;
		const baseB = this.#baseB;
		const hasFog = this.#hasFog;
		const fbU32 = this.#fbU32;
		let dIdx = y * dbW + xStart;

		const bl = this.#brightnessLevels;
		const hasBL = bl !== undefined;
		const blCount = hasBL ? /** @type {Uint8ClampedArray[]} */ (bl).length : 0;
		const wS = this.#wrapS;
		const wT = this.#wrapT;

		let dFogF = 0;
		let fogF = 0;
		let fogR = 0;
		let fogG = 0;
		let fogB = 0;
		if (hasFog) {
			dFogF =
				duDx * (this.#fogF0 - this.#fogF2) + dvDx * (this.#fogF1 - this.#fogF2);
			fogF = u * this.#fogF0 + v * this.#fogF1 + w * this.#fogF2;
			fogR = this.#fogR;
			fogG = this.#fogG;
			fogB = this.#fogB;
		}

		for (
			let x = xStart;
			x <= xEnd;
			x++,
				dIdx++,
				ndcZ += dNdcZ,
				texU += dTexU,
				texV += dTexV,
				lr += dLR,
				lg += dLG,
				lb += dLB
		) {
			const depth16 = ((ndcZ + 1) * 32767.5 + 0.5) | 0;
			if (depth16 > dbData[dIdx]) continue;
			dbData[dIdx] = depth16;

			const d = BAYER4[((y & 3) << 2) | (x & 3)];
			const cr = (baseR * (lr < 0 ? 0 : lr > 1 ? 1 : lr) + d) | 0;
			const cg = (baseG * (lg < 0 ? 0 : lg > 1 ? 1 : lg) + d) | 0;
			const cb = (baseB * (lb < 0 ? 0 : lb > 1 ? 1 : lb) + d) | 0;

			const cu = wS
				? texU - Math.floor(texU)
				: texU < 0
					? 0
					: texU > 1
						? 1
						: texU;
			const cv = wT
				? texV - Math.floor(texV)
				: texV < 0
					? 0
					: texV > 1
						? 1
						: texV;
			const tx = (cu * texWm1 + 0.5) | 0;
			const ty = (cv * texHm1 + 0.5) | 0;
			const tidx = (ty * texW + tx) << 2;

			let r;
			let g;
			let b;
			if (hasBL) {
				const litFactor = (cr + cg + cb) / (3 * 255);
				const level = (litFactor * blCount + d) | 0;
				const li = level < 0 ? 0 : level >= blCount ? blCount - 1 : level;
				const bd = /** @type {Uint8ClampedArray[]} */ (bl)[li];
				r = bd[tidx];
				g = bd[tidx + 1];
				b = bd[tidx + 2];
			} else {
				const litFactor = (cr + cg + cb) / (3 * 255);
				r = (texD[tidx] * litFactor + d) | 0;
				g = (texD[tidx + 1] * litFactor + d) | 0;
				b = (texD[tidx + 2] * litFactor + d) | 0;
			}

			if (hasFog) {
				const f = fogF < 0 ? 0 : fogF > 1 ? 1 : fogF;
				r = (r + (fogR - r) * f + d) | 0;
				g = (g + (fogG - g) * f + d) | 0;
				b = (b + (fogB - b) * f + d) | 0;
			}
			fbU32[dIdx] = 0xff000000 | (b << 16) | (g << 8) | r;

			if (hasFog) fogF += dFogF;
		}
	}

	/**
	 * @param {number} y
	 * @param {number} xStart
	 * @param {number} xEnd
	 * @param {number} u
	 * @param {number} v
	 * @param {number} duDx
	 * @param {number} dvDx
	 */
	#fillUnlitTex(y, xStart, xEnd, u, v, duDx, dvDx) {
		const w = 1 - u - v;

		const dNdcZ =
			duDx * (this.#ndcZ0 - this.#ndcZ2) + dvDx * (this.#ndcZ1 - this.#ndcZ2);
		const dTexU =
			duDx * (this.#uv0u - this.#uv2u) + dvDx * (this.#uv1u - this.#uv2u);
		const dTexV =
			duDx * (this.#uv0v - this.#uv2v) + dvDx * (this.#uv1v - this.#uv2v);

		let ndcZ = u * this.#ndcZ0 + v * this.#ndcZ1 + w * this.#ndcZ2;
		let texU = u * this.#uv0u + v * this.#uv1u + w * this.#uv2u;
		let texV = u * this.#uv0v + v * this.#uv1v + w * this.#uv2v;

		const dbData = this.#dbData;
		const dbW = this.#dbWidth;
		const texD = /** @type {Uint8ClampedArray} */ (this.#texData);
		const texWm1 = this.#texWm1;
		const texHm1 = this.#texHm1;
		const texW = this.#texW;
		const baseR = this.#baseR;
		const baseG = this.#baseG;
		const baseB = this.#baseB;
		const hasFog = this.#hasFog;
		const fbU32 = this.#fbU32;
		let dIdx = y * dbW + xStart;
		const wS = this.#wrapS;
		const wT = this.#wrapT;

		let dFogF = 0;
		let fogF = 0;
		let fogR = 0;
		let fogG = 0;
		let fogB = 0;
		if (hasFog) {
			dFogF =
				duDx * (this.#fogF0 - this.#fogF2) + dvDx * (this.#fogF1 - this.#fogF2);
			fogF = u * this.#fogF0 + v * this.#fogF1 + w * this.#fogF2;
			fogR = this.#fogR;
			fogG = this.#fogG;
			fogB = this.#fogB;
		}

		for (
			let x = xStart;
			x <= xEnd;
			x++, dIdx++, ndcZ += dNdcZ, texU += dTexU, texV += dTexV
		) {
			const depth16 = ((ndcZ + 1) * 32767.5 + 0.5) | 0;
			if (depth16 > dbData[dIdx]) continue;
			dbData[dIdx] = depth16;

			const cu = wS
				? texU - Math.floor(texU)
				: texU < 0
					? 0
					: texU > 1
						? 1
						: texU;
			const cv = wT
				? texV - Math.floor(texV)
				: texV < 0
					? 0
					: texV > 1
						? 1
						: texV;
			const tx = (cu * texWm1 + 0.5) | 0;
			const ty = (cv * texHm1 + 0.5) | 0;
			const tidx = (ty * texW + tx) << 2;

			const d = BAYER4[((y & 3) << 2) | (x & 3)];
			let r = ((texD[tidx] * baseR) / 255 + d) | 0;
			let g = ((texD[tidx + 1] * baseG) / 255 + d) | 0;
			let b = ((texD[tidx + 2] * baseB) / 255 + d) | 0;

			if (hasFog) {
				const f = fogF < 0 ? 0 : fogF > 1 ? 1 : fogF;
				r = (r + (fogR - r) * f + d) | 0;
				g = (g + (fogG - g) * f + d) | 0;
				b = (b + (fogB - b) * f + d) | 0;
			}
			fbU32[dIdx] = 0xff000000 | (b << 16) | (g << 8) | r;

			if (hasFog) fogF += dFogF;
		}
	}

	/**
	 * Rasterizes a draw call to the framebuffer by dispatching to the appropriate
	 * sub-rasterizer based on the material mode.
	 * @param {{
	 *   triangles: *,
	 *   material: {
	 *     wireframe?: boolean,
	 *     points?: boolean,
	 *     pointRadius?: number,
	 *     color?: { r: number, g: number, b: number },
	 *     map?: { data: { data: Uint8ClampedArray, width: number, height: number }, brightnessLevels?: Uint8ClampedArray[], wrapS?: number, wrapT?: number }
	 *   },
	 *   shadedColorData?: Float32Array,
	 *   shadedColorStride?: number
	 * }} drawCall
	 * @param {*} framebuffer
	 * @param {unknown} _colorTable Ignored - internal ColorTable is used
	 * @param {{ r: number, g: number, b: number }|undefined} [fogColor]
	 * @returns {void}
	 */
	rasterize(drawCall, framebuffer, _colorTable, fogColor) {
		this.#hasFog = !!fogColor;
		if (fogColor) {
			this.#fogR = Math.round(fogColor.r * 255);
			this.#fogG = Math.round(fogColor.g * 255);
			this.#fogB = Math.round(fogColor.b * 255);
		}
		const { width, height } = framebuffer;
		const { wireframe, points, pointRadius = 2 } = drawCall.material;

		const matColor = drawCall.material.color;
		const baseR = matColor ? Math.round(matColor.r * 255) : 255;
		const baseG = matColor ? Math.round(matColor.g * 255) : 255;
		const baseB = matColor ? Math.round(matColor.b * 255) : 255;

		const texture = drawCall.material.map?.data ?? undefined;

		this.#baseR = baseR;
		this.#baseG = baseG;
		this.#baseB = baseB;
		this.#depthBuf = framebuffer.depthBuffer;
		this.#dbData = this.#depthBuf.data;
		this.#dbWidth = this.#depthBuf.width;
		this.#fbU32 = framebuffer.u32;

		if (texture) {
			this.#texData = texture.data;
			this.#texW = texture.width;
			this.#texWm1 = texture.width - 1;
			this.#texHm1 = texture.height - 1;
		}

		this.#brightnessLevels = drawCall.material.map?.brightnessLevels;
		this.#wrapS = drawCall.material.map?.wrapS ?? 0;
		this.#wrapT = drawCall.material.map?.wrapT ?? 0;

		const shadedColorData = drawCall.shadedColorData;
		const shadedColorStride = drawCall.shadedColorStride ?? 0;

		const tb = drawCall.triangles;
		if (!tb) return;
		for (let i = 0; i < tb.length; i++) {
			const physIdx = tb.sortOrder[i];
			this.#rasterizeTriangleFromBuffer(
				tb,
				physIdx,
				shadedColorData,
				shadedColorStride,
				i,
				baseR,
				baseG,
				baseB,
				texture,
				wireframe,
				points,
				pointRadius,
				width,
				height,
			);
		}
	}

	/**
	 * @param {*} tb
	 * @param {number} physIdx Physical triangle index in typed arrays
	 * @param {Float32Array | undefined} shadedColorData Packed shading data for the whole draw call
	 * @param {number} shadedColorStride 3 for flat, 9 for gouraud, 0 when absent
	 * @param {number} iterIdx Sort-iteration index (i) for indexing into shadedColorData
	 * @param {number} baseR
	 * @param {number} baseG
	 * @param {number} baseB
	 * @param {{ data: Uint8ClampedArray, width: number, height: number } | undefined} texture
	 * @param {boolean | undefined} wireframe
	 * @param {boolean | undefined} points
	 * @param {number} pointRadius
	 * @param {number} width
	 * @param {number} height
	 */
	#rasterizeTriangleFromBuffer(
		tb,
		physIdx,
		shadedColorData,
		shadedColorStride,
		iterIdx,
		baseR,
		baseG,
		baseB,
		texture,
		wireframe,
		points,
		pointRadius,
		width,
		height,
	) {
		const v = physIdx * 3;
		const x1 = tb.screenX[v];
		const y1 = tb.screenY[v];
		const x2 = tb.screenX[v + 1];
		const y2 = tb.screenY[v + 1];
		const x3 = tb.screenX[v + 2];
		const y3 = tb.screenY[v + 2];

		const isFlat = shadedColorStride === 3;
		const isGouraud = shadedColorStride === 9;
		const base = iterIdx * shadedColorStride;

		let flatR = baseR;
		let flatG = baseG;
		let flatB = baseB;
		if (isFlat && shadedColorData) {
			flatR = Math.round(baseR * shadedColorData[base]);
			flatG = Math.round(baseG * shadedColorData[base + 1]);
			flatB = Math.round(baseB * shadedColorData[base + 2]);
		}

		this.#ndcZ0 = tb.ndcZ[v];
		this.#ndcZ1 = tb.ndcZ[v + 1];
		this.#ndcZ2 = tb.ndcZ[v + 2];

		if (this.#hasFog) {
			this.#fogF0 = tb.fogFactor[v];
			this.#fogF1 = tb.fogFactor[v + 1];
			this.#fogF2 = tb.fogFactor[v + 2];
		}
		this.#flatR = flatR;
		this.#flatG = flatG;
		this.#flatB = flatB;

		if (isGouraud && shadedColorData) {
			this.#gouraudData = shadedColorData;
			this.#gouraudBase = base;
		}

		if (texture) {
			this.#uv0u = tb.uvU[v];
			this.#uv0v = tb.uvV[v];
			this.#uv1u = tb.uvU[v + 1];
			this.#uv1v = tb.uvV[v + 1];
			this.#uv2u = tb.uvU[v + 2];
			this.#uv2v = tb.uvV[v + 2];
		}

		// FlatTex optimization: select brightness level once per triangle
		if (isFlat && texture) {
			const litFactor = (flatR + flatG + flatB) / (3 * 255);
			this.#flatLitFactor = litFactor;
			const bl = this.#brightnessLevels;
			if (bl) {
				const level = (litFactor * bl.length + 0.5) | 0;
				const li = level < 0 ? 0 : level >= bl.length ? bl.length - 1 : level;
				this.#selectedBrightTex = bl[li];
			} else {
				this.#selectedBrightTex = undefined;
			}
		} else {
			this.#selectedBrightTex = undefined;
		}

		if (wireframe) {
			const fbU32 = this.#fbU32;
			const fbW = this.#dbWidth;
			const packed = 0xff000000 | (flatB << 16) | (flatG << 8) | flatR;
			this.#wireframe.rasterize(x1, y1, x2, y2, x3, y3, (px, py) => {
				fbU32[py * fbW + px] = packed;
			});
		} else if (points) {
			const fbU32 = this.#fbU32;
			const fbW = this.#dbWidth;
			const packed = 0xff000000 | (flatB << 16) | (flatG << 8) | flatR;
			const ptCb = (/** @type {number} */ px, /** @type {number} */ py) => {
				fbU32[py * fbW + px] = packed;
			};
			this.#point.rasterize(x1, y1, pointRadius, width, height, ptCb);
			this.#point.rasterize(x2, y2, pointRadius, width, height, ptCb);
			this.#point.rasterize(x3, y3, pointRadius, width, height, ptCb);
		} else {
			const cb = this.#selectCallback(isGouraud, isFlat, !!texture);
			this.#scanlineFill.fill(x1, y1, x2, y2, x3, y3, width, height, cb);
		}
	}

	/**
	 * Selects the pre-bound scanline callback for the current triangle's shading mode.
	 * @param {boolean} isGouraud
	 * @param {boolean} isFlat
	 * @param {boolean} hasTexture
	 * @returns {(y: number, xStart: number, xEnd: number, uStart: number, vStart: number, duDx: number, dvDx: number) => void}
	 */
	#selectCallback(isGouraud, isFlat, hasTexture) {
		if (hasTexture) {
			if (isGouraud) return this.#cbGouraudTex;
			if (isFlat) return this.#cbFlatTex;
			return this.#cbUnlitTex;
		}
		if (isGouraud) return this.#cbGouraud;
		return this.#cbFlat;
	}
}
