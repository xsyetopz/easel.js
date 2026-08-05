import { expect, it } from "bun:test";
import { defined } from "./defined.js";
import "./assertions.js";

type VectorLike = Partial<Record<"x" | "y" | "z" | "w", number>>;

type EASELCurveLike = {
  getPoint(t: number): VectorLike | undefined;
  readonly length: number;
  getPoints(divisions: number): unknown[];
};

type THREECurveLike = {
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
  EASELCurve: EASELCurveLike,
  THREECurve: THREECurveLike,
  options: CurveParityOptions = {},
): void {
  const samples = options.samples ?? defaultSamples;
  const pointEpsilon = options.pointEpsilon ?? 1e-6;
  const lengthEpsilon = options.lengthEpsilon ?? 1e-4;
  const pointsDivisions = options.pointsDivisions ?? 10;

  for (const sample of samples) {
    it(`getPoint(${sample}) matches`, () => {
      expect(EASELCurve.getPoint(sample)).toMatchVector(
		defined(THREECurve.getPoint(sample), "THREE point"),
        pointEpsilon,
      );
    });
  }

  it("getLength matches", () => {
    expect(Math.abs(EASELCurve.length - THREECurve.getLength())).toBeLessThan(
      lengthEpsilon,
    );
  });

  if (pointsDivisions !== false) {
    it(`getPoints(${pointsDivisions}) count matches`, () => {
      expect(EASELCurve.getPoints(pointsDivisions).length).toBe(
        THREECurve.getPoints(pointsDivisions).length,
      );
    });
  }
}
