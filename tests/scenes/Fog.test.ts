import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { Fog, FogExp2, FogMode } from "@/scenes/Fog.js";

const { Fog: THREEFog, FogExp2: THREEFogExp2 } = THREE as unknown as {
  Fog: new (
    color: number,
    near?: number,
    far?: number,
  ) => {
    near: number;
    far: number;
  };
  FogExp2: new (color: number, density?: number) => { density: number };
};

describe("Fog", () => {
  it("uses linear distance fog by default", () => {
    const fog = new Fog();
    const reference = new THREEFog(0x000000);
    expect(fog.mode).toBe(FogMode.Linear);
    expect(fog.near).toBe(reference.near);
    expect(fog.far).toBe(reference.far);
    expect(fog.lut[0]).toBe(0);
    expect(fog.lut[128]).toBeCloseTo(128 / 255, 6);
    expect(fog.lut[255]).toBe(1);
    expect(fog.opacityAt(0)).toBe(0);
    expect(fog.opacityAt(reference.near)).toBe(0);
    expect(fog.opacityAt(reference.far)).toBe(1);
  });

  it("matches exponential-squared fog at absolute distances", () => {
    const reference = new THREEFogExp2(0x000000, 0.002);
    const fog = new Fog({
      far: 1000,
      mode: FogMode.ExponentialSquared,
      density: reference.density,
    });
    expect(fog.near).toBe(0);
    const index = 128;
    const distance = (index / 255) * 1000;
    const expected = 1 - Math.exp(-((0.002 * distance) ** 2));
    expect(fog.lut[index]).toBeCloseTo(expected, 6);
    expect(fog.opacityAt(distance)).toBeCloseTo(expected, 4);
  });

  it("does not normalize exponential-squared opacity by the CPU bound", () => {
    const density = 0.002;
    const distance = 250;
    const expected = 1 - Math.exp(-((density * distance) ** 2));
    const fog = new Fog({
      far: 1000,
      mode: FogMode.ExponentialSquared,
      density,
    });

    expect(fog.opacityAt(distance)).toBeCloseTo(expected, 4);
    expect(fog.near).toBe(0);
  });

  it("requires an explicit LUT update after parameter changes", () => {
    const fog = new Fog();
    const previous = fog.lut[128];
    fog.near = 0;
    fog.mode = FogMode.ExponentialSquared;
    fog.density = 0.004;
    fog.far = 500;
    expect(fog.lutNeedsUpdate).toBe(true);
    expect(fog.lut[128]).toBe(previous);
    expect(() => fog.opacityAt(100)).toThrow("LUT is dirty");
    fog.updateLut();
    expect(fog.lutNeedsUpdate).toBe(false);
    expect(fog.lut[128]).not.toBe(previous);
    expect(fog.opacityAt(100)).toBeGreaterThan(0);
  });

  it("rejects invalid bounds, modes, densities, and mode transitions", () => {
    const fog = new Fog();
    expect(() => {
      fog.near = 1000;
    }).toThrow("far must be greater than near");
    expect(fog.near).toBe(1);
    expect(() => {
      fog.mode = "invalid" as typeof fog.mode;
    }).toThrow("mode is not supported");
    expect(fog.mode).toBe(FogMode.Linear);
    expect(() => {
      fog.density = -1;
    }).toThrow("finite non-negative");
    expect(fog.density).toBe(0.00025);

    expect(() => {
      fog.mode = FogMode.ExponentialSquared;
    }).toThrow("requires near to remain 0");
    expect(fog.mode).toBe(FogMode.Linear);

    fog.near = 0;
    fog.mode = FogMode.ExponentialSquared;
    expect(fog.near).toBe(0);
    expect(() => {
      fog.near = 1;
    }).toThrow("requires near to remain 0");
    expect(fog.near).toBe(0);
  });

  it("rejects a non-zero linear start when constructing exponential-squared fog", () => {
    expect(
      () =>
        new Fog({
          mode: FogMode.ExponentialSquared,
          near: 1,
        }),
    ).toThrow("requires near to remain 0");
  });

  it("clone preserves explicit mode and parameters", () => {
    const fog = new Fog({
      near: 0,
      far: 250,
      mode: FogMode.ExponentialSquared,
      density: 0.01,
    });
    const clone = fog.clone();
    expect(clone).not.toBe(fog);
    expect(clone.color).not.toBe(fog.color);
    expect(clone.near).toBe(0);
    expect(clone.far).toBe(250);
    expect(clone.mode).toBe(FogMode.ExponentialSquared);
    expect(clone.density).toBe(0.01);
    expect(Array.from(clone.lut)).toEqual(Array.from(fog.lut));
  });

  it("matches linear THREE fog fields and serializes canonical state", () => {
    const reference = new THREEFog(0x123456, 10, 15);
    const fog = new Fog({
      color: 0x123456,
      name: "linear-mist",
      near: reference.near,
      far: reference.far,
    });

    expect(fog.isFog).toBe(true);
    expect(fog.isFogExp2).toBe(false);
    expect(fog.name).toBe("linear-mist");
    expect(fog.toJSON()).toEqual({
      type: "Fog",
      name: "linear-mist",
      color: 0x123456,
      near: 10,
      far: 15,
    });
  });

  it("copies color, name, and prepared LUT state", () => {
    const source = new Fog({
      color: 0x112233,
      name: "source",
      near: 2,
      far: 200,
    });
    source.near = 3;
    const copy = new Fog().copy(source);

    expect(copy).not.toBe(source);
    expect(copy.color).not.toBe(source.color);
    expect(copy.toJSON()).toEqual({
      type: "Fog",
      name: "source",
      color: 0x112233,
      near: 3,
      far: 200,
    });
    expect(copy.lutNeedsUpdate).toBe(true);
    expect(Array.from(copy.lut)).toEqual(Array.from(source.lut));
  });

  it("provides bounded FogExp2 parity without per-pixel work", () => {
    const reference = new THREEFogExp2(0x223344, 0.002);
    const fog = new FogExp2(0x223344, reference.density, 1000);
    const distance = 250;
    const expected = 1 - Math.exp(-((reference.density * distance) ** 2));

    expect(fog.isFog).toBe(false);
    expect(fog.isFogExp2).toBe(true);
    expect(fog.near).toBe(0);
    expect(fog.lut.length).toBe(256);
    expect(fog.opacityAt(distance)).toBeCloseTo(expected, 4);
    expect(fog.toJSON()).toEqual({
      type: "FogExp2",
      name: "",
      color: 0x223344,
      far: 1000,
      density: reference.density,
    });

    const clone = fog.clone();
    expect(clone).toBeInstanceOf(FogExp2);
    expect(clone).not.toBe(fog);
    expect(clone.far).toBe(1000);
    expect(clone.density).toBe(reference.density);
  });
});
