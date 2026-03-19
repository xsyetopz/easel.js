import { describe, expect, it } from "vitest";
import { FlatShader } from "@/pipeline/shading/FlatShader.js";

const shader = new FlatShader();

function makeLight(dx, dy, dz, intensity = 1) {
	return {
		type: "directional",
		direction: { x: dx, y: dy, z: dz },
		color: { r: 1, g: 1, b: 1 },
		intensity,
	};
}

describe("FlatShader", () => {
	it("face normal directly toward light returns high intensity", () => {
		const result = shader.shade(
			{ x: 0, y: 0, z: -1 },
			[makeLight(0, 0, 1)],
			0.1,
		);
		expect(result.r).toBeGreaterThan(0.9);
		expect(result.g).toBeGreaterThan(0.9);
		expect(result.b).toBeGreaterThan(0.9);
	});

	it("face normal perpendicular to light returns ambient only", () => {
		const result = shader.shade(
			{ x: 1, y: 0, z: 0 },
			[makeLight(0, 0, 1)],
			0.1,
		);
		expect(result.r).toBeCloseTo(0.1, 2);
		expect(result.g).toBeCloseTo(0.1, 2);
		expect(result.b).toBeCloseTo(0.1, 2);
	});

	it("face normal away from light returns ambient only", () => {
		const result = shader.shade(
			{ x: 0, y: 0, z: 1 },
			[makeLight(0, 0, 1)],
			0.1,
		);
		expect(result.r).toBeCloseTo(0.1, 2);
		expect(result.g).toBeCloseTo(0.1, 2);
		expect(result.b).toBeCloseTo(0.1, 2);
	});

	it("returns an object with r, g, b channels", () => {
		const result = shader.shade(
			{ x: 0, y: 0, z: -1 },
			[makeLight(0, 0, 1)],
			0.1,
		);
		expect(typeof result).toBe("object");
		expect(typeof result.r).toBe("number");
		expect(typeof result.g).toBe("number");
		expect(typeof result.b).toBe("number");
	});

	it("no lights returns ambient intensity", () => {
		const result = shader.shade({ x: 0, y: 0, z: -1 }, [], 0.2);
		expect(result.r).toBeCloseTo(0.2, 2);
		expect(result.g).toBeCloseTo(0.2, 2);
		expect(result.b).toBeCloseTo(0.2, 2);
	});
});
