import { describe, expect, it } from "bun:test";
import { PlaneHelper } from "@/helpers/PlaneHelper.js";
import { Plane } from "@/math/Plane.js";
import { Vector3 } from "@/math/Vector3.js";

describe("PlaneHelper", () => {
  it("performs no plane alignment during construction", () => {
    const helper = new PlaneHelper(new Plane(new Vector3(0, 1, 0), -3), 4);
    expect(helper.position.equals(new Vector3())).toBe(true);
    expect(helper.scale.equals(new Vector3(1, 1, 1))).toBe(true);
  });

  it("explicitly aligns its local positive Z axis with the plane normal", () => {
    const plane = new Plane(new Vector3(0, 1, 0), -3);
    const helper = new PlaneHelper(plane, 4);
    expect(helper.update()).toBe(helper);
    expect(helper.position.equals(new Vector3(0, 3, 0))).toBe(true);
    expect(helper.scale.equals(new Vector3(2, 2, 1))).toBe(true);
    expect(
      new Vector3(0, 0, 1)
        .applyQuaternion(helper.quaternion)
        .distanceTo(plane.normal),
    ).toBeLessThan(1e-12);
  });

  it("keeps source and size changes explicit until update", () => {
    const helper = new PlaneHelper(new Plane(new Vector3(0, 0, 1), 0));
    helper.plane = new Plane(new Vector3(1, 0, 0), -2);
    helper.size = 6;
    expect(helper.position.equals(new Vector3())).toBe(true);
    helper.update();
    expect(helper.position.equals(new Vector3(2, 0, 0))).toBe(true);
    expect(helper.scale.equals(new Vector3(3, 3, 1))).toBe(true);
  });

  it("uses a wireframe only and rejects invalid sizes", () => {
    const plane = new Plane();
    const helper = new PlaneHelper(plane);
    expect(helper.children).toHaveLength(0);
    expect(() => new PlaneHelper(plane, 0)).toThrow("positive finite");
    expect(() => {
      helper.size = Number.NaN;
    }).toThrow("positive finite");
  });
});
