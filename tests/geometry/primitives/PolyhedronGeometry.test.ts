import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { DodecahedronGeometry } from "@/geometry/primitives/DodecahedronGeometry.js";
import { IcosahedronGeometry } from "@/geometry/primitives/IcosahedronGeometry.js";
import { OctahedronGeometry } from "@/geometry/primitives/OctahedronGeometry.js";
import { PolyhedronGeometry } from "@/geometry/primitives/PolyhedronGeometry.js";
import { TetrahedronGeometry } from "@/geometry/primitives/TetrahedronGeometry.js";
import {
  expectAttributeArraysClose,
  getAttributeCount,
} from "../../_helpers/geometry.ts";

const SUBCLASSES = [
  ["Tetrahedron", TetrahedronGeometry, THREE.TetrahedronGeometry],
  ["Octahedron", OctahedronGeometry, THREE.OctahedronGeometry],
  ["Dodecahedron", DodecahedronGeometry, THREE.DodecahedronGeometry],
  ["Icosahedron", IcosahedronGeometry, THREE.IcosahedronGeometry],
] as const;

describe("PolyhedronGeometry vs THREE.PolyhedronGeometry", () => {
  for (const [name, EaselGeometry, ThreeGeometry] of SUBCLASSES) {
    it(`${name} subdivides into (detail + 1)² triangles like THREE`, () => {
      for (const detail of [0, 1, 2, 3]) {
        const easel = new EaselGeometry(1, detail);
        const three = new ThreeGeometry(1, detail);
        for (const attribute of ["position", "normal", "uv"]) {
          expectAttributeArraysClose(easel, three, attribute, 1e-5);
        }
      }
    });
  }

  it("scales vertex count quadratically instead of by 4^detail", () => {
    expect(getAttributeCount(new IcosahedronGeometry(100, 2), "position")).toBe(
      540,
    );
    expect(
      getAttributeCount(new IcosahedronGeometry(100, 16), "position"),
    ).toBe(17340);
  });

  it("matches THREE for custom vertices with radius and detail", () => {
    const vertices = [1, 1, 1, -1, -1, 1, -1, 1, -1, 1, -1, -1];
    const indices = [2, 1, 0, 0, 3, 2, 1, 3, 0, 2, 3, 1];
    const easel = new PolyhedronGeometry(vertices, indices, 3, 4);
    const three = new THREE.PolyhedronGeometry(vertices, indices, 3, 4);
    for (const attribute of ["position", "normal", "uv"]) {
      expectAttributeArraysClose(easel, three, attribute, 1e-5);
    }
  });
});
