import { describe, expect, it } from "bun:test";
import { Node } from "@/core/Node.js";
import { ArrowHelper } from "@/helpers/ArrowHelper.js";
import { Vector3 } from "@/math/Vector3.js";

describe("ArrowHelper", () => {
  it("Extending", () => {
    expect(new ArrowHelper()).toBeInstanceOf(Node);
  });

  it("Instancing", () => {
    expect(new ArrowHelper()).toBeTruthy();
  });

  it("type", () => {
    expect(new ArrowHelper().type).toBe("ArrowHelper");
  });

  it("dispose", () => {
    new ArrowHelper().dispose();
  });

  it("updates child transforms only when accessors change", () => {
    const helper = new ArrowHelper({
      direction: new Vector3(1, 0, 0),
      length: 10,
    });
    expect(helper.direction).toEqual(
      expect.objectContaining({ x: 1, y: 0, z: 0 }),
    );
    expect(helper.line.scale.y).toBeCloseTo(8);
    expect(helper.cone.position.y).toBeCloseTo(9);
    helper.headLength = 4;
    helper.headWidth = 2;
    expect(helper.line.scale.y).toBeCloseTo(6);
    expect(helper.cone.scale).toEqual(
      expect.objectContaining({ x: 2, y: 4, z: 2 }),
    );
  });
});
