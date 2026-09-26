import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { TorusGeometry } from "../../../src/geometry/primitives/TorusGeometry.ts";
import { defined } from "../../_helpers/defined.ts";
import { getAttributeArray, getIndexArray } from "../../_helpers/geometry.ts";

describe("TorusGeometry", () => {
  it("generates correct vertex count", () => {
    const geo = new TorusGeometry(1, 0.4, 8, 16);
    const pos = defined(geo.getAttribute("position"));
    expect(pos.array.length / pos.itemSize).toBe((8 + 1) * (16 + 1));
  });

  // Replaces "ring lies in XZ plane": r186 builds the ring in the XY plane.
  it("ring lies in the XY plane with the tube along Z", () => {
    const geo = new TorusGeometry(1, 0.4, 8, 16);
    const pos = defined(geo.getAttribute("position"));
    // Quarter of the ring (u = PI/2) on the outer equator: (0, 1.4, 0).
    expect(pos.array[4 * 3]).toBeCloseTo(0, 5);
    expect(pos.array[4 * 3 + 1]).toBeCloseTo(1.4, 5);
    expect(pos.array[4 * 3 + 2]).toBeCloseTo(0, 5);
    // Quarter of the tube (v = PI/2): (radius, 0, tube).
    const top = 2 * (16 + 1) * 3;
    expect(pos.array[top]).toBeCloseTo(1, 5);
    expect(pos.array[top + 1]).toBeCloseTo(0, 5);
    expect(pos.array[top + 2]).toBeCloseTo(0.4, 5);
  });

  it("normals point outward", () => {
    const geo = new TorusGeometry(1, 0.4, 8, 16);
    const nrm = defined(geo.getAttribute("normal"));
    // First normal (u=0, v=0): should point in +X
    expect(nrm.array[0]).toBeCloseTo(1, 5);
    expect(nrm.array[1]).toBeCloseTo(0, 5);
    expect(nrm.array[2]).toBeCloseTo(0, 5);
  });

  it("has index buffer", () => {
    const geo = new TorusGeometry(1, 0.4, 8, 16);
    expect(geo.index).toBeDefined();
    expect(defined<Uint16Array | Uint32Array>(geo.index).length).toBe(
      8 * 16 * 6,
    );
  });
});

describe("TorusGeometry vs THREE.TorusGeometry", () => {
  const cases: [string, ConstructorParameters<typeof TorusGeometry>][] = [
    ["defaults", []],
    ["partial arc", [2, 0.5, 6, 10, Math.PI]],
    ["partial tube (thetaStart, thetaLength)", [1, 0.3, 5, 7, 5, 0.4, 2]],
    ["non-integer segments", [1.5, 0.25, 4.7, 9.2]],
  ];

  for (const [name, args] of cases) {
    it(`${name}: positions, normals, uvs, and indices match exactly`, () => {
      const geometry = new TorusGeometry(...args);
      const expected = new THREE.TorusGeometry(...args);
      for (const attribute of ["position", "normal", "uv"]) {
        expect(getAttributeArray(geometry, attribute)).toEqual(
          getAttributeArray(expected, attribute),
        );
      }
      expect(Array.from(getIndexArray(geometry))).toEqual(
        Array.from(getIndexArray(expected)),
      );
    });
  }

  it("records thetaStart and thetaLength in parameters", () => {
    expect(new TorusGeometry(1, 0.4, 8, 16, 3, 0.5, 1.5).parameters).toEqual({
      radius: 1,
      tube: 0.4,
      radialSegments: 8,
      tubularSegments: 16,
      arc: 3,
      thetaStart: 0.5,
      thetaLength: 1.5,
    });
  });
});
