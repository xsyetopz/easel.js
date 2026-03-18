import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { LatheGeometry } from "@/geometry/primitives/LatheGeometry.js";
import { Vector2 } from "@/math/Vector2.js";

const points = [new Vector2(0, -1), new Vector2(0.5, 0), new Vector2(0, 1)];
const threePoints = points.map((p) => new THREE.Vector2(p.x, p.y));

describe("LatheGeometry vs THREE.LatheGeometry", () => {
	it("default segments — vertex count matches", () => {
		expect(new LatheGeometry(points).getAttribute("position").count).toBe(
			new THREE.LatheGeometry(threePoints).getAttribute("position").count,
		);
	});

	it("default segments — index count matches", () => {
		expect(new LatheGeometry(points).index.length).toBe(
			new THREE.LatheGeometry(threePoints).getIndex().array.length,
		);
	});

	it("default segments — normals are unit length", () => {
		const normals = new LatheGeometry(points).getAttribute("normal").array;
		for (let i = 0; i < Math.min(normals.length, 30); i += 3) {
			const len = Math.sqrt(
				normals[i] ** 2 + normals[i + 1] ** 2 + normals[i + 2] ** 2,
			);
			expect(len).toBeCloseTo(1, 3);
		}
	});

	it("default segments — bounding box Y spans -1 to 1", () => {
		const pos = new LatheGeometry(points).getAttribute("position").array;
		let minY = Number.POSITIVE_INFINITY;
		let maxY = Number.NEGATIVE_INFINITY;
		for (let i = 1; i < pos.length; i += 3) {
			if (pos[i] < minY) minY = pos[i];
			if (pos[i] > maxY) maxY = pos[i];
		}
		expect(minY).toBeCloseTo(-1, 3);
		expect(maxY).toBeCloseTo(1, 3);
	});

	it("custom 6 segments — vertex count matches THREE", () => {
		expect(new LatheGeometry(points, 6).getAttribute("position").count).toBe(
			new THREE.LatheGeometry(threePoints, 6).getAttribute("position").count,
		);
	});
});
