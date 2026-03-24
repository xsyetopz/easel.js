import { Shading } from "../../core/Constants.js";
import { FlatShader } from "./FlatShader.js";
import { GouraudShader } from "./GouraudShader.js";

/** Bakes scene lights into per-vertex or per-face colors. */
export class LightBaker {
	#flatShader = new FlatShader();
	#gouraudShader = new GouraudShader();

	/** @type {Float32Array} Reusable vertex shade cache (r,g,b per vertex index). */
	#shadeCache = new Float32Array(0);

	/** @type {Uint8Array} Bitmap tracking which vertex indices have been cached. */
	#shadeCachedBitmap = new Uint8Array(0);

	/**
	 * @param {number} size
	 * @returns {Float32Array}
	 */
	#ensureCache(size) {
		if (this.#shadeCache.length < size) {
			this.#shadeCache = new Float32Array(size * 2);
		}
		return this.#shadeCache;
	}

	/**
	 * @param {number} size
	 * @returns {Uint8Array}
	 */
	#ensureBitmap(size) {
		if (this.#shadeCachedBitmap.length < size) {
			this.#shadeCachedBitmap = new Uint8Array(size * 2);
		}
		return this.#shadeCachedBitmap;
	}

	/**
	 * Bakes lighting onto a draw call's faces or vertices.
	 * Writes shaded RGB into drawCall.shadedColorData (flat Float32Array).
	 * Stride is 3 for flat shading (r,g,b per face) or 9 for gouraud (r,g,b × 3 vertices).
	 * @param {{ triangles: *, material: { shading?: number, type?: string }, shadedColorData: Float32Array, shadedColorStride: number }} drawCall
	 * @param {Array<Record<string, unknown>>} lights
	 * @returns {void}
	 */
	bake(drawCall, lights) {
		drawCall.shadedColorStride = 0;
		if (lights.length === 0) return;
		const matType = drawCall.material?.type;
		if (matType === "BasicMaterial" || matType === "PointsMaterial") return;

		const tb = drawCall.triangles;
		const isFlat = drawCall.material.shading === Shading.Flat;
		const stride = isFlat ? 3 : 9;
		const needed = tb.length * stride;

		if (drawCall.shadedColorData.length < needed) {
			drawCall.shadedColorData = new Float32Array(needed);
		}
		drawCall.shadedColorStride = stride;

		if (isFlat) {
			this.#bakeFlat(tb, drawCall, lights);
		} else {
			this.#bakeGouraud(tb, drawCall, lights);
		}
	}

	/**
	 * @param {*} tb
	 * @param {*} drawCall
	 * @param {Array<*>} lights
	 */
	#bakeFlat(tb, drawCall, lights) {
		const data = drawCall.shadedColorData;
		for (let i = 0; i < tb.length; i++) {
			const physIdx = tb.sortOrder[i];
			const base = i * 3;
			const v = physIdx * 3;
			const fcwx = (tb.worldX[v] + tb.worldX[v + 1] + tb.worldX[v + 2]) / 3;
			const fcwy = (tb.worldY[v] + tb.worldY[v + 1] + tb.worldY[v + 2]) / 3;
			const fcwz = (tb.worldZ[v] + tb.worldZ[v + 1] + tb.worldZ[v + 2]) / 3;
			const s = this.#flatShader.shade(
				tb.faceNormalX[physIdx],
				tb.faceNormalY[physIdx],
				tb.faceNormalZ[physIdx],
				lights,
				0.1,
				fcwx,
				fcwy,
				fcwz,
			);
			data[base] = s.r;
			data[base + 1] = s.g;
			data[base + 2] = s.b;
		}
	}

	/**
	 * Gouraud bake with per-vertex shade cache.
	 * Shared vertices are shaded once and the result is reused.
	 * @param {*} tb
	 * @param {*} drawCall
	 * @param {Array<*>} lights
	 */
	#bakeGouraud(tb, drawCall, lights) {
		const data = drawCall.shadedColorData;
		const maxVi = tb.maxVertexIndex;
		const cacheSize = (maxVi + 1) * 3;
		const cache = this.#ensureCache(cacheSize);
		const cached = this.#ensureBitmap(maxVi + 1);
		cached.fill(0, 0, maxVi + 1);

		for (let i = 0; i < tb.length; i++) {
			const physIdx = tb.sortOrder[i];
			const v = physIdx * 3;
			const base = i * 9;

			for (let k = 0; k < 3; k++) {
				const vi = tb.vertexIndex[v + k];
				const cb = vi * 3;

				if (!cached[vi]) {
					const s = this.#gouraudShader.shade(
						tb.vertNormalX[v + k],
						tb.vertNormalY[v + k],
						tb.vertNormalZ[v + k],
						lights,
						0.1,
						tb.worldX[v + k],
						tb.worldY[v + k],
						tb.worldZ[v + k],
					);
					cache[cb] = s.r;
					cache[cb + 1] = s.g;
					cache[cb + 2] = s.b;
					cached[vi] = 1;
				}

				data[base + k * 3] = cache[cb];
				data[base + k * 3 + 1] = cache[cb + 1];
				data[base + k * 3 + 2] = cache[cb + 2];
			}
		}
	}
}
