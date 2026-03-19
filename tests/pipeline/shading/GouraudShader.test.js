import { describe, expect, it } from "vitest";
import { GouraudShader } from "@/pipeline/shading/GouraudShader.js";

const shader = new GouraudShader();

function makeLight(dx, dy, dz, intensity = 1) {
	return {
		type: "directional",
		direction: { x: dx, y: dy, z: dz },
		color: { r: 1, g: 1, b: 1 },
		intensity,
	};
}

describe("GouraudShader", () => {
	it("vertex normal directly toward light returns high intensity", () => {
		const result = shader.shade(0, 0, -1, [makeLight(0, 0, 1)], 0.1);
		expect(result.r).toBeGreaterThan(0.9);
		expect(result.g).toBeGreaterThan(0.9);
		expect(result.b).toBeGreaterThan(0.9);
	});

	it("vertex normal perpendicular to light returns ambient only", () => {
		const result = shader.shade(1, 0, 0, [makeLight(0, 0, 1)], 0.1);
		expect(result.r).toBeCloseTo(0.1, 2);
		expect(result.g).toBeCloseTo(0.1, 2);
		expect(result.b).toBeCloseTo(0.1, 2);
	});

	it("vertex normal away from light returns ambient only", () => {
		const result = shader.shade(0, 0, 1, [makeLight(0, 0, 1)], 0.1);
		expect(result.r).toBeCloseTo(0.1, 2);
		expect(result.g).toBeCloseTo(0.1, 2);
		expect(result.b).toBeCloseTo(0.1, 2);
	});

	it("returns an object with r, g, b channels in [0, 1]", () => {
		const result = shader.shade(0, 0, -1, [makeLight(0, 0, 1)], 0.1);
		expect(typeof result).toBe("object");
		expect(result.r).toBeGreaterThanOrEqual(0);
		expect(result.r).toBeLessThanOrEqual(1);
		expect(result.g).toBeGreaterThanOrEqual(0);
		expect(result.g).toBeLessThanOrEqual(1);
		expect(result.b).toBeGreaterThanOrEqual(0);
		expect(result.b).toBeLessThanOrEqual(1);
	});

	it("no lights returns ambient intensity", () => {
		const result = shader.shade(0, 0, -1, [], 0.3);
		expect(result.r).toBeCloseTo(0.3, 2);
		expect(result.g).toBeCloseTo(0.3, 2);
		expect(result.b).toBeCloseTo(0.3, 2);
	});
});
