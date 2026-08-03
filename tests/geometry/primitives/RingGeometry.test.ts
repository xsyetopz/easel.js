import { describe, it } from "bun:test";
import * as THREE from "three";
import { RingGeometry } from "@/geometry/primitives/RingGeometry.js";
import {
  expectAttributeArraysClose,
  expectIndexLengthMatches,
} from "../../_helpers/geometry.js";

describe("RingGeometry vs THREE.RingGeometry", () => {
  it("default - positions match", () => {
    expectAttributeArraysClose(
      new RingGeometry(),
      new THREE.RingGeometry(),
      "position",
    );
  });

  it("default - normals match", () => {
    expectAttributeArraysClose(
      new RingGeometry(),
      new THREE.RingGeometry(),
      "normal",
    );
  });

  it("default - uvs match", () => {
    expectAttributeArraysClose(
      new RingGeometry(),
      new THREE.RingGeometry(),
      "uv",
    );
  });

  it("default - index count matches", () => {
    expectIndexLengthMatches(new RingGeometry(), new THREE.RingGeometry());
  });

  it("custom (0.5,2,16,2) - positions match", () => {
    expectAttributeArraysClose(
      new RingGeometry(0.5, 2, 16, 2),
      new THREE.RingGeometry(0.5, 2, 16, 2),
      "position",
    );
  });

  it("custom (0.5,2,16,2) - normals match", () => {
    expectAttributeArraysClose(
      new RingGeometry(0.5, 2, 16, 2),
      new THREE.RingGeometry(0.5, 2, 16, 2),
      "normal",
    );
  });

  it("custom (0.5,2,16,2) - uvs match", () => {
    expectAttributeArraysClose(
      new RingGeometry(0.5, 2, 16, 2),
      new THREE.RingGeometry(0.5, 2, 16, 2),
      "uv",
    );
  });

  it("custom (0.5,2,16,2) - index count matches", () => {
    expectIndexLengthMatches(
      new RingGeometry(0.5, 2, 16, 2),
      new THREE.RingGeometry(0.5, 2, 16, 2),
    );
  });
});
