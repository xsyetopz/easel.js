import { describe, expect, it } from "bun:test";
import { RectAreaLight } from "@/lights/RectAreaLight.js";
import { LightType } from "@/core/Constants.js";

describe("RectAreaLight", () => {
  it("constructs with defaults matching THREE", () => {
    const light = new RectAreaLight();
    expect(light.type).toBe("RectAreaLight");
    expect(light.lightType).toBe(LightType.RectArea);
    expect(light.color.hex).toBe(0xffffff);
    expect(light.intensity).toBe(1);
    expect(light.width).toBe(10);
    expect(light.height).toBe(10);
  });

  it("constructs with custom values", () => {
    const light = new RectAreaLight(0xff0000, 2, 5, 8);
    expect(light.color.hex).toBe(0xff0000);
    expect(light.intensity).toBe(2);
    expect(light.width).toBe(5);
    expect(light.height).toBe(8);
  });

  it("computes power as intensity * area * PI", () => {
    const light = new RectAreaLight(0xffffff, 3, 2, 4);
    expect(light.power).toBeCloseTo(3 * 2 * 4 * Math.PI);
  });

  it("sets power by deriving intensity from area", () => {
    const light = new RectAreaLight(0xffffff, 1, 4, 5);
    light.power = 20 * Math.PI;
    expect(light.intensity).toBeCloseTo(1);
  });

  it("clones and copies without sharing state", () => {
    const source = new RectAreaLight(0x00ff00, 2, 6, 7);
    const copy = new RectAreaLight().copy(source);
    const clone = source.clone();

    expect(copy.width).toBe(6);
    expect(copy.height).toBe(7);
    expect(copy.intensity).toBe(2);
    expect(clone.width).toBe(6);
    expect(clone.height).toBe(7);
    expect(clone).not.toBe(source);
    expect(clone.color).not.toBe(source.color);
  });

  it("serializes to JSON with width and height", () => {
    const light = new RectAreaLight(0x0000ff, 1.5, 3, 6);
    const json = light.toJSON();
    expect(json).toMatchObject({
      type: "RectAreaLight",
      color: 0x0000ff,
      intensity: 1.5,
      width: 3,
      height: 6,
    });
  });

  it("rejects non-finite width in toJSON", () => {
    const light = new RectAreaLight();
    light.width = Number.NaN;
    expect(() => light.toJSON()).toThrow("finite");
  });

  it("rejects non-finite height in toJSON", () => {
    const light = new RectAreaLight();
    light.height = Number.POSITIVE_INFINITY;
    expect(() => light.toJSON()).toThrow("finite");
  });
});
