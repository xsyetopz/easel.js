import { describe, expect, it } from "vitest";
import "../_helpers/assertions.js";
import { Plane as TPlane, Vector3 as TVector3 } from "three";
import { Plane } from "@/math/Plane.js";
import { Vector3 } from "@/math/Vector3.js";

describe("Plane", () => {
	it("constructor defaults", () => {
		const e = new Plane();
		const t = new TPlane();
		expect(e.normal).toMatchVector(t.normal);
		expect(e.constant).toBe(t.constant);
	});

	it("set via constructor", () => {
		const e = new Plane(new Vector3(0, 1, 0), -3);
		expect(e.normal).toMatchVector({ x: 0, y: 1, z: 0 });
		expect(e.constant).toBeCloseTo(-3);
	});

	it("setFromNormalAndCoplanarPoint", () => {
		const normal = new Vector3(0, 1, 0);
		const point = new Vector3(0, 5, 0);
		const e = new Plane().setFromNormalAndCoplanarPoint(normal, point);
		const t = new TPlane().setFromNormalAndCoplanarPoint(
			new TVector3(0, 1, 0),
			new TVector3(0, 5, 0),
		);
		expect(e.normal).toMatchVector(t.normal);
		expect(e.constant).toBeCloseTo(t.constant);
	});

	it("distanceToPoint", () => {
		const e = new Plane(new Vector3(0, 1, 0), -2);
		const t = new TPlane(new TVector3(0, 1, 0), -2);
		const ep = new Vector3(0, 5, 0);
		const tp = new TVector3(0, 5, 0);
		expect(e.distanceToPoint(ep)).toBeCloseTo(t.distanceToPoint(tp));
	});

	it("projectPoint", () => {
		const e = new Plane(new Vector3(0, 1, 0), 0);
		const t = new TPlane(new TVector3(0, 1, 0), 0);
		const ep = e.projectPoint(new Vector3(3, 5, 2), new Vector3());
		const tp = t.projectPoint(new TVector3(3, 5, 2), new TVector3());
		expect(ep).toMatchVector(tp);
	});

	it("intersectLine", () => {
		const e = new Plane(new Vector3(0, 1, 0), 0);
		const lineStart = new Vector3(0, -1, 0);
		const lineEnd = new Vector3(0, 1, 0);
		const ep = e.intersectLine(
			{ start: lineStart, end: lineEnd },
			new Vector3(),
		);
		// line goes from y=-1 to y=1, plane is y=0, should intersect at origin
		expect(ep).not.toBeNull();
		expect(ep).toMatchVector({ x: 0, y: 0, z: 0 });
	});

	it("clone", () => {
		const orig = new Plane(new Vector3(1, 0, 0), -5);
		const c = orig.clone();
		expect(c.normal).toMatchVector({ x: 1, y: 0, z: 0 });
		expect(c.constant).toBe(-5);
	});

	it("equals", () => {
		const a = new Plane(new Vector3(0, 1, 0), -2);
		const b = new Plane(new Vector3(0, 1, 0), -2);
		expect(a.equals(b)).toBe(true);
	});
});
