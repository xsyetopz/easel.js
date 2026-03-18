import { describe, expect, it } from "vitest";
import { DrawList } from "@/pipeline/DrawList.js";
import { PainterSort } from "@/pipeline/PainterSort.js";

function makeDrawCall(x, y, layer = 0) {
	return {
		centroid: { x, y, z: 0 },
		material: { layer },
		faceIndices: [],
		projectedVerts: [],
		mesh: {},
	};
}

describe("PainterSort", () => {
	const sorter = new PainterSort();
	const camera = { x: 0, y: 0 };

	it("sorts back-to-front by tile distance", () => {
		const list = new DrawList();
		const near = makeDrawCall(1, 0);
		const far = makeDrawCall(10, 0);
		list.add(near);
		list.add(far);
		sorter.sort(list, camera);
		expect(list.calls[0]).toBe(far);
		expect(list.calls[1]).toBe(near);
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
