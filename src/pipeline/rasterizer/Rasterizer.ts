import type { DepthBuffer } from "../framebuffer/DepthBuffer.ts";
import type { TriangleBuffer } from "../TriangleBuffer.ts";
import { PointRasterizer } from "./PointRasterizer.ts";
import { ScanlineFill } from "./ScanlineFill.ts";
import { WireframeRasterizer } from "./WireframeRasterizer.ts";

/**
 * 4x4 Bayer ordered dither thresholds, normalized to [0, 1).
 * Indexed as BAYER4[(y & 3) << 2 | (x & 3)].
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

interface TextureData {
	data: Uint8ClampedArray;
	width: number;
	height: number;
}

interface MaterialMap {
	data: TextureData;
	brightnessLevels?: Uint8ClampedArray[];
	wrapS?: number;
	wrapT?: number;
}

interface RasterMaterial {
	wireframe?: boolean;
	points?: boolean;
	pointRadius?: number;
	color?: { r: number; g: number; b: number };
	map?: MaterialMap;
	opacity?: number;
}

interface RasterDrawCall {
	triangles: TriangleBuffer;
	material: RasterMaterial;
	shadedColorData?: Float32Array;
	shadedColorStride?: number;
}

interface RasterFramebuffer {
	width: number;
	height: number;
	depthBuffer: DepthBuffer;
	u32: Uint32Array;
}

type ScanlineCallback = (
	y: number,
	xStart: number,
	xEnd: number,
	u: number,
	v: number,
	duDx: number,
	dvDx: number,
) => void;

/** Scanline triangle rasterizer with texture sampling and shading. */
export class Rasterizer {
	#scanlineFill = new ScanlineFill();
	#wireframe = new WireframeRasterizer();
	#point = new PointRasterizer();

	// Per-triangle state fields (set once per triangle, read in scanline handlers).
	#depthBuf: DepthBuffer = undefined as unknown as DepthBuffer;
	#dbData: Uint16Array = undefined as unknown as Uint16Array;
	#dbWidth = 0;
	#ndcZ0 = 0;
	#ndcZ1 = 0;
	#ndcZ2 = 0;
	#flatR = 0;
	#flatG = 0;
	#flatB = 0;
	#gouraudData: Float32Array | undefined;
	#gouraudBase = 0;
	#baseR = 255;
	#baseG = 255;
	#baseB = 255;
	#texData: Uint8ClampedArray | undefined;
	#texW = 0;
	#texWm1 = 0;
	#texH = 0;
	#texHm1 = 0;
	#uv0u = 0;
	#uv0v = 0;
	#uv1u = 0;
	#uv1v = 0;
	#uv2u = 0;
	#uv2v = 0;
	#fbU32: Uint32Array = undefined as unknown as Uint32Array;

	// Fog state
	#hasFog = false;
	#fogR = 0;
	#fogG = 0;
	#fogB = 0;
	#fogF0 = 0;
	#fogF1 = 0;
	#fogF2 = 0;

	// Brightness-copy texture levels
	#brightnessLevels: Uint8ClampedArray[] | undefined;

	// FlatTex optimization: pre-selected brightness level for constant litFactor
	#selectedBrightTex: Uint8ClampedArray | undefined;
	#flatLitFactor = 1;

	// UV wrapping mode (0 = ClampToEdge, 1 = Repeat)
	#wrapS = 0;
	#wrapT = 0;

	// 9-step opacity (0 = fully opaque, 8 = fully transparent)
	#opacity = 0;
	#srcWeight = 1;

	// Bound callbacks - created once, reused for every triangle.
	#cbFlat: ScanlineCallback = this.#fillFlat.bind(this);
	#cbGouraud: ScanlineCallback = this.#fillGouraud.bind(this);
	#cbFlatTex: ScanlineCallback = this.#fillFlatTex.bind(this);
	#cbGouraudTex: ScanlineCallback = this.#fillGouraudTex.bind(this);
	#cbUnlitTex: ScanlineCallback = this.#fillUnlitTex.bind(this);

	#fillFlat(
		y: number,
		xStart: number,
		xEnd: number,
		u: number,
		v: number,
		duDx: number,
		dvDx: number,
	): void {
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
		const opacity = this.#opacity;
		const srcWeight = this.#srcWeight;
		for (let x = xStart; x <= xEnd; x++, dIdx++, ndcZ += dNdcZ) {
			const depth16 = ((ndcZ + 1) * 32767.5 + 0.5) | 0;
			if (depth16 > dbData[dIdx]) continue;
			if (opacity === 0) dbData[dIdx] = depth16;
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
			if (opacity === 0) {
				fbU32[dIdx] = 0xff000000 | (b << 16) | (g << 8) | r;
			} else {
				const dstPx = fbU32[dIdx];
				const sw = srcWeight;
				const dw = 1 - sw;
				fbU32[dIdx] =
					0xff000000 |
					(((b * sw + ((dstPx >> 16) & 0xff) * dw + 0.5) | 0) << 16) |
					(((g * sw + ((dstPx >> 8) & 0xff) * dw + 0.5) | 0) << 8) |
					((r * sw + (dstPx & 0xff) * dw + 0.5) | 0);
			}
			if (hasFog) fogF += dFogF;
		}
	}

	#fillGouraud(
		y: number,
		xStart: number,
		xEnd: number,
		u: number,
		v: number,
		duDx: number,
		dvDx: number,
	): void {
		const w = 1 - u - v;
		const dNdcZ =
			duDx * (this.#ndcZ0 - this.#ndcZ2) + dvDx * (this.#ndcZ1 - this.#ndcZ2);
		const gd = this.#gouraudData as Float32Array;
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
		const opacity = this.#opacity;
		const srcWeight = this.#srcWeight;
		for (
			let x = xStart;
			x <= xEnd;
			x++, dIdx++, ndcZ += dNdcZ, lr += dLR, lg += dLG, lb += dLB
		) {
			const depth16 = ((ndcZ + 1) * 32767.5 + 0.5) | 0;
			if (depth16 > dbData[dIdx]) continue;
			if (opacity === 0) dbData[dIdx] = depth16;
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
			if (opacity === 0) {
				fbU32[dIdx] = 0xff000000 | (bl << 16) | (g << 8) | r;
			} else {
				const dstPx = fbU32[dIdx];
				const sw = srcWeight;
				const dw = 1 - sw;
				fbU32[dIdx] =
					0xff000000 |
					(((bl * sw + ((dstPx >> 16) & 0xff) * dw + 0.5) | 0) << 16) |
					(((g * sw + ((dstPx >> 8) & 0xff) * dw + 0.5) | 0) << 8) |
					((r * sw + (dstPx & 0xff) * dw + 0.5) | 0);
			}
			if (hasFog) fogF += dFogF;
		}
	}

	#fillFlatTex(
		y: number,
		xStart: number,
		xEnd: number,
		u: number,
		v: number,
		duDx: number,
		dvDx: number,
	): void {
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
		const texH = this.#texH;
		const texHm1 = this.#texHm1;
		const texW = this.#texW;
		const hasFog = this.#hasFog;
		const fbU32 = this.#fbU32;
		let dIdx = y * dbW + xStart;
		const brightTex = this.#selectedBrightTex;
		const litFactor = this.#flatLitFactor;
		const texD = this.#texData as Uint8ClampedArray;
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
		const opacity = this.#opacity;
		const srcWeight = this.#srcWeight;
		for (
			let x = xStart;
			x <= xEnd;
			x++, dIdx++, ndcZ += dNdcZ, texU += dTexU, texV += dTexV
		) {
			const depth16 = ((ndcZ + 1) * 32767.5 + 0.5) | 0;
			if (depth16 > dbData[dIdx]) continue;
			if (opacity === 0) dbData[dIdx] = depth16;
			const tx = wS
				? (((texU * texW) | 0) + texW) & texWm1
				: ((texU < 0 ? 0 : texU > 1 ? 1 : texU) * texWm1 + 0.5) | 0;
			const ty = wT
				? (((texV * texH) | 0) + texH) & texHm1
				: ((texV < 0 ? 0 : texV > 1 ? 1 : texV) * texHm1 + 0.5) | 0;
			const tidx = (ty * texW + tx) << 2;
			const d = BAYER4[((y & 3) << 2) | (x & 3)];
			let r: number;
			let g: number;
			let b: number;
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
			if (opacity === 0) {
				fbU32[dIdx] = 0xff000000 | (b << 16) | (g << 8) | r;
			} else {
				const dstPx = fbU32[dIdx];
				const sw = srcWeight;
				const dw = 1 - sw;
				fbU32[dIdx] =
					0xff000000 |
					(((b * sw + ((dstPx >> 16) & 0xff) * dw + 0.5) | 0) << 16) |
					(((g * sw + ((dstPx >> 8) & 0xff) * dw + 0.5) | 0) << 8) |
					((r * sw + (dstPx & 0xff) * dw + 0.5) | 0);
			}
			if (hasFog) fogF += dFogF;
		}
	}

	#fillGouraudTex(
		y: number,
		xStart: number,
		xEnd: number,
		u: number,
		v: number,
		duDx: number,
		dvDx: number,
	): void {
		const w = 1 - u - v;
		const dNdcZ =
			duDx * (this.#ndcZ0 - this.#ndcZ2) + dvDx * (this.#ndcZ1 - this.#ndcZ2);
		const dTexU =
			duDx * (this.#uv0u - this.#uv2u) + dvDx * (this.#uv1u - this.#uv2u);
		const dTexV =
			duDx * (this.#uv0v - this.#uv2v) + dvDx * (this.#uv1v - this.#uv2v);
		const gd = this.#gouraudData as Float32Array;
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
		const texD = this.#texData as Uint8ClampedArray;
		const texWm1 = this.#texWm1;
		const texH = this.#texH;
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
		const blCount = hasBL ? (bl as Uint8ClampedArray[]).length : 0;
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
		const opacity = this.#opacity;
		const srcWeight = this.#srcWeight;
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
			if (opacity === 0) dbData[dIdx] = depth16;
			const d = BAYER4[((y & 3) << 2) | (x & 3)];
			const cr = (baseR * (lr < 0 ? 0 : lr > 1 ? 1 : lr) + d) | 0;
			const cg = (baseG * (lg < 0 ? 0 : lg > 1 ? 1 : lg) + d) | 0;
			const cb = (baseB * (lb < 0 ? 0 : lb > 1 ? 1 : lb) + d) | 0;
			const tx = wS
				? (((texU * texW) | 0) + texW) & texWm1
				: ((texU < 0 ? 0 : texU > 1 ? 1 : texU) * texWm1 + 0.5) | 0;
			const ty = wT
				? (((texV * texH) | 0) + texH) & texHm1
				: ((texV < 0 ? 0 : texV > 1 ? 1 : texV) * texHm1 + 0.5) | 0;
			const tidx = (ty * texW + tx) << 2;
			let r: number;
			let g: number;
			let b: number;
			if (hasBL) {
				const litFactor = (cr + cg + cb) / (3 * 255);
				const level = (litFactor * blCount + d) | 0;
				const li = level < 0 ? 0 : level >= blCount ? blCount - 1 : level;
				const bd = (bl as Uint8ClampedArray[])[li];
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
			if (opacity === 0) {
				fbU32[dIdx] = 0xff000000 | (b << 16) | (g << 8) | r;
			} else {
				const dstPx = fbU32[dIdx];
				const sw = srcWeight;
				const dw = 1 - sw;
				fbU32[dIdx] =
					0xff000000 |
					(((b * sw + ((dstPx >> 16) & 0xff) * dw + 0.5) | 0) << 16) |
					(((g * sw + ((dstPx >> 8) & 0xff) * dw + 0.5) | 0) << 8) |
					((r * sw + (dstPx & 0xff) * dw + 0.5) | 0);
			}
			if (hasFog) fogF += dFogF;
		}
	}

	#fillUnlitTex(
		y: number,
		xStart: number,
		xEnd: number,
		u: number,
		v: number,
		duDx: number,
		dvDx: number,
	): void {
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
		const texD = this.#texData as Uint8ClampedArray;
		const texWm1 = this.#texWm1;
		const texH = this.#texH;
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
		const opacity = this.#opacity;
		const srcWeight = this.#srcWeight;
		for (
			let x = xStart;
			x <= xEnd;
			x++, dIdx++, ndcZ += dNdcZ, texU += dTexU, texV += dTexV
		) {
			const depth16 = ((ndcZ + 1) * 32767.5 + 0.5) | 0;
			if (depth16 > dbData[dIdx]) continue;
			if (opacity === 0) dbData[dIdx] = depth16;
			const tx = wS
				? (((texU * texW) | 0) + texW) & texWm1
				: ((texU < 0 ? 0 : texU > 1 ? 1 : texU) * texWm1 + 0.5) | 0;
			const ty = wT
				? (((texV * texH) | 0) + texH) & texHm1
				: ((texV < 0 ? 0 : texV > 1 ? 1 : texV) * texHm1 + 0.5) | 0;
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
			if (opacity === 0) {
				fbU32[dIdx] = 0xff000000 | (b << 16) | (g << 8) | r;
			} else {
				const dstPx = fbU32[dIdx];
				const sw = srcWeight;
				const dw = 1 - sw;
				fbU32[dIdx] =
					0xff000000 |
					(((b * sw + ((dstPx >> 16) & 0xff) * dw + 0.5) | 0) << 16) |
					(((g * sw + ((dstPx >> 8) & 0xff) * dw + 0.5) | 0) << 8) |
					((r * sw + (dstPx & 0xff) * dw + 0.5) | 0);
			}
			if (hasFog) fogF += dFogF;
		}
	}

	/** Rasterizes a draw call to the framebuffer by dispatching to the appropriate sub-rasterizer. */
	rasterize(
		drawCall: RasterDrawCall,
		framebuffer: RasterFramebuffer,
		_colorTable: unknown,
		fogColor?: { r: number; g: number; b: number },
	): void {
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
			this.#texH = texture.height;
			this.#texHm1 = texture.height - 1;
		}

		this.#opacity = (drawCall.material as RasterMaterial).opacity ?? 0;
		this.#srcWeight = (8 - this.#opacity) / 8;

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

	#rasterizeTriangleFromBuffer(
		tb: TriangleBuffer,
		physIdx: number,
		shadedColorData: Float32Array | undefined,
		shadedColorStride: number,
		iterIdx: number,
		baseR: number,
		baseG: number,
		baseB: number,
		texture: TextureData | undefined,
		wireframe: boolean | undefined,
		points: boolean | undefined,
		pointRadius: number,
		width: number,
		height: number,
	): void {
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
			const blLevels = this.#brightnessLevels;
			if (blLevels) {
				const level = (litFactor * blLevels.length + 0.5) | 0;
				const li =
					level < 0
						? 0
						: level >= blLevels.length
							? blLevels.length - 1
							: level;
				this.#selectedBrightTex = blLevels[li];
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
			const ptCb = (px: number, py: number): void => {
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

	/** Selects the pre-bound scanline callback for the current triangle's shading mode. */
	#selectCallback(
		isGouraud: boolean,
		isFlat: boolean,
		hasTexture: boolean,
	): ScanlineCallback {
		if (hasTexture) {
			if (isGouraud) return this.#cbGouraudTex;
			if (isFlat) return this.#cbFlatTex;
			return this.#cbUnlitTex;
		}
		if (isGouraud) return this.#cbGouraud;
		return this.#cbFlat;
	}
}
