import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { PlaneGeometry } from "@/geometry/primitives/PlaneGeometry.js";
import { defined } from "../../_helpers/defined.js";
import {
  expectAttributeArraysClose,
  expectIndexLengthMatches,
  getAttributeCount,
} from "../../_helpers/geometry.js";

describe("PlaneGeometry vs THREE.PlaneGeometry", () => {
  it("default - vertex count matches", () => {
    expect(getAttributeCount(new PlaneGeometry(), "position")).toBe(
      getAttributeCount(new THREE.PlaneGeometry(), "position"),
    );
  });

  it("default - normals match", () => {
    expectAttributeArraysClose(
      new PlaneGeometry(),
      new THREE.PlaneGeometry(),
      "normal",
    );
  });

  it("default - uvs match", () => {
    expectAttributeArraysClose(
      new PlaneGeometry(),
      new THREE.PlaneGeometry(),
      "uv",
    );
  });

  it("default - index count matches", () => {
    expectIndexLengthMatches(new PlaneGeometry(), new THREE.PlaneGeometry());
  });

  it("custom (5,3,4,2) - vertex count matches", () => {
    expect(getAttributeCount(new PlaneGeometry(5, 3, 4, 2), "position")).toBe(
      getAttributeCount(new THREE.PlaneGeometry(5, 3, 4, 2), "position"),
    );
  });

  it("custom (5,3,4,2) - normals match", () => {
    expectAttributeArraysClose(
      new PlaneGeometry(5, 3, 4, 2),
      new THREE.PlaneGeometry(5, 3, 4, 2),
      "normal",
    );
  });

  it("custom (5,3,4,2) - uvs match", () => {
    expectAttributeArraysClose(
      new PlaneGeometry(5, 3, 4, 2),
      new THREE.PlaneGeometry(5, 3, 4, 2),
      "uv",
    );
  });

  it("custom (5,3,4,2) - index count matches", () => {
    expectIndexLengthMatches(
      new PlaneGeometry(5, 3, 4, 2),
      new THREE.PlaneGeometry(5, 3, 4, 2),
    );
  });
});

describe("PlaneGeometry winding order", () => {
  it("face normals point +Z (CCW from +Z)", () => {
    const geo = new PlaneGeometry(2, 2, 2, 2);
    const pos = defined(geo.getAttribute("position")).array;
    const idx = defined(geo.index);

    for (let t = 0; t < idx.length / 3; t++) {
      const ai = idx[t * 3];
      const bi = idx[t * 3 + 1];
      const ci = idx[t * 3 + 2];

      const abx = pos[bi * 3] - pos[ai * 3];
      const aby = pos[bi * 3 + 1] - pos[ai * 3 + 1];
      const acx = pos[ci * 3] - pos[ai * 3];
      const acy = pos[ci * 3 + 1] - pos[ai * 3 + 1];

      // Z component of cross product (XY plane, z=0)
      const crossZ = abx * acy - aby * acx;
      expect(crossZ).toBeGreaterThan(0);
    }
  });
});
