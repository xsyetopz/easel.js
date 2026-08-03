import { describe, expect, it } from "bun:test";
import { TriangleBuffer } from "@/pipeline/TriangleBuffer.js";
import {
	appendCenterTriangle,
	collectNonBlackPixels,
	countNonBlackPixels,
	makeEmptyRasterDrawCall,
	makeRasterDrawCall,
	makeRasterizerFixture,
	type RasterDrawCall,
} from "../../_helpers/rasterizer.js";

describe("Rasterizer", () => {
	it("writes pixels for solid material", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		rasterizer.rasterize(makeRasterDrawCall(), fb, undefined);
		expect(countNonBlackPixels(fb)).toBeGreaterThan(0);
	});

	it("writes pixels for wireframe material", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		rasterizer.rasterize(
			makeRasterDrawCall({ wireframe: true }),
			fb,
			undefined,
		);
		expect(countNonBlackPixels(fb)).toBeGreaterThan(0);
	});

	it("writes pixels for points material", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		rasterizer.rasterize(
			makeRasterDrawCall({ points: true, pointRadius: 1 }),
			fb,
			undefined,
		);
		expect(countNonBlackPixels(fb)).toBeGreaterThan(0);
	});

	it("does not write pixels for empty triangles array", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		rasterizer.rasterize(makeEmptyRasterDrawCall(), fb, undefined);
		expect(countNonBlackPixels(fb)).toBe(0);
	});

	it("flat shading: shadedColorData multiplies base material color", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const tb = new TriangleBuffer(1);
		appendCenterTriangle(tb, -1);
		tb.vertexIndex.set([0, 1, 2]);
		tb.buildSortOrder();
		const drawCall = {
			triangles: tb,
			material: { color: { r: 1, g: 1, b: 1 } },
			shadedColorData: new Float32Array([0.5, 0.5, 0.5]),
			shadedColorStride: 3,
		};
		rasterizer.rasterize(drawCall, fb, undefined);
		const pixels = collectNonBlackPixels(fb);
		expect(pixels.length).toBeGreaterThan(0);
		for (const p of pixels) {
			expect(p.r).toBeGreaterThanOrEqual(127);
			expect(p.r).toBeLessThanOrEqual(128);
			expect(p.g).toBeGreaterThanOrEqual(127);
			expect(p.g).toBeLessThanOrEqual(128);
			expect(p.b).toBeGreaterThanOrEqual(127);
			expect(p.b).toBeLessThanOrEqual(128);
		}
	});

	it("gouraud shading: shadedColorData stride 9 produces varying pixel colors across triangle", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const tb = new TriangleBuffer(1);
		appendCenterTriangle(tb, -1);
		tb.buildSortOrder();
		// Stride 9: v0=(1,0,0), v1=(0,1,0), v2=(0,0,1)
		const drawCall = {
			triangles: tb,
			material: { color: { r: 1, g: 1, b: 1 } },
			shadedColorData: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
			shadedColorStride: 9,
		};
		rasterizer.rasterize(drawCall, fb, undefined);
		const pixels = collectNonBlackPixels(fb);
		expect(pixels.length).toBeGreaterThan(0);
		const unique = new Set(pixels.map((p) => `${p.r},${p.g},${p.b}`));
		expect(unique.size).toBeGreaterThan(1);
	});

	it("no shadedColorData: uses base material color directly for all pixels", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const tb = new TriangleBuffer(1);
		appendCenterTriangle(tb, -1);
		tb.buildSortOrder();
		const drawCall = {
			triangles: tb,
			material: { color: { r: 1, g: 0, b: 0 } },
		};
		rasterizer.rasterize(drawCall, fb, undefined);
		const pixels = collectNonBlackPixels(fb);
		expect(pixels.length).toBeGreaterThan(0);
		for (const p of pixels) {
			expect(p.r).toBe(255);
			expect(p.g).toBe(0);
			expect(p.b).toBe(0);
		}
	});

	it("uniform vertex color multiplies the material on the flat path", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const tb = new TriangleBuffer(1);
		appendCenterTriangle(tb, -1);
		tb.vertexIndex.set([0, 1, 2]);
		tb.buildSortOrder();
		rasterizer.rasterize(
			{
				triangles: tb,
				material: { color: { r: 0.5, g: 0.5, b: 1 } },
				vertexColorData: new Float32Array([1, 0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5]),
				vertexColorItemSize: 3,
			},
			fb,
			undefined,
		);
		const pixels = collectNonBlackPixels(fb);
		expect(pixels.length).toBeGreaterThan(0);
		for (const p of pixels) {
			expect(p.r).toBe(128);
			expect(p.g).toBe(64);
			expect(p.b).toBe(128);
		}
	});

	it("mixed vertex colors interpolate only the affected triangle", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const tb = new TriangleBuffer(1);
		appendCenterTriangle(tb, -1);
		tb.vertexIndex.set([0, 1, 2]);
		tb.buildSortOrder();
		rasterizer.rasterize(
			{
				triangles: tb,
				material: { color: { r: 1, g: 1, b: 1 } },
				vertexColorData: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
				vertexColorItemSize: 3,
			},
			fb,
			undefined,
		);
		const pixels = collectNonBlackPixels(fb);
		const unique = new Set(pixels.map((p) => `${p.r},${p.g},${p.b}`));
		expect(pixels.length).toBeGreaterThan(0);
		expect(unique.size).toBeGreaterThan(1);
	});

	it("mixed vertex colors tint textured pixels component-wise", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const tb = new TriangleBuffer(1);
		appendCenterTriangle(tb, -1, 0, 0, 1, 0, 0, 1);
		tb.vertexIndex.set([0, 1, 2]);
		tb.buildSortOrder();
		const whiteTexture = new Uint8ClampedArray([
			255, 255, 255, 255,
			255, 255, 255, 255,
			255, 255, 255, 255,
			255, 255, 255, 255,
		]);
		rasterizer.rasterize(
			{
				triangles: tb,
				material: {
					map: { data: { data: whiteTexture, width: 2, height: 2 } },
				},
				vertexColorData: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
				vertexColorItemSize: 3,
			},
			fb,
			undefined,
		);
		const pixels = collectNonBlackPixels(fb);
		const unique = new Set(pixels.map((p) => `${p.r},${p.g},${p.b}`));
		expect(pixels.length).toBeGreaterThan(0);
		expect(unique.size).toBeGreaterThan(1);
	});

	it("uniform vertex color tints flat-lit texture channels", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const tb = new TriangleBuffer(1);
		appendCenterTriangle(tb, -1, 0, 0, 1, 0, 0, 1);
		tb.vertexIndex.set([0, 1, 2]);
		tb.buildSortOrder();
		const whiteTexture = new Uint8ClampedArray(16).fill(255);
		rasterizer.rasterize(
			{
				triangles: tb,
				material: {
					color: { r: 1, g: 1, b: 1 },
					map: { data: { data: whiteTexture, width: 2, height: 2 } },
				},
				shadedColorData: new Float32Array([1, 1, 1]),
				shadedColorStride: 3,
				vertexColorData: new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0]),
				vertexColorItemSize: 3,
			},
			fb,
			undefined,
		);
		for (const p of collectNonBlackPixels(fb)) {
			expect(p.r).toBe(255);
			expect(p.g).toBe(0);
			expect(p.b).toBe(0);
		}
	});

	it("uniform vertex color tints gouraud-lit texture channels", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const tb = new TriangleBuffer(1);
		appendCenterTriangle(tb, -1, 0, 0, 1, 0, 0, 1);
		tb.vertexIndex.set([0, 1, 2]);
		tb.buildSortOrder();
		const whiteTexture = new Uint8ClampedArray(16).fill(255);
		rasterizer.rasterize(
			{
				triangles: tb,
				material: {
					color: { r: 1, g: 1, b: 1 },
					map: { data: { data: whiteTexture, width: 2, height: 2 } },
				},
				shadedColorData: new Float32Array([
					1, 1, 1,
					1, 1, 1,
					1, 1, 1,
				]),
				shadedColorStride: 9,
				vertexColorData: new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0]),
				vertexColorItemSize: 3,
			},
			fb,
			undefined,
		);
		for (const p of collectNonBlackPixels(fb)) {
			expect(p.r).toBe(255);
			expect(p.g).toBe(0);
			expect(p.b).toBe(0);
		}
	});

	it("uniform vertex tint is applied after brightness-level texture selection", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const tb = new TriangleBuffer(1);
		appendCenterTriangle(tb, -1, 0, 0, 1, 0, 0, 1);
		tb.vertexIndex.set([0, 1, 2]);
		tb.buildSortOrder();
		const whiteTexture = new Uint8ClampedArray(16).fill(255);
		const brightnessLevels = Array.from(
			{ length: 4 },
			() => new Uint8ClampedArray(16).fill(255),
		);
		rasterizer.rasterize(
			{
				triangles: tb,
				material: {
					color: { r: 1, g: 1, b: 1 },
					map: {
						data: { data: whiteTexture, width: 2, height: 2 },
						brightnessLevels,
					},
				},
				shadedColorData: new Float32Array([1, 1, 1]),
				shadedColorStride: 3,
				vertexColorData: new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0]),
				vertexColorItemSize: 3,
			},
			fb,
			undefined,
		);
		for (const p of collectNonBlackPixels(fb)) {
			expect(p.r).toBe(255);
			expect(p.g).toBe(0);
			expect(p.b).toBe(0);
		}
	});

	it("mixed vertex tint keeps brightness levels and applies sampled RGB per channel", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const tb = new TriangleBuffer(1);
		appendCenterTriangle(tb, -1, 0, 0, 1, 0, 0, 1);
		tb.vertexIndex.set([0, 1, 2]);
		tb.buildSortOrder();
		const redTexture = new Uint8ClampedArray([
			255, 0, 0, 255,
			255, 0, 0, 255,
			255, 0, 0, 255,
			255, 0, 0, 255,
		]);
		const greenLevels = Array.from(
			{ length: 4 },
			() =>
				new Uint8ClampedArray([
					0, 255, 0, 255,
					0, 255, 0, 255,
					0, 255, 0, 255,
					0, 255, 0, 255,
				]),
		);
		rasterizer.rasterize(
			{
				triangles: tb,
				material: {
					color: { r: 1, g: 1, b: 1 },
					map: {
						data: { data: redTexture, width: 2, height: 2 },
						brightnessLevels: greenLevels,
					},
				},
				shadedColorData: new Float32Array([
					1, 1, 1,
					1, 1, 1,
					1, 1, 1,
				]),
				shadedColorStride: 9,
				vertexColorData: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
				vertexColorItemSize: 3,
			},
			fb,
			undefined,
		);
		const pixels = collectNonBlackPixels(fb);
		expect(pixels.some((p) => p.g > 0)).toBe(true);
		expect(pixels.every((p) => p.r === 0)).toBe(true);
	});

	it("mixed textured tint preserves colored baked lighting", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const tb = new TriangleBuffer(1);
		appendCenterTriangle(tb, -1, 0, 0, 1, 0, 0, 1);
		tb.vertexIndex.set([0, 1, 2]);
		tb.buildSortOrder();
		const whiteTexture = new Uint8ClampedArray(16).fill(255);
		rasterizer.rasterize(
			{
				triangles: tb,
				material: {
					color: { r: 1, g: 1, b: 1 },
					map: { data: { data: whiteTexture, width: 2, height: 2 } },
				},
				shadedColorData: new Float32Array([
					1, 0.5, 0.25,
					0.25, 1, 0.5,
					0.5, 0.25, 1,
				]),
				shadedColorStride: 9,
				vertexColorData: new Float32Array([
					1, 0.5, 0.25,
					0.25, 1, 0.5,
					0.5, 0.25, 1,
				]),
				vertexColorItemSize: 3,
			},
			fb,
			undefined,
		);
		const pixels = collectNonBlackPixels(fb);
		expect(pixels.some((p) => p.r !== p.g || p.g !== p.b)).toBe(true);
	});

	it("uniform and near-uniform textured colors preserve colored-light parity", () => {
		const makeCall = (vertexColorData: Float32Array) => {
			const triangles = new TriangleBuffer(1);
			appendCenterTriangle(triangles, -1, 0, 0, 1, 0, 0, 1);
			triangles.vertexIndex.set([0, 1, 2]);
			triangles.buildSortOrder();
			return {
				triangles,
				material: {
					color: { r: 1, g: 1, b: 1 },
					map: {
						data: {
							data: new Uint8ClampedArray(16).fill(255),
							width: 2,
							height: 2,
						},
					},
				},
				shadedColorData: new Float32Array([
					1, 0, 0,
					1, 0, 0,
					1, 0, 0,
				]),
				shadedColorStride: 9,
				vertexColorData,
				vertexColorItemSize: 3,
			};
		};
		const uniformFb = makeRasterizerFixture().framebuffer;
		const nearUniformFb = makeRasterizerFixture().framebuffer;
		const rasterizer = makeRasterizerFixture().rasterizer;
		rasterizer.rasterize(
			makeCall(new Float32Array([1, 1, 1, 1, 1, 1, 1, 1, 1])),
			uniformFb,
			undefined,
		);
		rasterizer.rasterize(
			makeCall(new Float32Array([1, 1, 1, 1, 1, 1, 1, 1, 0.999])),
			nearUniformFb,
			undefined,
		);
		expect(Array.from(uniformFb.u32)).toEqual(Array.from(nearUniformFb.u32));
	});

	it("no shadedColorData and no material.color: all pixels are white (255,255,255)", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const tb = new TriangleBuffer(1);
		appendCenterTriangle(tb, -1);
		tb.buildSortOrder();
		const drawCall = { triangles: tb, material: {} };
		rasterizer.rasterize(drawCall, fb, undefined);
		const pixels = collectNonBlackPixels(fb);
		expect(pixels.length).toBeGreaterThan(0);
		for (const p of pixels) {
			expect(p.r).toBe(255);
			expect(p.g).toBe(255);
			expect(p.b).toBe(255);
		}
	});

	it("closer triangle (lower ndcZ) overwrites farther triangle at same screen position", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();

		const tbFar = new TriangleBuffer(1);
		appendCenterTriangle(tbFar, 0.5);
		tbFar.buildSortOrder();
		const farCall = {
			triangles: tbFar,
			material: { color: { r: 0, g: 0, b: 1 } },
		};

		const tbClose = new TriangleBuffer(1);
		appendCenterTriangle(tbClose, -0.5);
		tbClose.buildSortOrder();
		const closeCall = {
			triangles: tbClose,
			material: { color: { r: 1, g: 0, b: 0 } },
		};

		rasterizer.rasterize(farCall, fb, undefined);
		rasterizer.rasterize(closeCall, fb, undefined);

		const pixel = fb.getPixel(10, 7);
		expect(pixel.r).toBe(255);
		expect(pixel.b).toBe(0);
	});

	it("ndcZ=-1 (near plane): depth16=0 passes depth test on fresh framebuffer", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const tb = new TriangleBuffer(1);
		appendCenterTriangle(tb, -1);
		tb.buildSortOrder();
		rasterizer.rasterize(
			{ triangles: tb, material: { color: { r: 1, g: 1, b: 1 } } },
			fb,
			undefined,
		);
		expect(countNonBlackPixels(fb)).toBeGreaterThan(0);
	});

	it("ndcZ=1 (far plane): depth16=65535 equals initial depth buffer value and passes", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const tb = new TriangleBuffer(1);
		appendCenterTriangle(tb, 1);
		tb.buildSortOrder();
		rasterizer.rasterize(
			{ triangles: tb, material: { color: { r: 1, g: 1, b: 1 } } },
			fb,
			undefined,
		);
		expect(countNonBlackPixels(fb)).toBeGreaterThan(0);
	});

	it("depthTest=false lets a farther triangle overwrite an existing nearer pixel", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const near = new TriangleBuffer(1);
		const far = new TriangleBuffer(1);
		appendCenterTriangle(near, -1);
		appendCenterTriangle(far, 1);
		rasterizer.rasterize(
			{ triangles: near, material: { color: { r: 1, g: 0, b: 0 } } },
			fb,
			undefined,
		);
		rasterizer.rasterize(
			{
				triangles: far,
				material: { color: { r: 0, g: 0, b: 1 }, depthTest: false },
			},
			fb,
			undefined,
		);
		const pixel = fb.getPixel(10, 7);
		expect(pixel.b).toBe(255);
		expect(pixel.r).toBe(0);
	});

	it("depthWrite=false leaves depth buffer open for later farther triangles", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const near = new TriangleBuffer(1);
		const far = new TriangleBuffer(1);
		appendCenterTriangle(near, -1);
		appendCenterTriangle(far, 1);
		rasterizer.rasterize(
			{
				triangles: near,
				material: { color: { r: 1, g: 0, b: 0 }, depthWrite: false },
			},
			fb,
			undefined,
		);
		rasterizer.rasterize(
			{ triangles: far, material: { color: { r: 0, g: 0, b: 1 } } },
			fb,
			undefined,
		);
		const pixel = fb.getPixel(10, 7);
		expect(pixel.b).toBe(255);
		expect(pixel.r).toBe(0);
	});

	it("opacity only blends when transparent=true", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const base = new TriangleBuffer(1);
		const overlay = new TriangleBuffer(1);
		appendCenterTriangle(base, -1);
		appendCenterTriangle(overlay, -1);
		rasterizer.rasterize(
			{ triangles: base, material: { color: { r: 1, g: 0, b: 0 } } },
			fb,
			undefined,
		);
		rasterizer.rasterize(
			{
				triangles: overlay,
				material: { color: { r: 0, g: 0, b: 1 }, opacity: 4 },
			},
			fb,
			undefined,
		);
		const pixel = fb.getPixel(10, 7);
		expect(pixel.b).toBe(255);
		expect(pixel.r).toBe(0);
	});

	it("transparent=true blends and does not write depth by default", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const base = new TriangleBuffer(1);
		const transparent = new TriangleBuffer(1);
		const far = new TriangleBuffer(1);
		appendCenterTriangle(base, -0.5);
		appendCenterTriangle(transparent, -1);
		appendCenterTriangle(far, 0);
		rasterizer.rasterize(
			{ triangles: base, material: { color: { r: 1, g: 0, b: 0 } } },
			fb,
			undefined,
		);
		rasterizer.rasterize(
			{
				triangles: transparent,
				material: {
					color: { r: 0, g: 0, b: 1 },
					transparent: true,
					opacity: 4,
					depthWrite: false,
				},
			},
			fb,
			undefined,
		);
		const blended = fb.getPixel(10, 7);
		expect(blended.r).toBeGreaterThan(0);
		expect(blended.b).toBeGreaterThan(0);
		rasterizer.rasterize(
			{ triangles: far, material: { color: { r: 0, g: 1, b: 0 } } },
			fb,
			undefined,
		);
		const afterFar = fb.getPixel(10, 7);
		expect(afterFar.g).toBe(0);
	});

	it("textured triangle: pixels sampled from material.map rather than base color", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const tb = new TriangleBuffer(1);
		const texData = new Uint8ClampedArray([
			255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
		]);
		appendCenterTriangle(tb, -1, 0, 0, 1, 0, 0.5, 1);
		tb.buildSortOrder();
		const drawCall = {
			triangles: tb,
			material: { map: { data: { data: texData, width: 2, height: 2 } } },
		};
		rasterizer.rasterize(drawCall, fb, undefined);
		const pixels = collectNonBlackPixels(fb);
		expect(pixels.length).toBeGreaterThan(0);
		const unique = new Set(pixels.map((p) => `${p.r},${p.g},${p.b}`));
		expect(unique.size).toBeGreaterThan(1);
	});

	it("UV (0,0) at all vertices samples top-left texel (red)", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const tb = new TriangleBuffer(1);
		const texData = new Uint8ClampedArray([
			255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
		]);
		appendCenterTriangle(tb, -1, 0, 0, 0, 0, 0, 0);
		tb.buildSortOrder();
		const drawCall = {
			triangles: tb,
			material: { map: { data: { data: texData, width: 2, height: 2 } } },
		};
		rasterizer.rasterize(drawCall, fb, undefined);
		const pixels = collectNonBlackPixels(fb);
		expect(pixels.length).toBeGreaterThan(0);
		for (const p of pixels) {
			expect(p.r).toBe(255);
			expect(p.g).toBe(0);
			expect(p.b).toBe(0);
		}
	});

	it("UV (1,1) at all vertices samples bottom-right texel (white)", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const tb = new TriangleBuffer(1);
		const texData = new Uint8ClampedArray([
			255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
		]);
		appendCenterTriangle(tb, -1, 1, 1, 1, 1, 1, 1);
		tb.buildSortOrder();
		const drawCall = {
			triangles: tb,
			material: { map: { data: { data: texData, width: 2, height: 2 } } },
		};
		rasterizer.rasterize(drawCall, fb, undefined);
		const pixels = collectNonBlackPixels(fb);
		expect(pixels.length).toBeGreaterThan(0);
		for (const p of pixels) {
			expect(p.r).toBe(255);
			expect(p.g).toBe(255);
			expect(p.b).toBe(255);
		}
	});

	it("all textured paths use normalized texel-cell thresholds", () => {
		const texture = {
			data: new Uint8ClampedArray([
				1,
				0,
				0,
				255,
				2,
				0,
				0,
				255,
				3,
				0,
				0,
				255,
				4,
				0,
				0,
				255,
			]),
			width: 4,
			height: 1,
		};
		const samples = [
			[0.249999, 1],
			[0.25, 2],
			[0.499999, 2],
			[0.5, 3],
			[0.999999, 4],
		] as const;
		const modes: Array<{
			shadedColorData?: Float32Array;
			shadedColorStride?: number;
		}> = [
			{},
			{ shadedColorData: new Float32Array([1, 1, 1]), shadedColorStride: 3 },
			{
				shadedColorData: new Float32Array(9).fill(1),
				shadedColorStride: 9,
			},
		];

		for (const mode of modes) {
			for (const [u, expectedRed] of samples) {
				const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
				const tb = new TriangleBuffer(1);
				appendCenterTriangle(tb, -1, u, 0, u, 0, u, 0);
				tb.buildSortOrder();
				const drawCall: RasterDrawCall = {
					triangles: tb,
					material: { map: { data: texture } },
				};
				if (mode.shadedColorData && mode.shadedColorStride !== undefined) {
					drawCall.shadedColorData = mode.shadedColorData;
					drawCall.shadedColorStride = mode.shadedColorStride;
				}
				rasterizer.rasterize(drawCall, fb, undefined);
				expect(fb.getPixel(10, 7).r).toBe(expectedRed);
			}
		}
	});

	it("sortOrder controls which physical triangle is read at each iteration position", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const tb = new TriangleBuffer(2);
		// physical 0: ndcZ=-0.9 (farther), physical 1: ndcZ=-1 (closest)
		appendCenterTriangle(tb, -0.9);
		appendCenterTriangle(tb, -1);
		// sortOrder[0]=1 → iteration 0 reads physIdx 1 (ndcZ=-1, closest): green
		// sortOrder[1]=0 → iteration 1 reads physIdx 0 (ndcZ=-0.9, farther): red (blocked by depth)
		tb.sortOrder = new Uint32Array([1, 0]);
		tb.sortOrderActive = true;
		const drawCall = {
			triangles: tb,
			material: { color: { r: 1, g: 1, b: 1 } },
			// Flat stride 3: iter0=(0,1,0) green, iter1=(1,0,0) red
			shadedColorData: new Float32Array([0, 1, 0, 1, 0, 0]),
			shadedColorStride: 3,
		};
		rasterizer.rasterize(drawCall, fb, undefined);
		// Iteration 0 (physIdx 1, ndcZ=-1) wins depth; iteration 1 is farther and rejected
		const pixel = fb.getPixel(10, 7);
		expect(pixel.g).toBe(255);
		expect(pixel.r).toBe(0);
	});

	it("shadedColorData[i] matches sort iteration position, not physical triangle index", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const tb = new TriangleBuffer(2);
		appendCenterTriangle(tb, -1);
		appendCenterTriangle(tb, -0.9);
		// iteration 0 → physIdx 1 (ndcZ=-0.9), iteration 1 → physIdx 0 (ndcZ=-1, closest)
		tb.sortOrder = new Uint32Array([1, 0]);
		tb.sortOrderActive = true;
		const drawCall = {
			triangles: tb,
			material: { color: { r: 1, g: 1, b: 1 } },
			// Flat stride 3: iter0=(1,0,0) red, iter1=(0,0,1) blue
			shadedColorData: new Float32Array([1, 0, 0, 0, 0, 1]),
			shadedColorStride: 3,
		};
		rasterizer.rasterize(drawCall, fb, undefined);
		// physIdx 0 (ndcZ=-1) is closest and wins depth → shadedColorData[3..5]=blue applies
		const pixel = fb.getPixel(10, 7);
		expect(pixel.b).toBe(255);
		expect(pixel.r).toBe(0);
	});

	it("drawCall with triangles=undefined does not crash and writes no pixels", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		expect(() => {
			rasterizer.rasterize(
				{ triangles: undefined, material: {} } as unknown as RasterDrawCall,
				fb,
				undefined,
			);
		}).not.toThrow();
		expect(countNonBlackPixels(fb)).toBe(0);
	});

	it("empty drawCall with material color writes no pixels", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		rasterizer.rasterize(makeEmptyRasterDrawCall(), fb, undefined);
		expect(countNonBlackPixels(fb)).toBe(0);
	});

	it("UV repeat wrapping: UVs > 1 tile the texture instead of clamping", () => {
		const { rasterizer, framebuffer: fb } = makeRasterizerFixture();
		const tb = new TriangleBuffer(1);
		// 2x2 texture: red, green, blue, white
		const texData = new Uint8ClampedArray([
			255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
		]);
		// UVs span [0,2] x [0,2] - should tile 2x2
		appendCenterTriangle(tb, -1, 0, 0, 2, 0, 1, 2);
		tb.buildSortOrder();

		// With clamp (default) - UVs > 1 clamp to 1, so bottom-right texel dominates
		rasterizer.rasterize(
			{
				triangles: tb,
				material: { map: { data: { data: texData, width: 2, height: 2 } } },
			},
			fb,
			undefined,
		);
		const clampPixels = collectNonBlackPixels(fb);

		// With repeat wrapping - UVs > 1 wrap, producing varied colors
		const { framebuffer: fb2 } = makeRasterizerFixture();
		rasterizer.rasterize(
			{
				triangles: tb,
				material: {
					map: {
						data: { data: texData, width: 2, height: 2 },
						wrapS: 1,
						wrapT: 1,
					},
				},
			},
			fb2,
			undefined,
		);
		const repeatPixels = collectNonBlackPixels(fb2);

		expect(repeatPixels.length).toBeGreaterThan(0);
		// Repeat wrapping should produce more color variety than clamping
		const clampUnique = new Set(clampPixels.map((p) => `${p.r},${p.g},${p.b}`));
		const repeatUnique = new Set(
			repeatPixels.map((p) => `${p.r},${p.g},${p.b}`),
		);
		expect(repeatUnique.size).toBeGreaterThanOrEqual(clampUnique.size);
	});
});
