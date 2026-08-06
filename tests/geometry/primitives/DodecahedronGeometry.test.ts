import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { DodecahedronGeometry } from "@/geometry/primitives/DodecahedronGeometry.js";
import { defined } from "../../_helpers/defined.ts";
import { expectUnitNormals, maxVertexRadius } from "../../_helpers/geometry.ts";

describe("DodecahedronGeometry vs THREE.DodecahedronGeometry", () => {
  it("default - vertex count matches", () => {
    expect(
      defined(new DodecahedronGeometry().getAttribute("position")).count,
    ).toBe(
      defined(new THREE.DodecahedronGeometry().getAttribute("position")).count,
    );
  });

  it("default - has positions", () => {
    expect(
      defined(new DodecahedronGeometry().getAttribute("position")).count,
    ).toBeGreaterThan(0);
  });

  it("default - normals are unit length", () => {
    const normals = defined(
      new DodecahedronGeometry().getAttribute("normal"),
    ).array;
    expectUnitNormals(normals, 3);
  });

  it("default - bounding radius ~1", () => {
    const pos = defined(
      new DodecahedronGeometry().getAttribute("position"),
    ).array;
    const maxR = maxVertexRadius(pos);
    expect(maxR).toBeGreaterThan(0.5);
    expect(maxR).toBeLessThanOrEqual(2);
  });

  it("detail=1 - vertex count matches THREE", () => {
    expect(
      defined(new DodecahedronGeometry(1, 1).getAttribute("position")).count,
    ).toBe(
      defined(new THREE.DodecahedronGeometry(1, 1).getAttribute("position"))
        .count,
    );
  });

  it("detail=1 - has more positions than detail=0", () => {
    const d0 = defined(
      new DodecahedronGeometry(1, 0).getAttribute("position"),
    ).count;
    const d1 = defined(
      new DodecahedronGeometry(1, 1).getAttribute("position"),
    ).count;
    expect(d1).toBeGreaterThan(d0);
  });
});

describe("DodecahedronGeometry winding order", () => {
  it("all 36 face normals point outward (detail=0)", () => {
    const geo = new DodecahedronGeometry(1, 0);
    const pos = defined(geo.getAttribute("position")).array;
    // Non-indexed: every 9 floats = 1 triangle (3 vertices x 3 components)
    const triCount = pos.length / 9;
    expect(triCount).toBe(36);

    for (let t = 0; t < triCount; t++) {
      const base = t * 9;
      const ax = pos[base];
      const ay = pos[base + 1];
      const az = pos[base + 2];
      const bx = pos[base + 3];
      const by = pos[base + 4];
      const bz = pos[base + 5];
      const cx = pos[base + 6];
      const cy = pos[base + 7];
      const cz = pos[base + 8];

      // Cross product (b-a) x (c-a)
      const abx = bx - ax;
      const aby = by - ay;
      const abz = bz - az;
      const acx = cx - ax;
      const acy = cy - ay;
      const acz = cz - az;
      const nx = aby * acz - abz * acy;
      const ny = abz * acx - abx * acz;
      const nz = abx * acy - aby * acx;

      // Centroid
      const mx = (ax + bx + cx) / 3;
      const my = (ay + by + cy) / 3;
      const mz = (az + bz + cz) / 3;

      // Outward if face normal - centroid > 0 (origin is at center)
      const dot = nx * mx + ny * my + nz * mz;
      expect(dot, `triangle ${t} face normal points inward`).toBeGreaterThan(0);
    }
  });
});
