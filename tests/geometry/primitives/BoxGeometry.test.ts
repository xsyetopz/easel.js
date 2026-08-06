import { describe, it } from "bun:test";
import * as THREE from "three";
import { BoxGeometry } from "@/geometry/primitives/BoxGeometry.js";
import {
  expectAttributeArraysClose,
  expectIndexLengthMatches,
} from "../../_helpers/geometry.ts";

describe("BoxGeometry vs THREE.BoxGeometry", () => {
  it("default constructor - positions match", () => {
    expectAttributeArraysClose(
      new BoxGeometry(),
      new THREE.BoxGeometry(),
      "position",
    );
  });

  it("default constructor - normals match", () => {
    expectAttributeArraysClose(
      new BoxGeometry(),
      new THREE.BoxGeometry(),
      "normal",
    );
  });

  it("default constructor - uvs match", () => {
    expectAttributeArraysClose(
      new BoxGeometry(),
      new THREE.BoxGeometry(),
      "uv",
    );
  });

  it("default constructor - index count matches", () => {
    expectIndexLengthMatches(new BoxGeometry(), new THREE.BoxGeometry());
  });

  it("custom dimensions + segments - positions match", () => {
    expectAttributeArraysClose(
      new BoxGeometry(2, 3, 4, 2, 3, 4),
      new THREE.BoxGeometry(2, 3, 4, 2, 3, 4),
      "position",
    );
  });

  it("custom dimensions + segments - normals match", () => {
    expectAttributeArraysClose(
      new BoxGeometry(2, 3, 4, 2, 3, 4),
      new THREE.BoxGeometry(2, 3, 4, 2, 3, 4),
      "normal",
    );
  });

  it("custom dimensions + segments - uvs match", () => {
    expectAttributeArraysClose(
      new BoxGeometry(2, 3, 4, 2, 3, 4),
      new THREE.BoxGeometry(2, 3, 4, 2, 3, 4),
      "uv",
    );
  });

  it("custom dimensions + segments - index count matches", () => {
    expectIndexLengthMatches(
      new BoxGeometry(2, 3, 4, 2, 3, 4),
      new THREE.BoxGeometry(2, 3, 4, 2, 3, 4),
    );
  });
});
