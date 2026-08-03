import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { OctahedronGeometry } from "@/geometry/primitives/OctahedronGeometry.ts";
import { defined } from "../../_helpers/defined.js";
import { expectUnitNormals, maxVertexRadius } from "../../_helpers/geometry.js";

describe("OctahedronGeometry vs THREE.OctahedronGeometry", () => {
  it("default - vertex count matches", () => {
    expect(
      defined(new OctahedronGeometry().getAttribute("position")).count,
    ).toBe(
      defined(new THREE.OctahedronGeometry().getAttribute("position")).count,
    );
  });

  it("default - normals are unit length", () => {
    const normals = defined(
      new OctahedronGeometry().getAttribute("normal"),
    ).array;
    expectUnitNormals(normals, 3);
  });

  it("default - bounding radius ~1", () => {
    const pos = defined(
      new OctahedronGeometry().getAttribute("position"),
    ).array;
    const maxR = maxVertexRadius(pos);
    expect(maxR).toBeCloseTo(1, 3);
  });

  it("detail=1 - vertex count matches THREE", () => {
    expect(
      defined(new OctahedronGeometry(1, 1).getAttribute("position")).count,
    ).toBe(
      defined(new THREE.OctahedronGeometry(1, 1).getAttribute("position"))
        .count,
    );
  });

  it("detail=1 - has more positions than detail=0", () => {
    const d0 = defined(
      new OctahedronGeometry(1, 0).getAttribute("position"),
    ).count;
    const d1 = defined(
      new OctahedronGeometry(1, 1).getAttribute("position"),
    ).count;
    expect(d1).toBeGreaterThan(d0);
  });
});
