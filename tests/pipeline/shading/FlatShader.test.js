import { describe, expect, it } from "vitest";
import { Hsl16 } from "@/pipeline/color/Hsl16.js";
import { FlatShader } from "@/pipeline/shading/FlatShader.js";

const shader = new FlatShader();

function makeLight(dx, dy, dz, intensity = 1) {
	return { direction: { x: dx, y: dy, z: dz }, color: 0, intensity };
}

describe("FlatShader", () => {
	it("face normal directly toward light returns high intensity", () => {
		const result = shader.shade(
			{ x: 0, y: 0, z: -1 },
			[makeLight(0, 0, 1)],
			0.1,
		);
		const { l } = Hsl16.decode(result);
		expect(l).toBeGreaterThan(0.9);
	});

	it("face normal perpendicular to light returns ambient only", () => {
		const result = shader.shade(
			{ x: 1, y: 0, z: 0 },
			[makeLight(0, 0, 1)],
			0.1,
		);
		const { l } = Hsl16.decode(result);
		expect(l).toBeCloseTo(0.1, 2);
	});

	it("face normal away from light returns ambient only", () => {
		const result = shader.shade(
			{ x: 0, y: 0, z: 1 },
			[makeLight(0, 0, 1)],
			0.1,
		);
		const { l } = Hsl16.decode(result);
		expect(l).toBeCloseTo(0.1, 2);
	});

	it("returns a number (Hsl16 encoded)", () => {
		const result = shader.shade(
			{ x: 0, y: 0, z: -1 },
			[makeLight(0, 0, 1)],
			0.1,
		);
		expect(typeof result).toBe("number");
	});

	it("no lights returns ambient intensity", () => {
		const result = shader.shade({ x: 0, y: 0, z: -1 }, [], 0.2);
		const { l } = Hsl16.decode(result);
		expect(l).toBeCloseTo(0.2, 2);
	});
});
