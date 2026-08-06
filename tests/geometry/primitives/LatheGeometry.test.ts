import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { CapsuleGeometry } from "@/geometry/primitives/CapsuleGeometry.js";
import { LatheGeometry } from "@/geometry/primitives/LatheGeometry.js";
import { Vector2 } from "@/math/Vector2.js";
import { defined } from "../../_helpers/defined.ts";
import { expectUnitNormals } from "../../_helpers/geometry.ts";

const points = [new Vector2(0, -1), new Vector2(0.5, 0), new Vector2(0, 1)];
const THREEPoints = points.map((p) => new THREE.Vector2(p.x, p.y));

describe("LatheGeometry vs THREE.LatheGeometry", () => {
  it("default segments - vertex count matches", () => {
    expect(
      defined(new LatheGeometry(points).getAttribute("position")).count,
    ).toBe(
      defined(new THREE.LatheGeometry(THREEPoints).getAttribute("position"))
        .count,
    );
  });

  it("default segments - index count matches", () => {
    expect(defined(new LatheGeometry(points).index).length).toBe(
      defined(new THREE.LatheGeometry(THREEPoints).getIndex()).array.length,
    );
  });

  it("default segments - normals are unit length", () => {
    const normals = defined(
      new LatheGeometry(points).getAttribute("normal"),
    ).array;
    expectUnitNormals(normals, 3);
  });

  it("default segments - bounding box Y spans -1 to 1", () => {
    const pos = defined(
      new LatheGeometry(points).getAttribute("position"),
    ).array;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (let i = 1; i < pos.length; i += 3) {
      if (pos[i] < minY) minY = pos[i];
      if (pos[i] > maxY) maxY = pos[i];
    }
    expect(minY).toBeCloseTo(-1, 3);
    expect(maxY).toBeCloseTo(1, 3);
  });

  it("custom 6 segments - vertex count matches THREE", () => {
    expect(
      defined(new LatheGeometry(points, 6).getAttribute("position")).count,
    ).toBe(
      defined(new THREE.LatheGeometry(THREEPoints, 6).getAttribute("position"))
        .count,
    );
  });
});

describe("LatheGeometry caps", () => {
  it("generates caps when endpoints have nonzero radius", () => {
    const pts = [new Vector2(0.5, -1), new Vector2(0.5, 1)];
    const geo = new LatheGeometry(pts, 8);
    const pos = defined(geo.getAttribute("position"));
    // Without caps: (2) * (8+1) = 18 vertices
    // With caps: 18 + 2*(1 center + 9 ring) = 18 + 20 = 38
    expect(pos.array.length / pos.itemSize).toBe(38);
  });

  it("cap normals point along Y axis", () => {
    const pts = [new Vector2(0.5, -1), new Vector2(0.5, 1)];
    const geo = new LatheGeometry(pts, 8);
    const nrm = defined(geo.getAttribute("normal"));
    // The bottom cap center is at vertex index 18
    expect(nrm.array[18 * 3]).toBeCloseTo(0, 5);
    expect(nrm.array[18 * 3 + 1]).toBeCloseTo(-1, 5);
    expect(nrm.array[18 * 3 + 2]).toBeCloseTo(0, 5);
  });

  it("no caps when endpoints have zero radius", () => {
    const pts = [new Vector2(0, -1), new Vector2(0.5, 0), new Vector2(0, 1)];
    const geo = new LatheGeometry(pts, 8);
    const pos = defined(geo.getAttribute("position"));
    // No caps: 3 * (8+1) = 27 vertices
    expect(pos.array.length / pos.itemSize).toBe(27);
  });

  it("no caps for partial revolution", () => {
    const pts = [new Vector2(0.5, -1), new Vector2(0.5, 1)];
    const geo = new LatheGeometry(pts, 8, 0, Math.PI);
    const pos = defined(geo.getAttribute("position"));
    // No caps for partial revolution: 2 * (8+1) = 18
    expect(pos.array.length / pos.itemSize).toBe(18);
  });

  it("has index buffer", () => {
    const pts = [new Vector2(0.5, -1), new Vector2(0.5, 1)];
    const geo = new LatheGeometry(pts, 8);
    expect(geo.index).toBeDefined();
  });
});

/**
 * Computes cross product of (b-a) x (c-a).
 *
 * @param {Float32Array} pos
 * @param {number} ai
 * @param {number} bi
 * @param {number} ci
 * @returns {{ nx: number, ny: number, nz: number }}
 */
function faceNormal(
  pos: ArrayLike<number>,
  ai: number,
  bi: number,
  ci: number,
) {
  const ax = pos[ai * 3];
  const ay = pos[ai * 3 + 1];
  const az = pos[ai * 3 + 2];
  const bx = pos[bi * 3];
  const by = pos[bi * 3 + 1];
  const bz = pos[bi * 3 + 2];
  const cx = pos[ci * 3];
  const cy = pos[ci * 3 + 1];
  const cz = pos[ci * 3 + 2];
  const abx = bx - ax;
  const aby = by - ay;
  const abz = bz - az;
  const acx = cx - ax;
  const acy = cy - ay;
  const acz = cz - az;
  return {
    nx: aby * acz - abz * acy,
    ny: abz * acx - abx * acz,
    nz: abx * acy - aby * acx,
  };
}

describe("LatheGeometry winding order", () => {
  it("body face normals point outward", () => {
    const pts = [
      new Vector2(0.5, -1),
      new Vector2(0.5, 0),
      new Vector2(0.5, 1),
    ];
    const geo = new LatheGeometry(pts, 8);
    const pos = defined(geo.getAttribute("position")).array;
    const idx = defined(geo.index);

    for (let f = 0; f < Math.min(16, idx.length / 3); f++) {
      const ai = idx[f * 3];
      const bi = idx[f * 3 + 1];
      const ci = idx[f * 3 + 2];
      const { nx, nz } = faceNormal(pos, ai, bi, ci);

      const mx = (pos[ai * 3] + pos[bi * 3] + pos[ci * 3]) / 3;
      const mz = (pos[ai * 3 + 2] + pos[bi * 3 + 2] + pos[ci * 3 + 2]) / 3;

      const dot = nx * mx + nz * mz;
      expect(dot).toBeGreaterThan(0);
    }
  });

  it("cap face normals point outward (along Y)", () => {
    const pts = [new Vector2(0.5, -1), new Vector2(0.5, 1)];
    const geo = new LatheGeometry(pts, 8);
    const pos = defined(geo.getAttribute("position")).array;
    const idx = defined(geo.index);

    // 1 row * 8 segments * 2 tris = 16 body tris
    const bodyIdxCount = 1 * 8 * 2 * 3;

    for (let f = 0; f < 8; f++) {
      const off = bodyIdxCount + f * 3;
      const { ny } = faceNormal(pos, idx[off], idx[off + 1], idx[off + 2]);
      expect(ny).toBeLessThan(0);
    }

    const topStart = bodyIdxCount + 8 * 3;
    for (let f = 0; f < 8; f++) {
      const off = topStart + f * 3;
      const { ny } = faceNormal(pos, idx[off], idx[off + 1], idx[off + 2]);
      expect(ny).toBeGreaterThan(0);
    }
  });
});

describe("CapsuleGeometry winding order", () => {
  it("body face normals point outward", () => {
    const geo = new CapsuleGeometry(0.5, 1, 4, 8);
    const pos = defined(geo.getAttribute("position")).array;
    const idx = defined(geo.index);

    for (let f = 0; f < Math.min(16, idx.length / 3); f++) {
      const ai = idx[f * 3];
      const bi = idx[f * 3 + 1];
      const ci = idx[f * 3 + 2];
      const { nx, nz } = faceNormal(pos, ai, bi, ci);

      const mx = (pos[ai * 3] + pos[bi * 3] + pos[ci * 3]) / 3;
      const mz = (pos[ai * 3 + 2] + pos[bi * 3 + 2] + pos[ci * 3 + 2]) / 3;

      const dot = nx * mx + nz * mz;
      expect(dot).toBeGreaterThanOrEqual(0);
    }
  });
});
