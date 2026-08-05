import { describe, expect, it } from "bun:test";
import { Box3 } from "@/math/Box3.js";
import { Capsule } from "@/math/Capsule.js";
import { Vector3 } from "@/math/Vector3.js";

function components(vector: Vector3): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}

describe("Capsule", () => {
  it("clones constructor inputs and exposes canonical mutable components", () => {
    const start = new Vector3(1, 2, 3);
    const end = new Vector3(4, 5, 6);
    const capsule = new Capsule(start, end, 2);
    start.x = 10;
    end.y = 10;
    expect(components(capsule.start)).toEqual([1, 2, 3]);
    expect(components(capsule.end)).toEqual([4, 5, 6]);
    expect(capsule.radius).toBe(2);
  });

  it("matches locked THREE.js center, translation, and box semantics", () => {
    const capsule = new Capsule(
      new Vector3(-1, 0.5, 0),
      new Vector3(2, 0.5, 0),
      0.25,
    );
    expect(components(capsule.getCenter(new Vector3()))).toEqual([0.5, 0.5, 0]);
    expect(
      capsule.intersectsBox(
        new Box3(new Vector3(0, 0, -1), new Vector3(1, 1, 1)),
      ),
    ).toBe(true);
    expect(
      capsule.intersectsBox(
        new Box3(new Vector3(3, 3, 3), new Vector3(4, 4, 4)),
      ),
    ).toBe(false);
    capsule.translate(new Vector3(1, 2, 3));
    expect(components(capsule.start)).toEqual([0, 2.5, 3]);
    expect(components(capsule.end)).toEqual([3, 2.5, 3]);
  });

  it("uses exact rounded-corner distance and includes tangential contact", () => {
    const box = new Box3(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
    const tangent = new Capsule(
      new Vector3(2, 2, 0.5),
      new Vector3(2, 2, 0.5),
      Math.SQRT2,
    );
    const cornerMiss = new Capsule(
      new Vector3(2, 2, 0.5),
      new Vector3(2, 2, 0.5),
      1.4,
    );
    expect(tangent.intersectsBox(box)).toBe(true);
    expect(cornerMiss.intersectsBox(box)).toBe(false);
  });

  it("rejects invalid radii without mutating existing state", () => {
    const capsule = new Capsule();
    expect(() => {
      capsule.radius = -1;
    }).toThrow("finite non-negative");
    expect(capsule.radius).toBe(1);
    expect(() => capsule.set(new Vector3(), new Vector3(), Number.NaN)).toThrow(
      "finite non-negative",
    );
    expect(capsule.radius).toBe(1);
  });
});
