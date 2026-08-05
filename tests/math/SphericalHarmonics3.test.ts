import { describe, expect, it } from "bun:test";
import {
  SphericalHarmonics3 as THREESphericalHarmonics3,
  Vector3 as THREEVector3,
} from "three";
import {
  SphericalHarmonics3,
  sphericalHarmonicsBasis,
} from "@/math/SphericalHarmonics3.js";
import { Vector3 } from "@/math/Vector3.js";

const values = Array.from({ length: 27 }, (_, index) => (index - 13) / 7);

function arraysAreClose(
  actual: ArrayLike<number>,
  expected: ArrayLike<number>,
): boolean {
  if (actual.length !== expected.length) return false;
  for (let index = 0; index < actual.length; index++) {
    if (Math.abs(actual[index] - expected[index]) > 1e-10) return false;
  }
  return true;
}

describe("SphericalHarmonics3", () => {
  it("Instancing", () => {
    expect(new SphericalHarmonics3()).toBeTruthy();
  });

  it("isSphericalHarmonics3", () => {
    expect(new SphericalHarmonics3().isSphericalHarmonics3).toBe(true);
  });
});

describe("SphericalHarmonics3 parity", () => {
  it("keeps stable coefficient storage when values are assigned", () => {
    const harmonics = new SphericalHarmonics3();
    const stable = harmonics.coefficients;
    const source = new SphericalHarmonics3().fromArray(values);

    harmonics.coefficients = source.coefficients;

    expect(harmonics.coefficients).toBe(stable);
    expect(harmonics.coefficients[0]).toBe(stable[0]);
    expect(arraysAreClose(harmonics.toArray(), values)).toBe(true);
  });

  it("matches THREE.js radiance and irradiance evaluation", () => {
    const EASEL = new SphericalHarmonics3().fromArray(values);
    const THREE = new THREESphericalHarmonics3().fromArray(values);
    const normal = new Vector3(2, 3, 4).normalize();
    const THREENormal = new THREEVector3(normal.x, normal.y, normal.z);

    const radiance = EASEL.radianceAt(normal, new Vector3());
    const THREERadiance = THREE.getAt(THREENormal, new THREEVector3());
    expect(radiance.x).toBeCloseTo(THREERadiance.x);
    expect(radiance.y).toBeCloseTo(THREERadiance.y);
    expect(radiance.z).toBeCloseTo(THREERadiance.z);

    const irradiance = EASEL.irradianceAt(normal, new Vector3());
    const THREEIrradiance = THREE.getIrradianceAt(
      THREENormal,
      new THREEVector3(),
    );
    expect(irradiance.x).toBeCloseTo(THREEIrradiance.x);
    expect(irradiance.y).toBeCloseTo(THREEIrradiance.y);
    expect(irradiance.z).toBeCloseTo(THREEIrradiance.z);
  });

  it("matches THREE.js basis evaluation through a top-level function", () => {
    const normal = new Vector3(-2, 5, 1).normalize();
    const EASEL = sphericalHarmonicsBasis(normal, new Float64Array(9));
    const THREE = new Float64Array(9);
    THREESphericalHarmonics3.getBasisAt(normal, THREE);
    expect(arraysAreClose(EASEL, THREE)).toBe(true);
  });
});

describe("SphericalHarmonics3 arithmetic", () => {
  it("matches THREE.js arithmetic and interpolation", () => {
    const otherValues = values.map((value, index) => value + index / 11);
    const EASEL = new SphericalHarmonics3().fromArray(values);
    const EASELOther = new SphericalHarmonics3().fromArray(otherValues);
    const THREE = new THREESphericalHarmonics3().fromArray(values);
    const THREEOther = new THREESphericalHarmonics3().fromArray(otherValues);

    EASEL.add(EASELOther)
      .addScaled(EASELOther, 0.25)
      .scale(0.5)
      .lerp(EASELOther, 0.2);
    THREE.add(THREEOther)
      .addScaledSH(THREEOther, 0.25)
      .scale(0.5)
      .lerp(THREEOther, 0.2);

    expect(arraysAreClose(EASEL.toArray(), THREE.toArray())).toBe(true);
  });

  it("copies, clones, compares, serializes, and clears coefficients", () => {
    const source = new SphericalHarmonics3().fromArray(values);
    const copy = new SphericalHarmonics3().copy(source);
    const clone = source.clone();
    const offset = source.toArray([99, 98], 2);

    expect(copy.equals(source)).toBe(true);
    expect(clone.equals(source)).toBe(true);
    clone.coefficients[0].x += 1;
    expect(clone.equals(source)).toBe(false);
    expect(arraysAreClose(offset.slice(2), values)).toBe(true);
    expect(copy.zero()).toBe(copy);
    expect(copy.toArray().every((value) => value === 0)).toBe(true);
  });
});
