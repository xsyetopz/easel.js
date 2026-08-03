import { describe, expect, it } from "bun:test";
import { accumulateLights } from "@/pipeline/shading/lightAccumulator.js";

function makeDirectional(
  dx: number,
  dy: number,
  dz: number,
  color = { r: 1, g: 1, b: 1 },
  intensity = 1,
) {
  return {
    type: "directional",
    direction: { x: dx, y: dy, z: dz },
    color,
    intensity,
  };
}

function makeAmbient(intensity: number, color = { r: 1, g: 1, b: 1 }) {
  return { type: "ambient", color, intensity };
}

function makeHemisphere(
  dx: number,
  dy: number,
  dz: number,
  skyColor: { r: number; g: number; b: number },
  groundColor: { r: number; g: number; b: number },
  intensity = 1,
) {
  return {
    type: "hemisphere",
    direction: { x: dx, y: dy, z: dz },
    skyColor,
    groundColor,
    intensity,
  };
}

describe("accumulateLights", () => {
  it("directional light with dot > 0: full contribution clamped to 1", () => {
    // normal (0,0,-1), light dir (0,0,1): dot = 0*0+0*0+(-1)*(-1) = 1
    const out = { r: 0, g: 0, b: 0 };
    const result = accumulateLights(
      0,
      0,
      -1,
      [makeDirectional(0, 0, 1)],
      0.1,
      out,
    );
    // ambient 0.1 + directional 1.0 = 1.1 → clamped to 1.0
    expect(result.r).toBeCloseTo(1.0, 2);
    expect(result.g).toBeCloseTo(1.0, 2);
    expect(result.b).toBeCloseTo(1.0, 2);
  });

  it("directional light with dot <= 0: no directional contribution, ambient only", () => {
    // normal (0,0,1), light dir (0,0,1): dot = 0*0+0*0+1*(-1) = -1 → skipped
    const out = { r: 0, g: 0, b: 0 };
    const result = accumulateLights(
      0,
      0,
      1,
      [makeDirectional(0, 0, 1)],
      0.1,
      out,
    );
    expect(result.r).toBeCloseTo(0.1, 2);
    expect(result.g).toBeCloseTo(0.1, 2);
    expect(result.b).toBeCloseTo(0.1, 2);
  });

  it("ambient light: adds intensity on top of ambientIntensity param", () => {
    // ambient 0.1 + ambient light 0.5 = 0.6
    const out = { r: 0, g: 0, b: 0 };
    const result = accumulateLights(0, 0, -1, [makeAmbient(0.5)], 0.1, out);
    expect(result.r).toBeCloseTo(0.6, 2);
    expect(result.g).toBeCloseTo(0.6, 2);
    expect(result.b).toBeCloseTo(0.6, 2);
  });

  it("hemisphere light: normal aligned with direction uses sky color entirely", () => {
    // normal (0,1,0), dir (0,1,0): dot=1, blend=1.0 → pure sky
    const sky = { r: 1, g: 1, b: 1 };
    const ground = { r: 0, g: 0, b: 0 };
    const out = { r: 0, g: 0, b: 0 };
    // ambient 0.1 + hemisphere 1.0 = 1.1 → clamped to 1.0
    const result = accumulateLights(
      0,
      1,
      0,
      [makeHemisphere(0, 1, 0, sky, ground, 1.0)],
      0.1,
      out,
    );
    expect(result.r).toBeCloseTo(1.0, 2);
    expect(result.g).toBeCloseTo(1.0, 2);
    expect(result.b).toBeCloseTo(1.0, 2);
  });

  it("multiple lights accumulate additively", () => {
    const out = { r: 0, g: 0, b: 0 };
    // Two ambient lights at 0.2 each + ambient 0.0 = 0.4
    const result = accumulateLights(
      0,
      0,
      -1,
      [makeAmbient(0.2), makeAmbient(0.2)],
      0,
      out,
    );
    expect(result.r).toBeCloseTo(0.4, 2);
  });

  it("clamping: two full directional lights clamp to 1.0", () => {
    const out = { r: 0, g: 0, b: 0 };
    const result = accumulateLights(
      0,
      0,
      -1,
      [
        makeDirectional(0, 0, 1, { r: 1, g: 1, b: 1 }, 1),
        makeDirectional(0, 0, 1, { r: 1, g: 1, b: 1 }, 1),
      ],
      0,
      out,
    );
    expect(result.r).toBeCloseTo(1.0, 2);
    expect(result.g).toBeCloseTo(1.0, 2);
    expect(result.b).toBeCloseTo(1.0, 2);
  });

  it("colored light: red-only directional only illuminates r channel", () => {
    const out = { r: 0, g: 0, b: 0 };
    // normal (0,0,-1) facing directional (0,0,1): dot=1
    const result = accumulateLights(
      0,
      0,
      -1,
      [makeDirectional(0, 0, 1, { r: 1, g: 0, b: 0 })],
      0.1,
      out,
    );
    expect(result.r).toBeGreaterThan(0.5);
    expect(result.g).toBeCloseTo(0.1, 2);
    expect(result.b).toBeCloseTo(0.1, 2);
  });

  it("non-object color fallback: numeric color defaults to (1,1,1)", () => {
    const out = { r: 0, g: 0, b: 0 };
    const light = { type: "ambient", color: 0xffffff, intensity: 0.3 };
    const result = accumulateLights(0, 0, -1, [light], 0.1, out);
    // cr=cg=cb=1, so contribution = 1*0.3 = 0.3; total = 0.1+0.3 = 0.4
    expect(result.r).toBeCloseTo(0.4, 2);
    expect(result.g).toBeCloseTo(0.4, 2);
    expect(result.b).toBeCloseTo(0.4, 2);
  });

  it("out parameter is mutated and returned as the same reference", () => {
    const out = { r: 0, g: 0, b: 0 };
    const ret = accumulateLights(0, 0, -1, [], 0.2, out);
    expect(ret).toBe(out);
    expect(out.r).toBeCloseTo(0.2, 2);
  });

  it("zero lights: returns ambient intensity only", () => {
    const out = { r: 0, g: 0, b: 0 };
    const result = accumulateLights(0, 0, -1, [], 0.3, out);
    expect(result.r).toBeCloseTo(0.3, 2);
    expect(result.g).toBeCloseTo(0.3, 2);
    expect(result.b).toBeCloseTo(0.3, 2);
  });
});
