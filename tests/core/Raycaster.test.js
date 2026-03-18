import { describe, expect, it } from "vitest";
import { Raycaster } from "@/core/Raycaster.js";
import { Vector3 } from "@/math/Vector3.js";

describe("Raycaster", () => {
	it("constructs with default ray", () => {
		const rc = new Raycaster();
		expect(rc.ray).toBeDefined();
		expect(rc.near).toBe(0);
		expect(rc.far).toBe(Number.POSITIVE_INFINITY);
		expect(rc.camera).toBeundefined();
	});

	it("constructs with provided origin and direction", () => {
		const origin = new Vector3(1, 2, 3);
		const direction = new Vector3(0, 0, -1);
		const rc = new Raycaster(origin, direction);
		expect(rc.ray.origin.x).toBeCloseTo(1);
		expect(rc.ray.origin.z).toBeCloseTo(3);
		expect(rc.ray.direction.z).toBeCloseTo(-1);
	});

	it("set() updates origin and direction on ray", () => {
		const rc = new Raycaster();
		const origin = new Vector3(5, 0, 0);
		const direction = new Vector3(1, 0, 0);
		rc.set(origin, direction);
		expect(rc.ray.origin.x).toBeCloseTo(5);
		expect(rc.ray.direction.x).toBeCloseTo(1);
	});

	it("set() returns this (chainable)", () => {
		const rc = new Raycaster();
		const ret = rc.set(new Vector3(), new Vector3(0, 0, -1));
		expect(ret).toBe(rc);
	});

	it("intersectObject returns empty array for object with no geometry", () => {
		const rc = new Raycaster(new Vector3(0, 0, 5), new Vector3(0, 0, -1));
		const obj = {
			visible: true,
			type: "Mesh",
			geometry: undefined,
			layers: rc.layers,
			children: [],
			matrixWorld: {
				elements: new Float32Array([
					1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
				]),
			},
		};
		const result = rc.intersectObject(obj, false);
		expect(result).toEqual([]);
	});
});
