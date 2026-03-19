import { PointRasterizer } from "./PointRasterizer.js";
import { ScanlineFill } from "./ScanlineFill.js";
import { WireframeRasterizer } from "./WireframeRasterizer.js";

export class Rasterizer {
	#scanlineFill = new ScanlineFill();
	#wireframe = new WireframeRasterizer();
	#point = new PointRasterizer();

	// Per-triangle state fields (set once per triangle, read in pixel callbacks).
	/** @type {import('../framebuffer/Framebuffer.js').Framebuffer['depthBuffer']} */
	#depthBuf = /** @type {*} */ (undefined);
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
	/** @type {{ r: number, g: number, b: number }[] | undefined} */
	#gouraudColors;
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
	/** @type {(x: number, y: number, r: number, g: number, b: number, a: number) => void} */
	#pixelWriter = /** @type {*} */ (undefined);

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

	// Bound callbacks - created once, reused for every triangle.
	#cbFlat = this.#fillFlat.bind(this);
	#cbGouraud = this.#fillGouraud.bind(this);
	#cbFlatTex = this.#fillFlatTex.bind(this);
	#cbGouraudTex = this.#fillGouraudTex.bind(this);
	#cbUnlitTex = this.#fillUnlitTex.bind(this);

	/**
	 * @param {number} px
	 * @param {number} py
	 * @param {number} bu
	 * @param {number} bv
	 * @param {number} bw
	 * @returns {boolean}
	 */
	#depthTest(px, py, bu, bv, bw) {
		const ndcZ = bu * this.#ndcZ0 + bv * this.#ndcZ1 + bw * this.#ndcZ2;
		const depth16 = ((ndcZ + 1) * 32767.5 + 0.5) | 0;
		return this.#depthBuf.testAndSet(px, py, depth16);
	}

	/**
	 * @param {number} bu
	 * @param {number} bv
	 * @param {number} bw
	 * @returns {number}
	 */
	#sampleTexIdx(bu, bv, bw) {
		const texU = bu * this.#uv0u + bv * this.#uv1u + bw * this.#uv2u;
		const texV = bu * this.#uv0v + bv * this.#uv1v + bw * this.#uv2v;
		const cu = texU < 0 ? 0 : texU > 1 ? 1 : texU;
		const cv = texV < 0 ? 0 : texV > 1 ? 1 : texV;
		const tx = (cu * this.#texWm1 + 0.5) | 0;
		const ty = (cv * this.#texHm1 + 0.5) | 0;
		return (ty * this.#texW + tx) << 2;
	}

	/**
	 * @param {number} bu @param {number} bv @param {number} bw
	 * @returns {number} Interpolated fog factor 0-1
	 */
	#fogLerp(bu, bv, bw) {
		return bu * this.#fogF0 + bv * this.#fogF1 + bw * this.#fogF2;
	}

	/** @param {number} px @param {number} py @param {number} bu @param {number} bv @param {number} bw */
	#fillFlat(px, py, bu, bv, bw) {
		if (!this.#depthTest(px, py, bu, bv, bw)) return;
		let r = this.#flatR;
		let g = this.#flatG;
		let b = this.#flatB;
		if (this.#hasFog) {
			const f = this.#fogLerp(bu, bv, bw);
			r = (r + (this.#fogR - r) * f + 0.5) | 0;
			g = (g + (this.#fogG - g) * f + 0.5) | 0;
			b = (b + (this.#fogB - b) * f + 0.5) | 0;
		}
		this.#pixelWriter(px, py, r, g, b, 255);
	}

	/** @param {number} px @param {number} py @param {number} bu @param {number} bv @param {number} bw */
	#fillGouraud(px, py, bu, bv, bw) {
		if (!this.#depthTest(px, py, bu, bv, bw)) return;
		const sc = /** @type {{ r: number, g: number, b: number }[]} */ (
			this.#gouraudColors
		);
		const lr = sc[0].r * bu + sc[1].r * bv + sc[2].r * bw;
		const lg = sc[0].g * bu + sc[1].g * bv + sc[2].g * bw;
		const lb = sc[0].b * bu + sc[1].b * bv + sc[2].b * bw;
		let r = (this.#baseR * (lr < 0 ? 0 : lr > 1 ? 1 : lr) + 0.5) | 0;
		let g = (this.#baseG * (lg < 0 ? 0 : lg > 1 ? 1 : lg) + 0.5) | 0;
		let bl = (this.#baseB * (lb < 0 ? 0 : lb > 1 ? 1 : lb) + 0.5) | 0;
		if (this.#hasFog) {
			const f = this.#fogLerp(bu, bv, bw);
			r = (r + (this.#fogR - r) * f + 0.5) | 0;
			g = (g + (this.#fogG - g) * f + 0.5) | 0;
			bl = (bl + (this.#fogB - bl) * f + 0.5) | 0;
		}
		this.#pixelWriter(px, py, r, g, bl, 255);
	}

	/** @param {number} px @param {number} py @param {number} bu @param {number} bv @param {number} bw */
	#fillFlatTex(px, py, bu, bv, bw) {
		if (!this.#depthTest(px, py, bu, bv, bw)) return;
		const tidx = this.#sampleTexIdx(bu, bv, bw);
		const d = /** @type {Uint8ClampedArray} */ (this.#texData);
		const litFactor = (this.#flatR + this.#flatG + this.#flatB) / (3 * 255);
		let r = (d[tidx] * litFactor + 0.5) | 0;
		let g = (d[tidx + 1] * litFactor + 0.5) | 0;
		let b = (d[tidx + 2] * litFactor + 0.5) | 0;
		if (this.#hasFog) {
			const f = this.#fogLerp(bu, bv, bw);
			r = (r + (this.#fogR - r) * f + 0.5) | 0;
			g = (g + (this.#fogG - g) * f + 0.5) | 0;
			b = (b + (this.#fogB - b) * f + 0.5) | 0;
		}
		this.#pixelWriter(px, py, r, g, b, 255);
	}

	/** @param {number} px @param {number} py @param {number} bu @param {number} bv @param {number} bw */
	#fillGouraudTex(px, py, bu, bv, bw) {
		if (!this.#depthTest(px, py, bu, bv, bw)) return;
		const sc = /** @type {{ r: number, g: number, b: number }[]} */ (
			this.#gouraudColors
		);
		const lr = sc[0].r * bu + sc[1].r * bv + sc[2].r * bw;
		const lg = sc[0].g * bu + sc[1].g * bv + sc[2].g * bw;
		const lb = sc[0].b * bu + sc[1].b * bv + sc[2].b * bw;
		const cr = (this.#baseR * (lr < 0 ? 0 : lr > 1 ? 1 : lr) + 0.5) | 0;
		const cg = (this.#baseG * (lg < 0 ? 0 : lg > 1 ? 1 : lg) + 0.5) | 0;
		const cb = (this.#baseB * (lb < 0 ? 0 : lb > 1 ? 1 : lb) + 0.5) | 0;
		const tidx = this.#sampleTexIdx(bu, bv, bw);
		const d = /** @type {Uint8ClampedArray} */ (this.#texData);
		const litFactor = (cr + cg + cb) / (3 * 255);
		let r = (d[tidx] * litFactor + 0.5) | 0;
		let g = (d[tidx + 1] * litFactor + 0.5) | 0;
		let b = (d[tidx + 2] * litFactor + 0.5) | 0;
		if (this.#hasFog) {
			const f = this.#fogLerp(bu, bv, bw);
			r = (r + (this.#fogR - r) * f + 0.5) | 0;
			g = (g + (this.#fogG - g) * f + 0.5) | 0;
			b = (b + (this.#fogB - b) * f + 0.5) | 0;
		}
		this.#pixelWriter(px, py, r, g, b, 255);
	}

	/** @param {number} px @param {number} py @param {number} bu @param {number} bv @param {number} bw */
	#fillUnlitTex(px, py, bu, bv, bw) {
		if (!this.#depthTest(px, py, bu, bv, bw)) return;
		const tidx = this.#sampleTexIdx(bu, bv, bw);
		const d = /** @type {Uint8ClampedArray} */ (this.#texData);
		let r = ((d[tidx] * this.#baseR) / 255 + 0.5) | 0;
		let g = ((d[tidx + 1] * this.#baseG) / 255 + 0.5) | 0;
		let b = ((d[tidx + 2] * this.#baseB) / 255 + 0.5) | 0;
		if (this.#hasFog) {
			const f = this.#fogLerp(bu, bv, bw);
			r = (r + (this.#fogR - r) * f + 0.5) | 0;
			g = (g + (this.#fogG - g) * f + 0.5) | 0;
			b = (b + (this.#fogB - b) * f + 0.5) | 0;
		}
		this.#pixelWriter(px, py, r, g, b, 255);
	}

	/**
	 * Rasterizes a draw call to the framebuffer by dispatching to the appropriate
	 * sub-rasterizer based on the material mode.
	 * @param {{
	 *   triangles: import('../TriangleBuffer.js').TriangleBuffer,
	 *   material: {
	 *     wireframe?: boolean,
	 *     points?: boolean,
	 *     pointRadius?: number,
	 *     color?: { r: number, g: number, b: number },
	 *     map?: { data: { data: Uint8ClampedArray, width: number, height: number } }
	 *   },
	 *   shadedColors?: Array<{ r: number, g: number, b: number } | { r: number, g: number, b: number }[]>
	 * }} drawCall
	 * @param {import('../framebuffer/Framebuffer.js').Framebuffer} framebuffer
	 * @param {unknown} _colorTable Ignored - internal ColorTable is used
	 * @param {(x: number, y: number, r: number, g: number, b: number, a: number) => void} pixelWriter
	 * @param {{ r: number, g: number, b: number }|undefined} [fogColor]
	 * @returns {void}
	 */
	rasterize(drawCall, framebuffer, _colorTable, pixelWriter, fogColor) {
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
		this.#pixelWriter = pixelWriter;

		if (texture) {
			this.#texData = texture.data;
			this.#texW = texture.width;
			this.#texWm1 = texture.width - 1;
			this.#texHm1 = texture.height - 1;
		}

		const tb = drawCall.triangles;
		if (!tb) return;
		for (let i = 0; i < tb.length; i++) {
			const physIdx = tb.sortOrder[i];
			this.#rasterizeTriangleFromBuffer(
				tb,
				physIdx,
				drawCall.shadedColors?.[i],
				baseR,
				baseG,
				baseB,
				texture,
				wireframe,
				points,
				pointRadius,
				width,
				height,
				pixelWriter,
			);
		}
	}

	/**
	 * @param {import('../TriangleBuffer.js').TriangleBuffer} tb
	 * @param {number} physIdx Physical triangle index in typed arrays
	 * @param {*} sc Shaded color entry for this iteration position
	 * @param {number} baseR
	 * @param {number} baseG
	 * @param {number} baseB
	 * @param {{ data: Uint8ClampedArray, width: number, height: number } | undefined} texture
	 * @param {boolean | undefined} wireframe
	 * @param {boolean | undefined} points
	 * @param {number} pointRadius
	 * @param {number} width
	 * @param {number} height
	 * @param {(x: number, y: number, r: number, g: number, b: number, a: number) => void} pixelWriter
	 */
	#rasterizeTriangleFromBuffer(
		tb,
		physIdx,
		sc,
		baseR,
		baseG,
		baseB,
		texture,
		wireframe,
		points,
		pointRadius,
		width,
		height,
		pixelWriter,
	) {
		const v = physIdx * 3;
		const x1 = tb.screenX[v];
		const y1 = tb.screenY[v];
		const x2 = tb.screenX[v + 1];
		const y2 = tb.screenY[v + 1];
		const x3 = tb.screenX[v + 2];
		const y3 = tb.screenY[v + 2];

		const isFlat =
			sc !== undefined && typeof sc === "object" && !Array.isArray(sc);
		const isGouraud = sc !== undefined && Array.isArray(sc);

		let flatR = baseR;
		let flatG = baseG;
		let flatB = baseB;
		if (isFlat) {
			flatR = Math.round(baseR * sc.r);
			flatG = Math.round(baseG * sc.g);
			flatB = Math.round(baseB * sc.b);
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

		if (isGouraud) {
			this.#gouraudColors =
				/** @type {{ r: number, g: number, b: number }[]} */ (sc);
		}

		if (texture) {
			this.#uv0u = tb.uvU[v];
			this.#uv0v = tb.uvV[v];
			this.#uv1u = tb.uvU[v + 1];
			this.#uv1v = tb.uvV[v + 1];
			this.#uv2u = tb.uvU[v + 2];
			this.#uv2v = tb.uvV[v + 2];
		}

		if (wireframe) {
			this.#wireframe.rasterize(x1, y1, x2, y2, x3, y3, (px, py) =>
				pixelWriter(px, py, flatR, flatG, flatB, 255),
			);
		} else if (points) {
			const ptCb = (/** @type {number} */ px, /** @type {number} */ py) =>
				pixelWriter(px, py, flatR, flatG, flatB, 255);
			this.#point.rasterize(x1, y1, pointRadius, width, height, ptCb);
			this.#point.rasterize(x2, y2, pointRadius, width, height, ptCb);
			this.#point.rasterize(x3, y3, pointRadius, width, height, ptCb);
		} else {
			const cb = this.#selectCallback(isGouraud, isFlat, !!texture);
			this.#scanlineFill.fill(x1, y1, x2, y2, x3, y3, width, height, cb);
		}
	}

	/**
	 * Selects the pre-bound pixel callback for the current triangle's shading mode.
	 * @param {boolean} isGouraud
	 * @param {boolean} isFlat
	 * @param {boolean} hasTexture
	 * @returns {(px: number, py: number, bu: number, bv: number, bw: number) => void}
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
