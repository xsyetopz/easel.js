import { describe, expect, it } from "bun:test";
import { FlatShader } from "@/pipeline/shading/FlatShader.js";

const shader = new FlatShader();

function makeLight(dx: number, dy: number, dz: number, intensity = 1) {
	return {
		type: "directional",
		direction: { x: dx, y: dy, z: dz },
		color: { r: 1, g: 1, b: 1 },
		intensity,
	};
}

describe("FlatShader", () => {
	it("face normal directly toward light returns high intensity", () => {
		const result = shader.shade(0, 0, -1, [makeLight(0, 0, 1)], 0.1);
		expect(result.r).toBeGreaterThan(0.9);
		expect(result.g).toBeGreaterThan(0.9);
		expect(result.b).toBeGreaterThan(0.9);
	});

	it("face normal perpendicular to light returns ambient only", () => {
		const result = shader.shade(1, 0, 0, [makeLight(0, 0, 1)], 0.1);
		expect(result.r).toBeCloseTo(0.1, 2);
		expect(result.g).toBeCloseTo(0.1, 2);
		expect(result.b).toBeCloseTo(0.1, 2);
	});

	it("face normal away from light returns ambient only", () => {
		const result = shader.shade(0, 0, 1, [makeLight(0, 0, 1)], 0.1);
		expect(result.r).toBeCloseTo(0.1, 2);
		expect(result.g).toBeCloseTo(0.1, 2);
		expect(result.b).toBeCloseTo(0.1, 2);
	});

	it("returns an object with r, g, b channels", () => {
		const result = shader.shade(0, 0, -1, [makeLight(0, 0, 1)], 0.1);
		expect(typeof result).toBe("object");
		expect(typeof result.r).toBe("number");
		expect(typeof result.g).toBe("number");
		expect(typeof result.b).toBe("number");
	});

	it("no lights returns ambient intensity", () => {
		const result = shader.shade(0, 0, -1, [], 0.2);
		expect(result.r).toBeCloseTo(0.2, 2);
		expect(result.g).toBeCloseTo(0.2, 2);
		expect(result.b).toBeCloseTo(0.2, 2);
	});

	it("ambient light adds its intensity on top of scene ambient", () => {
		const ambientLight = {
			type: "ambient",
			color: { r: 1, g: 1, b: 1 },
			intensity: 0.5,
		};
		// scene ambient 0.1 + light ambient 0.5 = 0.6
		const result = shader.shade(0, 0, -1, [ambientLight], 0.1);
		expect(result.r).toBeCloseTo(0.6, 2);
		expect(result.g).toBeCloseTo(0.6, 2);
		expect(result.b).toBeCloseTo(0.6, 2);
	});

	it("hemisphere light with up-facing normal blends toward sky color", () => {
		const hemiLight = {
			type: "hemisphere",
			skyColor: { r: 1, g: 1, b: 1 },
			groundColor: { r: 0, g: 0, b: 0 },
			direction: { x: 0, y: 1, z: 0 },
			intensity: 1.0,
		};
		// normal (0,1,0) · direction (0,1,0) = 1 → blend = 0.5 + 0.5*1 = 1.0 → pure sky
		// contribution = (0 + (1 - 0) * 1.0) * 1.0 = 1.0; plus scene ambient 0.1 → clamped to 1.0
		const result = shader.shade(0, 1, 0, [hemiLight], 0.1);
		expect(result.r).toBeCloseTo(1.0, 2);
		expect(result.g).toBeCloseTo(1.0, 2);
		expect(result.b).toBeCloseTo(1.0, 2);
	});

	it("colored directional light only illuminates matching channel", () => {
		const redLight = {
			type: "directional",
			direction: { x: 0, y: 0, z: 1 },
			color: { r: 1, g: 0, b: 0 },
			intensity: 1,
		};
		// normal (0,0,-1), light direction (0,0,1): dot = 0*0 + 0*0 + (-1)*(-1) = 1
		const result = shader.shade(0, 0, -1, [redLight], 0.1);
		expect(result.r).toBeGreaterThan(0.5);
		// g and b get no directional contribution - only scene ambient
		expect(result.g).toBeCloseTo(0.1, 2);
		expect(result.b).toBeCloseTo(0.1, 2);
	});

	it("directional plus ambient accumulate and clamp at 1.0", () => {
		const dirLight = makeLight(0, 0, 1, 1.0);
		const ambientLight = {
			type: "ambient",
			color: { r: 1, g: 1, b: 1 },
			intensity: 0.5,
		};
		// scene ambient 0.1 + directional 1.0 + ambient 0.5 = 1.6 → clamped to 1.0
		const result = shader.shade(0, 0, -1, [dirLight, ambientLight], 0.1);
		expect(result.r).toBeCloseTo(1.0, 2);
		expect(result.g).toBeCloseTo(1.0, 2);
		expect(result.b).toBeCloseTo(1.0, 2);
	});
});
