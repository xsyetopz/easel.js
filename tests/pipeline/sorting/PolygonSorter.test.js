import { describe, expect, it } from "vitest";
import { PolygonSorter } from "@/pipeline/sorting/PolygonSorter.js";
import { TriangleBuffer } from "@/pipeline/TriangleBuffer.js";

// sx0,sy0,sx1,sy1,sx2,sy2, z0,z1,z2, fnx,fny,fnz, vn0x,vn0y,vn0z, vn1x,vn1y,vn1z, vn2x,vn2y,vn2z, u0,v0,u1,v1,u2,v2
function makeTri(z) {
	return [
		0,
		0,
		1,
		0,
		0,
		1,
		z,
		z,
		z,
		0,
		0,
		-1,
		0,
		0,
		-1,
		0,
		0,
		-1,
		0,
		0,
		-1,
		0,
		0,
		0,
		0,
		0,
		0,
	];
}

function makeDrawCall(zValues) {
	const tb = new TriangleBuffer(zValues.length || 1);
	for (const z of zValues) {
		tb.append(...makeTri(z));
	}
	tb.buildSortOrder();
	return { triangles: tb };
}

describe("PolygonSorter", () => {
	const sorter = new PolygonSorter();

	it("3 triangles: sortOrder is back-to-front by centroidZ descending", () => {
		// centroidZ: tri0=0.1(near), tri1=0.5(mid), tri2=0.9(far)
		const dc = makeDrawCall([0.1, 0.5, 0.9]);
		sorter.sort(dc);
		// After sort descending: sortOrder[0] should be index of farthest (tri2=0.9)
		expect(dc.triangles.sortOrder[0]).toBe(2);
		expect(dc.triangles.sortOrder[1]).toBe(1);
		expect(dc.triangles.sortOrder[2]).toBe(0);
	});

	it("single triangle: no-op, sortOrder remains identity [0]", () => {
		const dc = makeDrawCall([0.5]);
		// length < 2 → early return, sortOrder is identity from buildSortOrder
		sorter.sort(dc);
		expect(dc.triangles.sortOrder[0]).toBe(0);
		expect(dc.triangles.sortOrder).toHaveLength(1);
	});

	it("empty buffer (length=0): no-op, does not throw", () => {
		const tb = new TriangleBuffer(4);
		// length stays 0, no append
		const dc = { triangles: tb };
		expect(() => sorter.sort(dc)).not.toThrow();
	});

	it("equal centroidZ values: sortOrder contains all triangle indices", () => {
		const dc = makeDrawCall([0.5, 0.5, 0.5]);
		sorter.sort(dc);
		const sorted = [...dc.triangles.sortOrder].sort((a, b) => a - b);
		expect(sorted).toEqual([0, 1, 2]);
	});

	it("sort updates sortOrder but does not mutate screenX typed array data", () => {
		// tri0 screenX[0]=10, tri1 screenX[0]=20, tri2 screenX[0]=30
		const tb = new TriangleBuffer(3);
		// append with distinct screenX so we can verify physical data is intact
		// z=0.9 → tri0 is farthest
		tb.append(
			10,
			0,
			11,
			0,
			12,
			0,
			0.9,
			0.9,
			0.9,
			0,
			0,
			-1,
			0,
			0,
			-1,
			0,
			0,
			-1,
			0,
			0,
			-1,
			0,
			0,
			0,
			0,
			0,
			0,
		);
		// z=0.5 → tri1 is mid
		tb.append(
			20,
			0,
			21,
			0,
			22,
			0,
			0.5,
			0.5,
			0.5,
			0,
			0,
			-1,
			0,
			0,
			-1,
			0,
			0,
			-1,
			0,
			0,
			-1,
			0,
			0,
			0,
			0,
			0,
			0,
		);
		// z=0.1 → tri2 is nearest
		tb.append(
			30,
			0,
			31,
			0,
			32,
			0,
			0.1,
			0.1,
			0.1,
			0,
			0,
			-1,
			0,
			0,
			-1,
			0,
			0,
			-1,
			0,
			0,
			-1,
			0,
			0,
			0,
			0,
			0,
			0,
		);
		tb.buildSortOrder();

		const dc = { triangles: tb };
		sorter.sort(dc);

		// sortOrder reordered to [0, 1, 2] (farthest first)
		expect(tb.sortOrder[0]).toBe(0);
		// physical screenX at index 0 (first vertex of tri0) must still be 10
		expect(tb.screenX[0]).toBe(10);
		// physical screenX at index 3 (first vertex of tri1) must still be 20
		expect(tb.screenX[3]).toBe(20);
	});
});
