import { describe, expect, it } from "bun:test";
import { BufferAttribute, Box3 as TBox3 } from "three";
import { Attribute } from "@/geometry/Attribute.js";
import { Box3 } from "@/math/Box3.js";

describe("Box3.setFromAttribute", () => {
  it("reads normalized integer positions through the CPU attribute accessors", () => {
    const values = new Uint8Array([0, 128, 255, 255, 64, 32]);
    const attribute = new Attribute(values, 3, true);
    const box = new Box3();
    const threeAttribute = new BufferAttribute(values, 3, true);
    const threePositions: number[] = [];
    for (let i = 0; i < threeAttribute.count; i++) {
      threePositions.push(
        threeAttribute.getX(i),
        threeAttribute.getY(i),
        threeAttribute.getZ(i),
      );
    }
    const threeBox = new TBox3().setFromArray(threePositions);

    expect(box.setFromAttribute(attribute)).toBe(box);
    expect(box.min.x).toBeCloseTo(threeBox.min.x);
    expect(box.min.y).toBeCloseTo(threeBox.min.y);
    expect(box.min.z).toBeCloseTo(threeBox.min.z);
    expect(box.max.x).toBeCloseTo(threeBox.max.x);
    expect(box.max.y).toBeCloseTo(threeBox.max.y);
    expect(box.max.z).toBeCloseTo(threeBox.max.z);
  });

  it("resets to the empty-box sentinel for an empty attribute", () => {
    const box = new Box3().setFromAttribute(
      new Attribute(new Float32Array([1, 2, 3]), 3),
    );

    box.setFromAttribute(new Attribute(new Float32Array(), 3));

    expect(box.isEmpty).toBe(true);
    expect(box.min.x).toBe(Number.POSITIVE_INFINITY);
    expect(box.min.y).toBe(Number.POSITIVE_INFINITY);
    expect(box.min.z).toBe(Number.POSITIVE_INFINITY);
    expect(box.max.x).toBe(Number.NEGATIVE_INFINITY);
    expect(box.max.y).toBe(Number.NEGATIVE_INFINITY);
    expect(box.max.z).toBe(Number.NEGATIVE_INFINITY);
  });
});
