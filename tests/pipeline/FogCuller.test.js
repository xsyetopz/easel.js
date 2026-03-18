import { describe, expect, it } from "vitest";
import { DrawList } from "@/pipeline/DrawList.js";
import { FogCuller } from "@/pipeline/FogCuller.js";

function makeDC(x, y) {
	return { centroid: { x, y, z: 0 }, material: {} };
}

function makeList(...positions) {
	const list = new DrawList();
	for (const [x, y] of positions) list.add(makeDC(x, y));
	return list;
}

describe("FogCuller", () => {
	const culler = new FogCuller();
	const camera = { x: 0, y: 0 };

	it("no fog: all draw calls pass", () => {
		const list = makeList([1, 0], [5, 0], [20, 0]);
		culler.cull(list, undefined, camera);
		expect(list.length).toBe(3);
	});

	it("no fog (undefined): all draw calls pass", () => {
		const list = makeList([1, 0], [10, 0]);
		culler.cull(list, undefined, camera);
		expect(list.length).toBe(2);
	});

	it("with fog: near draw calls pass", () => {
		const fog = { tiles: 5 };
		const list = makeList([1, 0], [2, 0]);
		culler.cull(list, fog, camera);
		expect(list.length).toBe(2);
	});

	it("with fog: far draw calls are culled", () => {
		const fog = { tiles: 3 };
		const list = makeList([1, 0], [10, 0]);
		culler.cull(list, fog, camera);
		expect(list.length).toBe(1);
		expect(list.calls[0].centroid.x).toBe(1);
	});

	it("returns the same DrawList instance", () => {
		const list = makeList([1, 0]);
		const result = culler.cull(list, undefined, camera);
		expect(result).toBe(list);
	});
});
