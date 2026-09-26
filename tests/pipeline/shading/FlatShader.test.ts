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
  it("face normal directly toward light returns the light intensity", () => {
    const result = shader.shade(0, 0, -1, [makeLight(0, 0, 1)]);
    expect(result.r).toBeCloseTo(1, 6);
    expect(result.g).toBeCloseTo(1, 6);
    expect(result.b).toBeCloseTo(1, 6);
  });

  it("face normal perpendicular to light receives no light", () => {
    const result = shader.shade(1, 0, 0, [makeLight(0, 0, 1)]);
    expect(result.r).toBe(0);
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
  });

  it("face normal away from light receives no light", () => {
    const result = shader.shade(0, 0, 1, [makeLight(0, 0, 1)]);
    expect(result.r).toBe(0);
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
  });

  it("returns an object with r, g, b channels", () => {
    const result = shader.shade(0, 0, -1, [makeLight(0, 0, 1)]);
    expect(typeof result).toBe("object");
    expect(typeof result.r).toBe("number");
    expect(typeof result.g).toBe("number");
    expect(typeof result.b).toBe("number");
  });

  it("no lights returns black, with no ambient floor", () => {
    const result = shader.shade(0, 0, -1, []);
    expect(result.r).toBe(0);
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
  });

  it("ambient light adds its intensity", () => {
    const ambientLight = {
      type: "ambient",
      color: { r: 1, g: 1, b: 1 },
      intensity: 0.5,
    };
    const result = shader.shade(0, 0, -1, [ambientLight]);
    expect(result.r).toBeCloseTo(0.5, 6);
    expect(result.g).toBeCloseTo(0.5, 6);
    expect(result.b).toBeCloseTo(0.5, 6);
  });

  it("hemisphere light with up-facing normal uses the sky color", () => {
    const hemiLight = {
      type: "hemisphere",
      skyColor: { r: 1, g: 1, b: 1 },
      groundColor: { r: 0, g: 0, b: 0 },
      direction: { x: 0, y: 1, z: 0 },
      intensity: 1.0,
    };
    // normal (0,1,0) and direction (0,1,0): weight 0.5 + 0.5 * 1 = 1 → sky.
    const result = shader.shade(0, 1, 0, [hemiLight]);
    expect(result.r).toBeCloseTo(1.0, 6);
    expect(result.g).toBeCloseTo(1.0, 6);
    expect(result.b).toBeCloseTo(1.0, 6);
  });

  it("colored directional light only illuminates matching channel", () => {
    const redLight = {
      type: "directional",
      direction: { x: 0, y: 0, z: 1 },
      color: { r: 1, g: 0, b: 0 },
      intensity: 1,
    };
    const result = shader.shade(0, 0, -1, [redLight]);
    expect(result.r).toBeCloseTo(1, 6);
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
  });

  it("directional plus ambient accumulate without clamping", () => {
    const dirLight = makeLight(0, 0, 1, 1.0);
    const ambientLight = {
      type: "ambient",
      color: { r: 1, g: 1, b: 1 },
      intensity: 0.5,
    };
    // three.js sums irradiance unclamped; the baker clamps after the material.
    const result = shader.shade(0, 0, -1, [dirLight, ambientLight]);
    expect(result.r).toBeCloseTo(1.5, 6);
    expect(result.g).toBeCloseTo(1.5, 6);
    expect(result.b).toBeCloseTo(1.5, 6);
  });
});
