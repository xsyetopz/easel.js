import { describe, expect, it } from "bun:test";
import { SphericalHarmonics3 } from "@/math/SphericalHarmonics3.js";
import { Vector3 } from "@/math/Vector3.js";
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
  it("directional light with dot > 0: full contribution, no floor", () => {
    // normal (0,0,-1), light dir (0,0,1): dot = 0*0+0*0+(-1)*(-1) = 1
    const out = { r: 0, g: 0, b: 0 };
    const result = accumulateLights(0, 0, -1, [makeDirectional(0, 0, 1)], out);
    expect(result.r).toBeCloseTo(1.0, 2);
    expect(result.g).toBeCloseTo(1.0, 2);
    expect(result.b).toBeCloseTo(1.0, 2);
  });

  it("directional light with dot <= 0: no contribution", () => {
    // normal (0,0,1), light dir (0,0,1): dot = 0*0+0*0+1*(-1) = -1 → skipped
    const out = { r: 0, g: 0, b: 0 };
    const result = accumulateLights(0, 0, 1, [makeDirectional(0, 0, 1)], out);
    expect(result.r).toBe(0);
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
  });

  it("ambient light: adds its intensity", () => {
    const out = { r: 0, g: 0, b: 0 };
    const result = accumulateLights(0, 0, -1, [makeAmbient(0.5)], out);
    expect(result.r).toBeCloseTo(0.5, 6);
    expect(result.g).toBeCloseTo(0.5, 6);
    expect(result.b).toBeCloseTo(0.5, 6);
  });

  it("hemisphere light: normal aligned with direction uses sky color entirely", () => {
    // normal (0,1,0), dir (0,1,0): dot=1, blend=1.0 → pure sky
    const sky = { r: 1, g: 1, b: 1 };
    const ground = { r: 0, g: 0, b: 0 };
    const out = { r: 0, g: 0, b: 0 };
    const result = accumulateLights(
      0,
      1,
      0,
      [makeHemisphere(0, 1, 0, sky, ground, 1.0)],
      out,
    );
    expect(result.r).toBeCloseTo(1.0, 2);
    expect(result.g).toBeCloseTo(1.0, 2);
    expect(result.b).toBeCloseTo(1.0, 2);
  });

  it("matches spherical-harmonic irradiance for a light probe", () => {
    const sh = new SphericalHarmonics3();
    for (let index = 0; index < 9; index += 1) {
      sh.coefficients[index].set(
        0.01 * (index + 1),
        0.005 * (index + 1),
        0.0025 * (index + 1),
      );
    }
    const normal = new Vector3(0.25, 0.5, 0.75).normalize();
    const intensity = 0.6;
    const expected = sh
      .irradianceAt(normal, new Vector3())
      .multiplyScalar(intensity);
    const result = accumulateLights(
      normal.x,
      normal.y,
      normal.z,
      [{ type: "probe", coefficients: sh.coefficients, intensity }],
      { r: 0, g: 0, b: 0 },
    );

    expect(result.r).toBeCloseTo(expected.x, 12);
    expect(result.g).toBeCloseTo(expected.y, 12);
    expect(result.b).toBeCloseTo(expected.z, 12);
  });

  it("multiple lights accumulate additively", () => {
    const out = { r: 0, g: 0, b: 0 };
    // Two ambient lights at 0.2 each + ambient 0.0 = 0.4
    const result = accumulateLights(
      0,
      0,
      -1,
      [makeAmbient(0.2), makeAmbient(0.2)],
      out,
    );
    expect(result.r).toBeCloseTo(0.4, 2);
  });

  it("no clamping: two full directional lights sum to 2, as in three.js", () => {
    const out = { r: 0, g: 0, b: 0 };
    const result = accumulateLights(
      0,
      0,
      -1,
      [
        makeDirectional(0, 0, 1, { r: 1, g: 1, b: 1 }, 1),
        makeDirectional(0, 0, 1, { r: 1, g: 1, b: 1 }, 1),
      ],
      out,
    );
    expect(result.r).toBeCloseTo(2.0, 6);
    expect(result.g).toBeCloseTo(2.0, 6);
    expect(result.b).toBeCloseTo(2.0, 6);
  });

  it("colored light: red-only directional only illuminates r channel", () => {
    const out = { r: 0, g: 0, b: 0 };
    // normal (0,0,-1) facing directional (0,0,1): dot=1
    const result = accumulateLights(
      0,
      0,
      -1,
      [makeDirectional(0, 0, 1, { r: 1, g: 0, b: 0 })],
      out,
    );
    expect(result.r).toBeCloseTo(1, 6);
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
  });

  it("non-object color fallback: numeric color defaults to (1,1,1)", () => {
    const out = { r: 0, g: 0, b: 0 };
    const light = { type: "ambient", color: 0xffffff, intensity: 0.3 };
    const result = accumulateLights(0, 0, -1, [light], out);
    // cr=cg=cb=1, so contribution = 1*0.3 = 0.3
    expect(result.r).toBeCloseTo(0.3, 6);
    expect(result.g).toBeCloseTo(0.3, 6);
    expect(result.b).toBeCloseTo(0.3, 6);
  });

  it("out parameter is mutated and returned as the same reference", () => {
    const out = { r: 0, g: 0, b: 0 };
    const ret = accumulateLights(0, 0, -1, [], out);
    expect(ret).toBe(out);
    expect(out.r).toBe(0);
  });

  it("zero lights: returns black, with no ambient floor", () => {
    const out = { r: 0.7, g: 0.7, b: 0.7 };
    const result = accumulateLights(0, 0, -1, [], out);
    expect(result.r).toBe(0);
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
  });

  it("spot cone falloff is three.js smoothstep(coneCos, penumbraCos, angleCos)", () => {
    const angle = Math.PI / 4;
    const penumbra = 0.5;
    const coneCos = Math.cos(angle);
    const penumbraCos = Math.cos(angle * (1 - penumbra));
    // Light at the origin pointing down -z; the surface point sits at an
    // angle between the inner and outer cone, facing the light.
    const theta = angle * 0.8;
    const wx = Math.sin(theta);
    const wz = -Math.cos(theta);
    const spot = {
      type: "spot",
      position: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 0, z: -1 },
      color: { r: 1, g: 1, b: 1 },
      intensity: 1,
      angle,
      penumbra,
      distance: 0,
      decay: 0,
    };
    const result = accumulateLights(
      -wx,
      0,
      -wz,
      [spot],
      { r: 0, g: 0, b: 0 },
      wx,
      0,
      wz,
    );
    const t = (Math.cos(theta) - coneCos) / (penumbraCos - coneCos);
    const smooth = t * t * (3 - 2 * t);
    expect(result.r).toBeCloseTo(smooth, 6);
  });
});
