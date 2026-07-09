import { describe, expect, it } from "bun:test";
import { Matrix4 } from "@/math/Matrix4.js";
import { Vector3 } from "@/math/Vector3.js";
import { WorldToView } from "@/pipeline/projection/WorldToView.js";

function makeIdentityCamera() {
	const m = new Matrix4();
	return { matrixWorldInverse: m };
}

describe("WorldToView", () => {
	const wtv = new WorldToView();

	it("identity camera: point is unchanged", () => {
		const cam = makeIdentityCamera();
		const input = [new Vector3(1, 2, 3)];
		const output: Vector3[] = [];
		wtv.transform(input, cam, output);
		expect(output[0].x).toBeCloseTo(1, 5);
		expect(output[0].y).toBeCloseTo(2, 5);
		expect(output[0].z).toBeCloseTo(3, 5);
	});

	it("populates output array with Vector3 instances", () => {
		const cam = makeIdentityCamera();
		const input = [new Vector3(0, 0, 0)];
		const output: Vector3[] = [];
		wtv.transform(input, cam, output);
		expect(output.length).toBe(1);
		expect(output[0]).toBeInstanceOf(Vector3);
	});

	it("translated camera shifts point", () => {
		const cam = makeIdentityCamera();
		cam.matrixWorldInverse.makeTranslation(5, 0, 0);
		const input = [new Vector3(0, 0, 0)];
		const output: Vector3[] = [];
		wtv.transform(input, cam, output);
		expect(output[0].x).toBeCloseTo(5, 5);
	});

	it("reuses existing output entries", () => {
		const cam = makeIdentityCamera();
		const input = [new Vector3(1, 2, 3)];
		const existing = new Vector3();
		const output = [existing];
		wtv.transform(input, cam, output);
		expect(output[0]).toBe(existing);
	});
});
