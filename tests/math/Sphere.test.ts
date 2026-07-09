import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.js";
import { Sphere as TSphere, Vector3 as TVector3 } from "three";
import { Sphere } from "@/math/Sphere.js";
import { Vector3 } from "@/math/Vector3.js";

describe("Sphere", () => {
	it("constructor defaults", () => {
		const e = new Sphere();
		// easel: centre, THREE: center
		expect(e.centre.x).toBe(0);
		expect(e.centre.y).toBe(0);
		expect(e.centre.z).toBe(0);
		expect(e.radius).toBe(1);
	});

	it("set via properties", () => {
		const e = new Sphere();
		e.centre = new Vector3(1, 2, 3);
		e.radius = 5;
		expect(e.centre).toMatchVector({ x: 1, y: 2, z: 3 });
		expect(e.radius).toBe(5);
	});

	it("containsPoint inside", () => {
		const e = new Sphere(new Vector3(0, 0, 0), 5);
		expect(e.containsPoint(new Vector3(1, 1, 1))).toBe(true);
		expect(e.containsPoint(new Vector3(10, 0, 0))).toBe(false);
	});

	it("intersectsSphere overlapping", () => {
		const a = new Sphere(new Vector3(0, 0, 0), 2);
		const b = new Sphere(new Vector3(1, 0, 0), 2);
		const c = new Sphere(new Vector3(10, 0, 0), 1);
		expect(a.intersectsSphere(b)).toBe(true);
		expect(a.intersectsSphere(c)).toBe(false);
	});

	it("distanceToPoint", () => {
		const e = new Sphere(new Vector3(0, 0, 0), 1);
		const t = new TSphere(new TVector3(0, 0, 0), 1);
		const ep = new Vector3(3, 0, 0);
		const tp = new TVector3(3, 0, 0);
		expect(e.distanceToPoint(ep)).toBeCloseTo(t.distanceToPoint(tp));
	});

	it("clone", () => {
		const orig = new Sphere(new Vector3(1, 2, 3), 4);
		const c = orig.clone();
		expect(c.centre).toMatchVector({ x: 1, y: 2, z: 3 });
		expect(c.radius).toBe(4);
		c.centre = new Vector3(9, 9, 9);
		c.radius = 9;
		expect(orig.radius).toBe(4);
	});

	it("equals", () => {
		const a = new Sphere(new Vector3(1, 2, 3), 4);
		const b = new Sphere(new Vector3(1, 2, 3), 4);
		expect(a.equals(b)).toBe(true);
	});
});
