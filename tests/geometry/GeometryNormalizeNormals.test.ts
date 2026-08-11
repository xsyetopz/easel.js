import { describe, expect, it } from "bun:test";
import {
	Geometry,
	registerGeometryCacheInvalidator,
	unregisterGeometryCacheInvalidator,
} from "@/geometry/Geometry.js";

describe("Geometry.normalizeNormals", () => {
	it("normalizes existing normals and preserves finite zero normals", () => {
		const geometry = new Geometry().setNormals([
			3, 0, 0,
			0, 0, 0,
			0, 4, 0,
		]);
		const normal = geometry.getAttribute("normal");

		expect(geometry.normalizeNormals()).toBe(geometry);
		expect(normal?.getX(0)).toBeCloseTo(1);
		expect(normal?.getY(0)).toBeCloseTo(0);
		expect(normal?.getZ(0)).toBeCloseTo(0);
		expect(normal?.getX(1)).toBe(0);
		expect(normal?.getY(1)).toBe(0);
		expect(normal?.getZ(1)).toBe(0);
		expect(normal?.getX(2)).toBeCloseTo(0);
		expect(normal?.getY(2)).toBeCloseTo(1);
		expect(normal?.getZ(2)).toBeCloseTo(0);
	});

	it("publishes the normal update and invalidates geometry caches", () => {
		const geometry = new Geometry().setNormals([2, 0, 0]);
		const normal = geometry.getAttribute("normal");
		let invalidations = 0;
		const invalidator = (): void => {
			invalidations++;
		};
		registerGeometryCacheInvalidator(geometry, invalidator);

		try {
			geometry.normalizeNormals();

			expect(normal?.needsUpdate).toBe(true);
			expect(invalidations).toBe(1);
		} finally {
			unregisterGeometryCacheInvalidator(geometry, invalidator);
		}
	});

	it("returns this without publishing when normals are absent", () => {
		const geometry = new Geometry();

		expect(geometry.normalizeNormals()).toBe(geometry);
	});
});
