import { expect, it } from "bun:test";
import { defined } from "./defined.js";
import "./assertions.js";

type VectorLike = Partial<Record<"x" | "y" | "z" | "w", number>>;

type CurveLike = {
	getPoint(t: number): VectorLike | undefined;
	getLength(): number;
	getPoints(divisions: number): unknown[];
};

type CurveParityOptions = {
	samples?: readonly number[];
	pointEpsilon?: number;
	lengthEpsilon?: number;
	pointsDivisions?: number | false;
};

const defaultSamples = [0, 0.25, 0.5, 0.75, 1.0] as const;

export function expectCurveParity(
	easelCurve: CurveLike,
	threeCurve: CurveLike,
	options: CurveParityOptions = {},
): void {
	const samples = options.samples ?? defaultSamples;
	const pointEpsilon = options.pointEpsilon ?? 1e-6;
	const lengthEpsilon = options.lengthEpsilon ?? 1e-4;
	const pointsDivisions = options.pointsDivisions ?? 10;

	for (const sample of samples) {
		it(`getPoint(${sample}) matches`, () => {
			expect(easelCurve.getPoint(sample)).toMatchVector(
				defined(threeCurve.getPoint(sample), "three point"),
				pointEpsilon,
			);
		});
	}

	it("getLength matches", () => {
		expect(
			Math.abs(easelCurve.getLength() - threeCurve.getLength()),
		).toBeLessThan(lengthEpsilon);
	});

	if (pointsDivisions !== false) {
		it(`getPoints(${pointsDivisions}) count matches`, () => {
			expect(easelCurve.getPoints(pointsDivisions).length).toBe(
				threeCurve.getPoints(pointsDivisions).length,
			);
		});
	}
}
