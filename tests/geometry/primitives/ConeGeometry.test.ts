import { describe, expect, it } from "bun:test";
import { ConeGeometry } from "@/geometry/primitives/ConeGeometry.js";
import { defined } from "../../_helpers/defined.js";
import { expectUnitNormals } from "../../_helpers/geometry.js";

describe("ConeGeometry", () => {
  it("default - has position, normal, uv, index", () => {
    const geo = new ConeGeometry();
    expect(defined(geo.getAttribute("position"))).toBeDefined();
    expect(defined(geo.getAttribute("normal"))).toBeDefined();
    expect(defined(geo.getAttribute("uv"))).toBeDefined();
    expect(geo.index).not.toBeUndefined();
  });

  it("default - vertex count > 0", () => {
    expect(
      defined(new ConeGeometry().getAttribute("position")).count,
    ).toBeGreaterThan(0);
  });

  it("default - normals are unit length", () => {
    const normals = defined(new ConeGeometry().getAttribute("normal")).array;
    expectUnitNormals(normals, 4);
  });

  it("custom (1.5,3,12) - bounding box height matches", () => {
    const pos = defined(
      new ConeGeometry(1.5, 3, 12).getAttribute("position"),
    ).array;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (let i = 1; i < pos.length; i += 3) {
      if (pos[i] < minY) minY = pos[i];
      if (pos[i] > maxY) maxY = pos[i];
    }
    expect(maxY - minY).toBeCloseTo(3, 3);
  });

  it("apex at top (radiusTop=0)", () => {
    const pos = defined(
      new ConeGeometry(1, 2, 8).getAttribute("position"),
    ).array;
    const halfH = 2 / 2;
    let hasApex = false;
    for (let i = 0; i < pos.length; i += 3) {
      if (pos[i + 1] > halfH - 0.01) {
        const r = Math.sqrt(pos[i] ** 2 + pos[i + 2] ** 2);
        if (r < 0.01) hasApex = true;
      }
    }
    expect(hasApex).toBe(true);
  });

  it("type is ConeGeometry", () => {
    expect(new ConeGeometry().type).toBe("ConeGeometry");
  });
});
