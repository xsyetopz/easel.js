import { describe, expect, it } from "bun:test";
import {
  LightProbe as TLightProbe,
  SphericalHarmonics3 as TSphericalHarmonics3,
  Vector3 as TVector3,
} from "three";
import { LightProbe } from "@/lights/LightProbe.js";
import { SphericalHarmonics3 } from "@/math/SphericalHarmonics3.js";

function EASELHarmonics(): SphericalHarmonics3 {
  const sh = new SphericalHarmonics3();
  for (let index = 0; index < 9; index += 1) {
    sh.coefficients[index].set(index, index + 0.25, index + 0.5);
  }
  return sh;
}

function THREEHarmonics(): TSphericalHarmonics3 {
  return new TSphericalHarmonics3().set(
    Array.from(
      { length: 9 },
      (_, index) => new TVector3(index, index + 0.25, index + 0.5),
    ),
  );
}

describe("LightProbe", () => {
  it("matches THREE construction and type state", () => {
    const EASEL = new LightProbe(EASELHarmonics(), 0.75);
    const THREE = new TLightProbe(THREEHarmonics(), 0.75);

    expect(EASEL.isLightProbe).toBe(THREE.isLightProbe);
    expect(EASEL.intensity).toBe(THREE.intensity);
    expect(EASEL.sh.toArray()).toEqual(THREE.sh.toArray());
  });

  it("copies and clones coefficients without sharing coefficient vectors", () => {
    const source = new LightProbe(EASELHarmonics(), 0.5);
    const copy = new LightProbe().copy(source);
    const clone = source.clone();

    expect(copy.sh.toArray()).toEqual(source.sh.toArray());
    expect(clone.sh.toArray()).toEqual(source.sh.toArray());
    expect(copy.sh).not.toBe(source.sh);
    expect(clone.sh.coefficients[0]).not.toBe(source.sh.coefficients[0]);
  });

  it("serializes finite coefficients and rejects non-finite values", () => {
    const probe = new LightProbe(EASELHarmonics(), 0.25);
    expect(probe.toJSON()).toMatchObject({
      type: "LightProbe",
      intensity: 0.25,
      sh: probe.sh.toArray(),
    });

    probe.sh.coefficients[4].y = Number.NaN;
    expect(() => probe.toJSON()).toThrow("finite SH coefficients");
  });
});
