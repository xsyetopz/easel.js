import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { IcosahedronGeometry } from "@/geometry/primitives/IcosahedronGeometry.ts";
import { defined } from "../../_helpers/defined.js";
import { expectUnitNormals, maxVertexRadius } from "../../_helpers/geometry.js";

describe("IcosahedronGeometry vs THREE.IcosahedronGeometry", () => {
  it("default - vertex count matches", () => {
    expect(
      defined(new IcosahedronGeometry().getAttribute("position")).count,
    ).toBe(
      defined(new THREE.IcosahedronGeometry().getAttribute("position")).count,
    );
  });

  it("default - has positions", () => {
    expect(
      defined(new IcosahedronGeometry().getAttribute("position")).count,
    ).toBeGreaterThan(0);
  });

  it("default - normals are unit length", () => {
    const normals = defined(
      new IcosahedronGeometry().getAttribute("normal"),
    ).array;
    expectUnitNormals(normals, 3);
  });

  it("default - bounding radius ~1", () => {
    const pos = defined(
      new IcosahedronGeometry().getAttribute("position"),
    ).array;
    const maxR = maxVertexRadius(pos);
    expect(maxR).toBeCloseTo(1, 3);
  });

  it("detail=1 - vertex count matches THREE", () => {
    expect(
      defined(new IcosahedronGeometry(1, 1).getAttribute("position")).count,
    ).toBe(
      defined(new THREE.IcosahedronGeometry(1, 1).getAttribute("position"))
        .count,
    );
  });

  it("detail=1 - has more positions than detail=0", () => {
    const d0 = defined(
      new IcosahedronGeometry(1, 0).getAttribute("position"),
    ).count;
    const d1 = defined(
      new IcosahedronGeometry(1, 1).getAttribute("position"),
    ).count;
    expect(d1).toBeGreaterThan(d0);
  });
});
