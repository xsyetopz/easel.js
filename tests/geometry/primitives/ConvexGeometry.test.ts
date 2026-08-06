import { describe, expect, it } from "bun:test";
import { ConvexGeometry } from "@/geometry/primitives/ConvexGeometry.ts";
import { Vector3 } from "@/math/Vector3.ts";
import { defined } from "../../_helpers/defined.ts";
import { expectUnitNormals } from "../../_helpers/geometry.ts";

function cubePoints(): Vector3[] {
  return [-1, 1].flatMap((x) =>
    [-1, 1].flatMap((y) => [-1, 1].map((z) => new Vector3(x, y, z))),
  );
}

describe("ConvexGeometry", () => {
  it("emits one flat-normal triangle pair for every cube face", () => {
    const geometry = new ConvexGeometry(cubePoints());
    const positions = defined(geometry.getAttribute("position"));
    const normals = defined(geometry.getAttribute("normal"));

    expect(positions.itemSize).toBe(3);
    expect(positions.count).toBe(36);
    expect(normals.count).toBe(positions.count);
    expectUnitNormals(normals.array, 4);
  });

  it("ignores duplicate and interior points", () => {
    const points = cubePoints();
    points.push(new Vector3(0, 0, 0), points[0].clone());
    const geometry = new ConvexGeometry(points);

    expect(defined(geometry.getAttribute("position")).count).toBe(36);
  });

  it("is deterministic for the same point order", () => {
    const first = new ConvexGeometry(cubePoints());
    const second = new ConvexGeometry(cubePoints());
    const firstPositions = defined(first.getAttribute("position")).array;
    const secondPositions = defined(second.getAttribute("position")).array;

    expect([...firstPositions]).toEqual([...secondPositions]);
  });

  it("returns empty geometry for insufficient or coplanar input", () => {
    expect(
      defined(
        new ConvexGeometry([new Vector3(), new Vector3(1, 0, 0)]).getAttribute(
          "position",
        ),
      ).count,
    ).toBe(0);
    expect(
      defined(
        new ConvexGeometry([
          new Vector3(0, 0, 0),
          new Vector3(1, 0, 0),
          new Vector3(0, 1, 0),
          new Vector3(1, 1, 0),
        ]).getAttribute("position"),
      ).count,
    ).toBe(0);
  });
});
