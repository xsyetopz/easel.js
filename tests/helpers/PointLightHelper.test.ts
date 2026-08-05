import { describe, expect, it } from "bun:test";
import { PointLightHelper } from "@/helpers/PointLightHelper.js";
import { PointLight } from "@/lights/PointLight.js";
import { LineMaterial } from "@/materials/LineMaterial.js";
import { Vector3 } from "@/math/Vector3.js";

describe("PointLightHelper", () => {
  it("performs no light synchronization during construction", () => {
    const light = new PointLight(0xff0000);
    light.position.set(1, 2, 3);
    const helper = new PointLightHelper(light);
    expect(helper.position.equals(new Vector3())).toBe(true);
    expect((helper.material as LineMaterial).color.hex).toBe(0xffffff);
  });

  it("updates position and light-derived color explicitly", () => {
    const light = new PointLight(0xff0000);
    light.position.set(1, 2, 3);
    const helper = new PointLightHelper(light);
    expect(helper.update()).toBe(helper);
    expect(helper.position.equals(light.position)).toBe(true);
    expect((helper.material as LineMaterial).color.hex).toBe(0xff0000);
  });

  it("keeps source and override assignments inert until update", () => {
    const helper = new PointLightHelper(new PointLight(0xff0000));
    const next = new PointLight(0x00ff00);
    next.position.set(4, 5, 6);
    helper.light = next;
    helper.color = "#0000ff";
    expect(helper.position.equals(new Vector3())).toBe(true);
    helper.update();
    expect(helper.position.equals(next.position)).toBe(true);
    expect((helper.material as LineMaterial).color.hex).toBe(0x0000ff);
  });

  it("uses line segments and rejects invalid sizes", () => {
    const light = new PointLight();
    const helper = new PointLightHelper(light, 2);
    expect(helper.geometry?.getAttribute("position")?.count).toBe(24);
    expect(() => new PointLightHelper(light, 0)).toThrow("positive and finite");
  });
});
