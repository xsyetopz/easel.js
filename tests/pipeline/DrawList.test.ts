import { describe, expect, it } from "vitest";
import type { DrawCall } from "@/pipeline/DrawCall.js";
import { DrawList } from "@/pipeline/DrawList.js";

function makeDC(id) {
	return { id, centroid: { x: 0, y: 0, z: 0 }, material: {} };
}

describe("DrawList", () => {
	it("starts empty", () => {
		const list = new DrawList();
		expect(list.length).toBe(0);
	});

	it("add increases length", () => {
		const list = new DrawList();
		list.add(makeDC(1));
		expect(list.length).toBe(1);
	});

	it("add stores draw calls accessible via calls", () => {
		const list = new DrawList();
		const dc = makeDC(42);
		list.add(dc);
		expect(list.calls[0]).toBe(dc);
	});

	it("clear resets length to 0", () => {
		const list = new DrawList();
		list.add(makeDC(1));
		list.add(makeDC(2));
		list.clear();
		expect(list.length).toBe(0);
	});

	it("is iterable via for...of", () => {
		const list = new DrawList();
		list.add(makeDC(1));
		list.add(makeDC(2));
		const collected: DrawCall[] = [];
		for (const dc of list) collected.push(dc);
		expect(collected.length).toBe(2);
	});

	it("multiple adds maintain insertion order", () => {
		const list = new DrawList();
		const a = makeDC("a");
		const b = makeDC("b");
		const c = makeDC("c");
		list.add(a);
		list.add(b);
		list.add(c);
		expect(list.calls[0]).toBe(a);
		expect(list.calls[2]).toBe(c);
	});
});
