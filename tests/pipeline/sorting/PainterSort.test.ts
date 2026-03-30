import { describe, expect, it } from "vitest";
import { DrawList } from "@/pipeline/DrawList.js";
import { PainterSort } from "@/pipeline/PainterSort.js";

function makeDrawCall(x, y, layer = 0, opacity = 0) {
	return {
		centroid: { x, y, z: 0 },
		material: { layer, opacity },
		faceIndices: [],
		projectedVerts: [],
		mesh: {},
	};
}

describe("PainterSort", () => {
	const sorter = new PainterSort();
	const camera = { x: 0, y: 0 };

	it("does not reorder opaque-only draw calls by distance", () => {
		const list = new DrawList();
		const near = makeDrawCall(1, 0);
		const far = makeDrawCall(10, 0);
		list.add(far);
		list.add(near);
		sorter.sort(list, camera);
		expect(list.calls[0]).toBe(far);
		expect(list.calls[1]).toBe(near);
	});

	it("still sorts opaques front-to-back when transparents are present", () => {
		const list = new DrawList();
		const opaqueNear = makeDrawCall(1, 0, 0, 0);
		const opaqueFar = makeDrawCall(10, 0, 0, 0);
		const transparent = makeDrawCall(5, 0, 0, 4);
		list.add(opaqueFar);
		list.add(transparent);
		list.add(opaqueNear);
		sorter.sort(list, camera);
		// Opaques first and front-to-back among them.
		expect(list.calls[0]).toBe(opaqueNear);
		expect(list.calls[1]).toBe(opaqueFar);
		expect(list.calls[2]).toBe(transparent);
	});

	it("sorts transparent meshes back-to-front for correct blending", () => {
		const list = new DrawList();
		const near = makeDrawCall(1, 0, 0, 4);
		const far = makeDrawCall(10, 0, 0, 4);
		list.add(near);
		list.add(far);
		sorter.sort(list, camera);
		expect(list.calls[0]).toBe(far);
		expect(list.calls[1]).toBe(near);
	});

	it("renders opaques before transparents", () => {
		const list = new DrawList();
		const opaqueNear = makeDrawCall(1, 0, 0, 0);
		const transparentFar = makeDrawCall(10, 0, 0, 4);
		list.add(transparentFar);
		list.add(opaqueNear);
		sorter.sort(list, camera);
		expect(list.calls[0].material.opacity).toBe(0);
		expect(list.calls[1].material.opacity).toBe(4);
	});

	it("layer 1 appears after layer 0 at same distance", () => {
		const list = new DrawList();
		const bg = makeDrawCall(5, 0, 1);
		const fg = makeDrawCall(5, 0, 0);
		list.add(bg);
		list.add(fg);
		sorter.sort(list, camera);
		expect(list.calls[0].material.layer).toBe(0);
		expect(list.calls[1].material.layer).toBe(1);
	});

	it("does not throw on empty DrawList", () => {
		const list = new DrawList();
		expect(() => sorter.sort(list, camera)).not.toThrow();
	});

	it("single draw call remains unchanged", () => {
		const list = new DrawList();
		const dc = makeDrawCall(3, 3);
		list.add(dc);
		sorter.sort(list, camera);
		expect(list.calls[0]).toBe(dc);
	});
});
