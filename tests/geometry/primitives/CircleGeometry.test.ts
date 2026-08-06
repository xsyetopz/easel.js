import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { CircleGeometry } from "@/geometry/primitives/CircleGeometry.js";
import {
  expectAttributeArraysClose,
  expectIndexLengthMatches,
} from "../../_helpers/geometry.ts";

describe("CircleGeometry vs THREE.CircleGeometry", () => {
  it("matches default positions, normals, UVs, and indices", () => {
    const EASEL = new CircleGeometry();
    const THREEGeometry = new THREE.CircleGeometry();
    expectAttributeArraysClose(EASEL, THREEGeometry, "position");
    expectAttributeArraysClose(EASEL, THREEGeometry, "normal");
    expectAttributeArraysClose(EASEL, THREEGeometry, "uv");
    expectIndexLengthMatches(EASEL, THREEGeometry);
  });

  it("matches an integer-segment circular sector", () => {
    const EASEL = new CircleGeometry(2, 12, Math.PI / 4, Math.PI);
    const THREEGeometry = new THREE.CircleGeometry(2, 12, Math.PI / 4, Math.PI);
    expectAttributeArraysClose(EASEL, THREEGeometry, "position");
    expectAttributeArraysClose(EASEL, THREEGeometry, "normal");
    expectAttributeArraysClose(EASEL, THREEGeometry, "uv");
    expectIndexLengthMatches(EASEL, THREEGeometry);
  });

  it("normalizes fractional segment counts to an integer mesh", () => {
    const geometry = new CircleGeometry(1, 4.9);
    expect(geometry.getAttribute("position")?.count).toBe(6);
    expect(geometry.index?.length).toBe(12);
  });

  it("keeps zero-radius UVs finite instead of copying THREE.js NaNs", () => {
    const geometry = new CircleGeometry(0, 3);
    const uvs = geometry.getAttribute("uv")?.array ?? [];
    expect(Array.from(uvs).every(Number.isFinite)).toBe(true);
    expect(Array.from(uvs)).toEqual(new Array(10).fill(0.5));
  });
});
