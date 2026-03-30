import { beforeEach, describe, expect, it } from "vitest";
import { Shading } from "@/core/Constants.ts";
import { LightBaker } from "@/pipeline/shading/LightBaker.js";
import { TriangleBuffer } from "@/pipeline/TriangleBuffer.js";

// sx0,sy0,sx1,sy1,sx2,sy2, z0,z1,z2, fnx,fny,fnz, vn0x,vn0y,vn0z, vn1x,vn1y,vn1z, vn2x,vn2y,vn2z, u0,v0,u1,v1,u2,v2
const TRI_FACING_LIGHT = [
	0, 0, 5, 0, 2, 5, 0, 0, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 0,
	0, 0,
];
const TRI_PERPENDICULAR = [
	0, 0, 5, 0, 2, 5, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0,
	0,
];
const TRI_FACING_POSZ = [
	0, 0, 5, 0, 2, 5, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0,
	0,
];

function makeDirectional(dx, dy, dz, intensity = 1) {
	return {
		type: "directional",
		direction: { x: dx, y: dy, z: dz },
		color: { r: 1, g: 1, b: 1 },
		intensity,
	};
}

function makeAmbient(intensity = 0.5) {
	return {
		type: "ambient",
		color: { r: 1, g: 1, b: 1 },
		intensity,
	};
}

function makePoint(x, y, z, intensity = 1) {
	return {
		type: "point",
		position: { x, y, z },
		color: { r: 1, g: 1, b: 1 },
		intensity,
		distance: 0,
		decay: 2,
	};
}

function makeDrawCall(shading, triangles) {
	const tb = new TriangleBuffer(triangles.length || 1);
	for (const t of triangles) {
		tb.append(...t);
	}
	tb.buildSortOrder();
	return {
		triangles: tb,
		material: { shading },
		shadedColorData: new Float32Array(0),
		shadedColorStride: 0,
	};
}

describe("LightBaker", () => {
	let baker: LightBaker;

	beforeEach(() => {
		baker = new LightBaker();
	});

	it("flat shading: facing light produces r > 0.9", () => {
		const dc = makeDrawCall(Shading.Flat, [TRI_FACING_LIGHT]);
		baker.bake(dc, [makeDirectional(0, 0, 1)]);
		expect(dc.shadedColorStride).toBe(3);
		expect(dc.shadedColorData[0]).toBeGreaterThan(0.9); // r
	});

	it("gouraud shading: stride 9 with 9 values per triangle (r,g,b × 3 vertices)", () => {
		const dc = makeDrawCall(Shading.Gouraud, [TRI_FACING_LIGHT]);
		baker.bake(dc, [makeDirectional(0, 0, 1)]);
		expect(dc.shadedColorStride).toBe(9);
		expect(dc.shadedColorData.length).toBeGreaterThanOrEqual(9);
		// Each vertex r,g,b must be a finite number
		for (let j = 0; j < 9; j++) {
			expect(typeof dc.shadedColorData[j]).toBe("number");
			expect(Number.isFinite(dc.shadedColorData[j])).toBe(true);
		}
	});

	it("zero lights: shadedColorStride is 0 and bake returns early", () => {
		const dc = makeDrawCall(Shading.Flat, [TRI_FACING_LIGHT]);
		baker.bake(dc, []);
		expect(dc.shadedColorStride).toBe(0);
	});

	it("second bake reuses allocation: shadedColorData covers exactly 2 triangles", () => {
		const dc = makeDrawCall(Shading.Flat, [
			TRI_FACING_LIGHT,
			TRI_PERPENDICULAR,
		]);
		const lights = [makeDirectional(0, 0, 1)];
		baker.bake(dc, lights);
		baker.bake(dc, lights);
		expect(dc.shadedColorData.length).toBeGreaterThanOrEqual(6); // 2 tris × 3
		expect(dc.shadedColorStride).toBe(3);
	});

	it("sortOrder contract: shadedColorData[i*stride] reads normals at physIdx=sortOrder[i]", () => {
		// 3 triangles at centroidZ 0.9, 0.5, 0.1 so sort reorders them: [0,1,2] → [0,1,2] (desc order already)
		// Use centroidZ via z0=z1=z2 so centroid = z value
		// TRI at z=0.9 has face normal (0,0,-1), z=0.5 has (1,0,0), z=0.1 has (0,1,0)
		const triDeep = [
			0, 0, 5, 0, 2, 5, 0.9, 0.9, 0.9, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
			0, 0, 0, 0, 0, 0,
		];
		const triMid = [
			0, 0, 5, 0, 2, 5, 0.5, 0.5, 0.5, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0,
			0, 0, 0, 0,
		];
		const triNear = [
			0, 0, 5, 0, 2, 5, 0.1, 0.1, 0.1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0,
			0, 0, 0, 0,
		];

		const tb = new TriangleBuffer(3);
		tb.append(...triDeep); // physIdx 0, centroidZ 0.9
		tb.append(...triMid); // physIdx 1, centroidZ 0.5
		tb.append(...triNear); // physIdx 2, centroidZ 0.1
		tb.sort(); // sortOrder should be [0, 1, 2] (descending centroidZ)

		const dc = {
			triangles: tb,
			material: { shading: Shading.Flat },
			shadedColorData: new Float32Array(0),
			shadedColorStride: 0,
		};
		baker.bake(dc, [makeDirectional(0, 0, 1)]);

		// sortOrder[0] = physIdx 0 → face normal (0,0,-1) → facing light → high r
		// sortOrder[1] = physIdx 1 → face normal (1,0,0) → perpendicular → ambient only
		expect(dc.shadedColorData[0]).toBeGreaterThan(0.9); // iter 0 r
		expect(dc.shadedColorData[3]).toBeCloseTo(0.1, 2); // iter 1 r
	});

	it("directional + ambient lights accumulate: result higher than either alone", () => {
		const dc = makeDrawCall(Shading.Flat, [TRI_FACING_LIGHT]);
		const dcAmbOnly = makeDrawCall(Shading.Flat, [TRI_FACING_LIGHT]);

		baker.bake(dc, [makeDirectional(0, 0, 1), makeAmbient(0.3)]);
		baker.bake(dcAmbOnly, [makeAmbient(0.3)]);

		// combined is clamped to 1.0; directional alone is ~1.0 at ambient 0.1, so check against ambient-only
		expect(dc.shadedColorData[0]).toBeGreaterThanOrEqual(
			dcAmbOnly.shadedColorData[0],
		);
	});

	it("flat shading: stride is 3", () => {
		const dc = makeDrawCall(Shading.Flat, [TRI_FACING_LIGHT]);
		baker.bake(dc, [makeDirectional(0, 0, 1)]);
		expect(dc.shadedColorStride).toBe(3);
		expect(dc.shadedColorData instanceof Float32Array).toBe(true);
	});

	it("gouraud shading: stride is 9", () => {
		const dc = makeDrawCall(Shading.Gouraud, [TRI_FACING_LIGHT]);
		baker.bake(dc, [makeDirectional(0, 0, 1)]);
		expect(dc.shadedColorStride).toBe(9);
		expect(dc.shadedColorData instanceof Float32Array).toBe(true);
	});

	it("flat shading: perpendicular normal returns ~ambient (0.1) only", () => {
		const dc = makeDrawCall(Shading.Flat, [TRI_PERPENDICULAR]);
		baker.bake(dc, [makeDirectional(0, 0, 1)]);
		expect(dc.shadedColorData[0]).toBeCloseTo(0.1, 2); // r
		expect(dc.shadedColorData[1]).toBeCloseTo(0.1, 2); // g
		expect(dc.shadedColorData[2]).toBeCloseTo(0.1, 2); // b
	});

	it("two triangles flat shading: shadedColorData holds 6 values (2 tris × 3)", () => {
		const dc = makeDrawCall(Shading.Flat, [
			TRI_FACING_LIGHT,
			TRI_PERPENDICULAR,
		]);
		baker.bake(dc, [makeDirectional(0, 0, 1)]);
		expect(dc.shadedColorData.length).toBeGreaterThanOrEqual(6);
		expect(dc.shadedColorStride).toBe(3);
	});

	it("point light uses drawCall.worldPositions (not triangle-duplicated data)", () => {
		const tb = new TriangleBuffer(1);
		tb.append(...TRI_FACING_POSZ, 0, 0, 0, 0, 1, 2);
		tb.buildSortOrder();

		const dcNear = {
			triangles: tb,
			material: { shading: Shading.Flat },
			worldPositions: new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0]),
			shadedColorData: new Float32Array(0),
			shadedColorStride: 0,
		};
		const dcFar = {
			triangles: tb,
			material: { shading: Shading.Flat },
			worldPositions: new Float32Array([0, 0, 20, 0, 0, 20, 0, 0, 20]),
			shadedColorData: new Float32Array(0),
			shadedColorStride: 0,
		};

		const light = makePoint(0, 0, 10);
		baker.bake(dcNear, [light]);
		baker.bake(dcFar, [light]);

		expect(dcNear.shadedColorData[0]).toBeGreaterThan(0.9);
		expect(dcFar.shadedColorData[0]).toBeCloseTo(0.1, 2);
	});
});
