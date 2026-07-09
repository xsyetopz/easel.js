import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.js";
import { Cylindrical as TCylindrical } from "three";
import { Cylindrical } from "@/math/Cylindrical.js";

describe("Cylindrical", () => {
	it("constructor defaults match THREE", () => {
		const e = new Cylindrical();
		const t = new TCylindrical();
		expect(e.radius).toBe(t.radius);
		expect(e.theta).toBe(t.theta);
		expect(e.y).toBe(t.y);
	});

	it("constructor with args", () => {
		const e = new Cylindrical(2, Math.PI, 5);
		expect(e.radius).toBe(2);
		expect(e.theta).toBe(Math.PI);
		expect(e.y).toBe(5);
	});

	it("set", () => {
		const e = new Cylindrical().set(3, 1.5, 2);
		expect(e.radius).toBe(3);
		expect(e.theta).toBe(1.5);
		expect(e.y).toBe(2);
	});

	it("setFromVector3", () => {
		const e = new Cylindrical();
		e.setFromVector3({ x: 1, y: 2, z: 1 });
		const t = new TCylindrical();
		t.setFromVector3({ x: 1, y: 2, z: 1 });
		expect(e.radius).toBeCloseTo(t.radius);
		expect(e.theta).toBeCloseTo(t.theta);
		expect(e.y).toBeCloseTo(t.y);
	});

	it("clone", () => {
		const orig = new Cylindrical(5, 2, 3);
		const c = orig.clone();
		expect(c.radius).toBe(5);
		expect(c.theta).toBe(2);
		expect(c.y).toBe(3);
		c.set(1, 1, 1);
		expect(orig.radius).toBe(5);
	});
});
