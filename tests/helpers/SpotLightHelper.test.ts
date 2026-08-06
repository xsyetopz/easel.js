import { describe, expect, it } from "bun:test";
import { SpotLightHelper } from "@/helpers/SpotLightHelper.js";
import { SpotLight } from "@/lights/SpotLight.js";
import type { LineMaterial } from "@/materials/LineMaterial.js";
import { Vector3 } from "@/math/Vector3.js";

describe("SpotLightHelper", () => {
  it("performs no synchronization during construction", () => {
    const light = new SpotLight(0xff0000, 1, 5);
    light.position.set(1, 2, 3);
    const helper = new SpotLightHelper(light);
    expect(helper.position.equals(new Vector3())).toBe(true);
    expect(light.matrixWorld.elements[12]).toBe(0);
  });

  it("updates prepared direction, scale, and color without replacing geometry", () => {
    const light = new SpotLight(0xff0000, 1, 5, Math.PI / 4);
    light.position.set(1, 2, 3);
    light.direction.set(0, 0, 1);
    light.updateMatrix();
    light.updateMatrixWorld(false);
    const helper = new SpotLightHelper(light);
    const geometry = helper.cone.geometry;
    expect(helper.update()).toBe(helper);
    expect(helper.cone.geometry).toBe(geometry);
    expect(helper.position.equals(light.position)).toBe(true);
    expect(helper.cone.scale.x).toBeCloseTo(5, 12);
    expect(helper.cone.scale.z).toBe(5);
    expect((helper.cone.material as LineMaterial).color.hex).toBe(0xff0000);
  });

  it("requires an explicit display length for unlimited spotlights", () => {
    const light = new SpotLight(0xffffff, 1, 0);
    light.updateMatrix();
    light.updateMatrixWorld(false);
    const helper = new SpotLightHelper(light);
    expect(() => helper.update()).toThrow("displayLength");
    helper.displayLength = 12;
    helper.update();
    expect(helper.cone.scale.z).toBe(12);
    expect(() => {
      helper.displayLength = 0;
    }).toThrow("positive and finite");
  });

  it("keeps source and color assignments inert until update", () => {
    const first = new SpotLight(0xff0000, 1, 2);
    const helper = new SpotLightHelper(first);
    const next = new SpotLight(0x00ff00, 1, 3);
    next.position.set(4, 5, 6);
    next.updateMatrix();
    next.updateMatrixWorld(false);
    helper.light = next;
    helper.color = "#0000ff";
    expect(helper.position.equals(new Vector3())).toBe(true);
    helper.update();
    expect(helper.position.equals(next.position)).toBe(true);
    expect((helper.cone.material as LineMaterial).color.hex).toBe(0x0000ff);
  });
});
