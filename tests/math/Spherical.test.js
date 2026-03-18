import { describe, expect, it } from "vitest";
import "../_helpers/assertions.js";
import { Spherical as TSpherical } from "three";
import { Spherical } from "@/math/Spherical.js";

describe("Spherical", () => {
	it("constructor defaults match THREE", () => {
		const e = new Spherical();
		const t = new TSpherical();
		expect(e.radius).toBe(t.radius);
		expect(e.phi).toBe(t.phi);
		expect(e.theta).toBe(t.theta);
	});

	it("constructor with args", () => {
		const e = new Spherical(2, Math.PI / 4, Math.PI / 2);
		expect(e.radius).toBe(2);
		expect(e.phi).toBeCloseTo(Math.PI / 4);
		expect(e.theta).toBeCloseTo(Math.PI / 2);
	});

	it("set", () => {
		const e = new Spherical().set(3, 1.0, 2.0);
		expect(e.radius).toBe(3);
		expect(e.phi).toBeCloseTo(1.0);
		expect(e.theta).toBeCloseTo(2.0);
	});

	it("setFromVector3", () => {
		const e = new Spherical();
		e.setFromVector3({ x: 1, y: 1, z: 1 });
		const t = new TSpherical();
		t.setFromVector3({ x: 1, y: 1, z: 1 });
		expect(e.radius).toBeCloseTo(t.radius);
		expect(e.phi).toBeCloseTo(t.phi);
		expect(e.theta).toBeCloseTo(t.theta);
	});

	it("makeSafe clamps phi", () => {
		const e = new Spherical(1, 0, 0);
		e.makeSafe();
		expect(e.phi).toBeGreaterThan(0);
	});

	it("clone", () => {
		const orig = new Spherical(5, 1, 2);
		const c = orig.clone();
		expect(c.radius).toBe(5);
		expect(c.phi).toBe(1);
		expect(c.theta).toBe(2);
		c.set(1, 0, 0);
		expect(orig.radius).toBe(5);
	});
});
