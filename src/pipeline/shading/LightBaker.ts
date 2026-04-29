import { LightType, Shading } from "../../core/Constants.ts";
import type { TriangleBuffer } from "../TriangleBuffer.ts";
import { FlatShader } from "./FlatShader.ts";
import { GouraudShader } from "./GouraudShader.ts";

interface BakeDrawCall {
	triangles: TriangleBuffer;
	material: { shading?: number; type?: string };
	worldPositions?: Float32Array;
	shadedColorData: Float32Array;
	shadedColorStride: number;
}

/** Bakes scene lights into per-vertex or per-face colors. */
export class LightBaker {
	#flatShader = new FlatShader();
	#gouraudShader = new GouraudShader();

	/** Reusable vertex shade cache (r,g,b per vertex index). */
	#shadeCache = new Float32Array(0);

	/** Bitmap tracking which vertex indices have been cached. */
	#shadeCachedBitmap = new Uint8Array(0);

	#ensureCache(size: number): Float32Array {
		if (this.#shadeCache.length < size) {
			this.#shadeCache = new Float32Array(size * 2);
		}
		return this.#shadeCache;
	}

	#ensureBitmap(size: number): Uint8Array {
		if (this.#shadeCachedBitmap.length < size) {
			this.#shadeCachedBitmap = new Uint8Array(size * 2);
		}
		return this.#shadeCachedBitmap;
	}

	/**
	 * Bakes lighting onto a draw call's faces or vertices.
	 * Writes shaded RGB into drawCall.shadedColorData (flat Float32Array).
	 * Stride is 3 for flat shading (r,g,b per face) or 9 for gouraud (r,g,b x 3 vertices).
	 */
	bake(drawCall: BakeDrawCall, lights: Record<string, unknown>[]): void {
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

		const needsWorldPos = this.#needsWorldPosition(lights);
		if (isFlat) {
			this.#bakeFlat(tb, drawCall, lights, needsWorldPos);
		} else {
			this.#bakeGouraud(tb, drawCall, lights, needsWorldPos);
		}
	}

	#needsWorldPosition(lights: Record<string, unknown>[]): boolean {
		for (let i = 0, len = lights.length; i < len; i++) {
			const light = lights[i] as { lightType?: unknown; type?: unknown };
			const lt = light.lightType;
			if (lt === LightType.Point || lt === LightType.Spot) return true;
			const t = light.type;
			if (t === "point" || t === "spot") return true;
		}
		return false;
	}

	#bakeFlat(
		tb: TriangleBuffer,
		drawCall: BakeDrawCall,
		lights: Record<string, unknown>[],
		needsWorldPos: boolean,
	): void {
		const data = drawCall.shadedColorData;
		const wp = drawCall.worldPositions;
		const sortOrder = tb.sortOrder;
		const useSortOrder = tb.sortOrderActive && sortOrder.length === tb.length;
		if (needsWorldPos && wp !== undefined && wp.length > 0) {
			for (let i = 0; i < tb.length; i++) {
				const physIdx = useSortOrder ? sortOrder[i] : i;
				const base = i * 3;
				const v = physIdx * 3;
				const vi0 = tb.vertexIndex[v];
				const vi1 = tb.vertexIndex[v + 1];
				const vi2 = tb.vertexIndex[v + 2];
				const wb0 = vi0 * 3;
				const wb1 = vi1 * 3;
				const wb2 = vi2 * 3;
				const fcwx = (wp[wb0] + wp[wb1] + wp[wb2]) * 0.3333333333333333;
				const fcwy =
					(wp[wb0 + 1] + wp[wb1 + 1] + wp[wb2 + 1]) * 0.3333333333333333;
				const fcwz =
					(wp[wb0 + 2] + wp[wb1 + 2] + wp[wb2 + 2]) * 0.3333333333333333;
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
			return;
		}

		for (let i = 0; i < tb.length; i++) {
			const physIdx = useSortOrder ? sortOrder[i] : i;
			const base = i * 3;
			const s = this.#flatShader.shade(
				tb.faceNormalX[physIdx],
				tb.faceNormalY[physIdx],
				tb.faceNormalZ[physIdx],
				lights,
				0.1,
			);
			data[base] = s.r;
			data[base + 1] = s.g;
			data[base + 2] = s.b;
		}
	}

	/**
	 * Gouraud bake with per-vertex shade cache.
	 * Shared vertices are shaded once and the result is reused.
	 */
	#bakeGouraud(
		tb: TriangleBuffer,
		drawCall: BakeDrawCall,
		lights: Record<string, unknown>[],
		needsWorldPos: boolean,
	): void {
		const data = drawCall.shadedColorData;
		const maxVi = tb.maxVertexIndex;
		const sortOrder = tb.sortOrder;
		const useSortOrder = tb.sortOrderActive && sortOrder.length === tb.length;
		const cacheSize = (maxVi + 1) * 3;
		const cache = this.#ensureCache(cacheSize);
		const cached = this.#ensureBitmap(maxVi + 1);
		cached.fill(0, 0, maxVi + 1);

		const wp = drawCall.worldPositions;
		if (needsWorldPos && wp !== undefined && wp.length > 0) {
			for (let i = 0; i < tb.length; i++) {
				const physIdx = useSortOrder ? sortOrder[i] : i;
				const v = physIdx * 3;
				const base = i * 9;

				for (let k = 0; k < 3; k++) {
					const vi = tb.vertexIndex[v + k];
					const cb = vi * 3;

					if (!cached[vi]) {
						const wb = vi * 3;
						const s = this.#gouraudShader.shade(
							tb.vertNormalX[v + k],
							tb.vertNormalY[v + k],
							tb.vertNormalZ[v + k],
							lights,
							0.1,
							wp[wb],
							wp[wb + 1],
							wp[wb + 2],
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
			return;
		}

		for (let i = 0; i < tb.length; i++) {
			const physIdx = useSortOrder ? sortOrder[i] : i;
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
