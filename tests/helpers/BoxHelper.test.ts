import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { BoxGeometry } from "@/geometry/primitives/BoxGeometry.js";
import { BoxHelper } from "@/helpers/BoxHelper.js";
import { BasicMaterial } from "@/materials/BasicMaterial.js";
import { Box3 } from "@/math/Box3.js";
import { Vector3 } from "@/math/Vector3.js";
import { Mesh } from "@/objects/Mesh.js";

function positions(helper: BoxHelper): Float32Array {
  const array = helper.geometry?.getAttribute("position")?.array;
  if (!(array instanceof Float32Array)) throw new Error("position missing");
  return array;
}

/** Expands three.js's indexed BoxHelper corners into EASEL's segment list. */
function threeSegments(helper: THREE.BoxHelper): number[] {
  const corners = helper.geometry.getAttribute("position").array;
  const index = helper.geometry.getIndex().array;
  const segments: number[] = [];
  for (let i = 0; i < index.length; i++) {
    const corner = index[i] * 3;
    segments.push(corners[corner], corners[corner + 1], corners[corner + 2]);
  }
  return segments;
}

/** A translated, scaled box mesh with an offset child, in EASEL and three.js. */
function scenePair() {
  const mesh = new Mesh(new BoxGeometry(2, 1, 3), new BasicMaterial());
  mesh.position.set(1, 2, -3);
  mesh.scale.set(2, 1, 0.5);
  const child = new Mesh(new BoxGeometry(1, 1, 1), new BasicMaterial());
  child.position.set(0, 4, 0);
  mesh.add(child);

  const threeMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 3));
  threeMesh.position.set(1, 2, -3);
  threeMesh.scale.set(2, 1, 0.5);
  const threeChild = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  threeChild.position.set(0, 4, 0);
  threeMesh.add(threeChild);
  return { mesh, threeMesh };
}

describe("BoxHelper vs THREE.BoxHelper", () => {
  // r186 builds the wireframe in the constructor. This replaces the old
  // "does not build during construction" test, which pinned the explicit-only
  // EASEL contract that the three.js parity decision reverses.
  it("builds from the object's world box during construction", () => {
    const { mesh, threeMesh } = scenePair();
    const helper = new BoxHelper(mesh);
    const expected = threeSegments(new THREE.BoxHelper(threeMesh));
    expect(Array.from(positions(helper))).toEqual(
      Array.from(new Float32Array(expected)),
    );
    expect(helper.matrixAutoUpdate).toBe(false);
    expect(helper.geometry?.boundingSphere).toBeDefined();
  });

  it("update() recomputes the box from the object's current transform", () => {
    const { mesh, threeMesh } = scenePair();
    const helper = new BoxHelper(mesh);
    const threeHelper = new THREE.BoxHelper(threeMesh);
    const storage = positions(helper);

    mesh.position.set(-5, 0, 1);
    threeMesh.position.set(-5, 0, 1);
    expect(helper.update()).toBe(helper);
    threeHelper.update();

    expect(positions(helper)).toBe(storage);
    expect(Array.from(storage)).toEqual(
      Array.from(new Float32Array(threeSegments(threeHelper))),
    );
    expect(helper.geometry?.getAttribute("position")?.needsUpdate).toBe(true);
  });

  it("setFromObject replaces the source and rebuilds, as a port calling update() still does", () => {
    const { mesh, threeMesh } = scenePair();
    const helper = new BoxHelper(new Box3());
    expect(helper.setFromObject(mesh)).toBe(helper);
    expect(helper.source).toBe(mesh);
    helper.update();
    expect(Array.from(positions(helper))).toEqual(
      Array.from(
        new Float32Array(threeSegments(new THREE.BoxHelper(threeMesh))),
      ),
    );
  });
});

describe("BoxHelper", () => {
  it("writes Box3 sources in three.js edge order without replacing storage", () => {
    const box = new Box3(new Vector3(-1, -2, -3), new Vector3(4, 5, 6));
    const helper = new BoxHelper(box);
    const storage = positions(helper);
    expect(storage.slice(0, 6)).toEqual(new Float32Array([4, 5, 6, -1, 5, 6]));
    box.max.set(7, 5, 6);
    helper.update();
    expect(positions(helper)).toBe(storage);
    expect(storage.slice(0, 3)).toEqual(new Float32Array([7, 5, 6]));
  });

  it("keeps the previous wireframe when the box is empty, as three.js does", () => {
    const box = new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
    const helper = new BoxHelper(box);
    const before = Array.from(positions(helper));
    box.makeEmpty();
    helper.update();
    expect(Array.from(positions(helper))).toEqual(before);
    expect(Array.from(positions(new BoxHelper(new Box3())))).toEqual(
      new Array(72).fill(0),
    );
  });

  // Replaces "rejects objects whose bounds have not been prepared": bounds now
  // come from Box3.setFromObject, so the only invalid source is a non-node.
  it("rejects sources that are neither a Box3 nor a scene node", () => {
    const invalid = { geometry: {} } as unknown as Box3;
    expect(() => new BoxHelper(invalid)).toThrow(TypeError);
  });
});
