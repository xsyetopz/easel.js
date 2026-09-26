import { describe, expect, it } from "bun:test";
import {
  ConeGeometry as TConeGeometry,
  CylinderGeometry as TCylinderGeometry,
} from "three";
import { ConeGeometry } from "@/geometry/primitives/ConeGeometry.js";
import { CylinderGeometry } from "@/geometry/primitives/CylinderGeometry.js";
import { defined } from "../../_helpers/defined.ts";
import { expectUnitNormals } from "../../_helpers/geometry.ts";

describe("CylinderGeometry", () => {
  it("default - has position, normal, uv, index", () => {
    const geo = new CylinderGeometry();
    expect(defined(geo.getAttribute("position"))).toBeDefined();
    expect(defined(geo.getAttribute("normal"))).toBeDefined();
    expect(defined(geo.getAttribute("uv"))).toBeDefined();
    expect(geo.index).not.toBeUndefined();
  });

  it("default - vertex count > 0", () => {
    const geo = new CylinderGeometry();
    expect(defined(geo.getAttribute("position")).count).toBeGreaterThan(0);
  });

  it("default - normals are unit length", () => {
    const normals = defined(
      new CylinderGeometry().getAttribute("normal"),
    ).array;
    expectUnitNormals(normals, 4);
  });

  it("custom (1,0.5,3,16,2) - bounding box height matches", () => {
    const pos = defined(
      new CylinderGeometry(1, 0.5, 3, 16, 2).getAttribute("position"),
    ).array;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (let i = 1; i < pos.length; i += 3) {
      if (pos[i] < minY) minY = pos[i];
      if (pos[i] > maxY) maxY = pos[i];
    }
    expect(maxY - minY).toBeCloseTo(3, 3);
  });

  it("custom (1,0.5,3,16,2) - radii match constructor args", () => {
    // CylinderGeometry(radiusTop=1, radiusBottom=0.5, ...)
    const pos = defined(
      new CylinderGeometry(1, 0.5, 3, 16, 2).getAttribute("position"),
    ).array;
    let maxRadiusTop = 0;
    let maxRadiusBot = 0;
    const halfH = 3 / 2;
    for (let i = 0; i < pos.length; i += 3) {
      const r = Math.sqrt(pos[i] ** 2 + pos[i + 2] ** 2);
      if (pos[i + 1] > halfH - 0.1) maxRadiusTop = Math.max(maxRadiusTop, r);
      if (pos[i + 1] < -halfH + 0.1) {
        maxRadiusBot = Math.max(maxRadiusBot, r);
      }
    }
    expect(maxRadiusTop).toBeCloseTo(1, 1);
    expect(maxRadiusBot).toBeCloseTo(0.5, 1);
  });

  it("more segments → more vertices", () => {
    const lo = defined(
      new CylinderGeometry(1, 1, 1, 8, 1).getAttribute("position"),
    ).count;
    const hi = defined(
      new CylinderGeometry(1, 1, 1, 16, 1).getAttribute("position"),
    ).count;
    expect(hi).toBeGreaterThan(lo);
  });

  it("type is CylinderGeometry", () => {
    expect(new CylinderGeometry().type).toBe("CylinderGeometry");
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

describe("CylinderGeometry cap winding", () => {
  it("top cap normals point +Y", () => {
    const geo = new CylinderGeometry(1, 1, 2, 8, 1, false);
    const pos = defined(geo.getAttribute("position")).array;
    const idx = defined<Uint16Array | Uint32Array>(geo.index);

    // Body: 8 cols * 1 row * 2 triangles = 16 triangles = 48 indices
    // Top cap starts at 48
    const bodyIdxCount = 8 * 1 * 2 * 3;
    for (let f = 0; f < 8; f++) {
      const off = bodyIdxCount + f * 3;
      const { ny } = faceNormal(pos, idx[off], idx[off + 1], idx[off + 2]);
      expect(ny).toBeGreaterThan(0);
    }
  });

  it("bottom cap normals point -Y", () => {
    const geo = new CylinderGeometry(1, 1, 2, 8, 1, false);
    const pos = defined(geo.getAttribute("position")).array;
    const idx = defined<Uint16Array | Uint32Array>(geo.index);

    // Body: 48 indices, top cap: 8*3=24, bottom cap starts at 72
    const bodyIdxCount = 8 * 1 * 2 * 3;
    const topCapIdxCount = 8 * 3;
    const bottomStart = bodyIdxCount + topCapIdxCount;
    for (let f = 0; f < 8; f++) {
      const off = bottomStart + f * 3;
      const { ny } = faceNormal(pos, idx[off], idx[off + 1], idx[off + 2]);
      expect(ny).toBeLessThan(0);
    }
  });
});

describe("CylinderGeometry parity with three.js r186", () => {
  type CylinderArgs = [
    radiusTop: number,
    radiusBottom: number,
    height: number,
    radialSegments: number,
    heightSegments?: number,
    openEnded?: boolean,
    thetaStart?: number,
    thetaLength?: number,
  ];
  type THREECylinderConstructor = new (
    ...args: CylinderArgs
  ) => TCylinderGeometry;
  const THREECylinder =
    TCylinderGeometry as unknown as THREECylinderConstructor;
  type THREEConeConstructor = new (
    radius: number,
    height: number,
    radialSegments: number,
    heightSegments?: number,
    openEnded?: boolean,
  ) => TConeGeometry;
  const THREECone = TConeGeometry as unknown as THREEConeConstructor;

  interface GeometryArrays {
    getAttribute(name: string): { array: ArrayLike<number> } | undefined;
  }

  function expectSameArrays(
    actual: GeometryArrays,
    actualIndex: ArrayLike<number> | undefined,
    expected: GeometryArrays,
    expectedIndex: ArrayLike<number> | undefined,
  ): void {
    for (const name of ["position", "normal", "uv"]) {
      expect(Array.from(defined(actual.getAttribute(name)).array)).toEqual(
        Array.from(defined(expected.getAttribute(name)).array),
      );
    }
    expect(Array.from(actualIndex ?? [])).toEqual(
      Array.from(expectedIndex ?? []),
    );
  }

  const cases: CylinderArgs[] = [
    // TransformControls picker arrow: zero bottom radius.
    [0.2, 0, 0.6, 4],
    [0, 0.04, 0.1, 8],
    [0, 0.5, 1, 5, 2],
    [0, 0, 1, 3],
    [1, 0.5, 3, 16, 2],
    [0.3, 0.4, 1, 6, 1, true],
    [0.7, 0.2, 2, 7, 3, false, 0.4, Math.PI],
  ];

  for (const args of cases) {
    it(`matches positions, normals, UVs, and indices for (${args.join(", ")})`, () => {
      const actual = new CylinderGeometry(...args);
      const expected = new THREECylinder(...args);
      expectSameArrays(actual, actual.index, expected, expected.index?.array);
    });
  }

  it("emits 57 position floats for (0.2, 0, 0.6, 4), like three.js", () => {
    expect(
      defined(new CylinderGeometry(0.2, 0, 0.6, 4).getAttribute("position"))
        .array.length,
    ).toBe(57);
  });

  it("ConeGeometry matches three.js", () => {
    const actual = new ConeGeometry(0.5, 1.5, 6, 2);
    const expected = new THREECone(0.5, 1.5, 6, 2);
    expectSameArrays(actual, actual.index, expected, expected.index?.array);
  });
});
