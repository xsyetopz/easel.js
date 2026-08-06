import { describe, expect, it } from "bun:test";
import { Node } from "@/core/Node.js";
import { DirectionalLightHelper } from "@/helpers/DirectionalLightHelper.js";
import { DirectionalLight } from "@/lights/DirectionalLight.js";
import { LineMaterial } from "@/materials/LineMaterial.js";
import { Vector3 } from "@/math/Vector3.js";
import type { Line } from "@/objects/Line.js";

describe("DirectionalLightHelper", () => {
  it("performs no synchronization or matrix preparation in its constructor", () => {
    const light = new DirectionalLight(0xff0000);
    light.position.set(2, 3, 4);
    const helper = new DirectionalLightHelper(light);
    expect(helper.position.equals(new Vector3())).toBe(true);
    expect(light.matrixWorld.elements[12]).toBe(0);
  });

  it("uses prepared matrices only during explicit update", () => {
    const light = new DirectionalLight(0xff0000);
    const target = new Node();
    light.target = target;
    light.position.set(1, 2, 3);
    target.position.set(1, 2, 8);
    light.updateMatrix();
    light.updateMatrixWorld(false);
    target.updateMatrix();
    target.updateMatrixWorld(false);

    const helper = new DirectionalLightHelper(light);
    expect(helper.update()).toBe(helper);
    expect(helper.position.equals(light.position)).toBe(true);
    expect(
      new Vector3(0, 0, 1)
        .applyQuaternion(helper.quaternion)
        .distanceTo(new Vector3(0, 0, 1)),
    ).toBeLessThan(1e-12);
    expect(helper.children[1]?.scale.z).toBe(5);
    expect((helper.children[0] as Line).material).toBeInstanceOf(LineMaterial);
    expect(
      ((helper.children[0] as Line).material as LineMaterial).color.hex,
    ).toBe(0xff0000);
  });

  it("keeps source and color assignment inert until update", () => {
    const first = new DirectionalLight(0xff0000);
    first.position.set(0, 1, 0);
    first.updateMatrix();
    first.updateMatrixWorld(false);
    const helper = new DirectionalLightHelper(first);
    const next = new DirectionalLight(0x00ff00);
    next.position.set(0, 2, 0);
    next.updateMatrix();
    next.updateMatrixWorld(false);
    helper.light = next;
    helper.color = "#0000ff";
    expect(helper.position.equals(new Vector3())).toBe(true);
    helper.update();
    expect(helper.position.equals(next.position)).toBe(true);
    expect(
      ((helper.children[0] as Line).material as LineMaterial).color.hex,
    ).toBe(0x0000ff);
  });
});
