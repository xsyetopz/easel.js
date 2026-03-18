import { describe, expect, it } from "vitest";
import { ViewToScreen } from "@/pipeline/projection/ViewToScreen.js";

function makeTarget() {
	const t = { x: 0, y: 0, z: 0 };
	t.set = (x, y, z) => {
		t.x = x;
		t.y = y;
		t.z = z;
		return t;
	};
	return t;
}

describe("ViewToScreen", () => {
	it("NDC (-1,-1) maps to (0, height-1)", () => {
		const vts = new ViewToScreen(100, 80);
		const t = makeTarget();
		vts.project(-1, -1, 0, t);
		expect(t.x).toBe(0);
		expect(t.y).toBe(79);
	});

	it("NDC (1,1) maps to (width-1, 0)", () => {
		const vts = new ViewToScreen(100, 80);
		const t = makeTarget();
		vts.project(1, 1, 0, t);
		expect(t.x).toBe(99);
		expect(t.y).toBe(0);
	});

	it("NDC (0,0) maps to screen center", () => {
		const vts = new ViewToScreen(100, 80);
		const t = makeTarget();
		vts.project(0, 0, 0, t);
		expect(t.x).toBe(50);
		expect(t.y).toBe(40);
	});

	it("setSize updates dimensions", () => {
		const vts = new ViewToScreen(100, 80);
		vts.setSize(200, 160);
		expect(vts.width).toBe(200);
		expect(vts.height).toBe(160);
	});

	it("setSize affects projection result", () => {
		const vts = new ViewToScreen(100, 80);
		vts.setSize(200, 160);
		const t = makeTarget();
		vts.project(1, 1, 0, t);
		expect(t.x).toBe(199);
		expect(t.y).toBe(0);
	});
});
