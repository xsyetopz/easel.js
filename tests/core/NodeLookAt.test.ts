import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.js";
import { Node } from "@/core/Node.js";
import { RectAreaLight } from "@/lights/RectAreaLight.js";
import { Vector3 } from "@/math/Vector3.js";

interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

interface Angles {
  x: number;
  y: number;
  z: number;
}

/** three.js r186 `Object3D` surface these tests drive. */
interface THREELookAtNode {
  position: { set(x: number, y: number, z: number): unknown };
  rotation: Angles & { set(x: number, y: number, z: number): unknown };
  quaternion: Quat;
  add(child: THREELookAtNode): unknown;
  lookAt(x: number, y: number, z: number): void;
}

const THREELookAt = THREE as unknown as {
  Object3D: new () => THREELookAtNode;
  PerspectiveCamera: new () => THREELookAtNode;
  RectAreaLight: new () => THREELookAtNode;
};

const EPSILON = 1e-6;

function expectQuaternion(actual: Quat, expected: Quat): void {
  expect(Math.abs(actual.x - expected.x)).toBeLessThan(EPSILON);
  expect(Math.abs(actual.y - expected.y)).toBeLessThan(EPSILON);
  expect(Math.abs(actual.z - expected.z)).toBeLessThan(EPSILON);
  expect(Math.abs(actual.w - expected.w)).toBeLessThan(EPSILON);
}

function expectAngles(actual: Angles, expected: Angles): void {
  expect(Math.abs(actual.x - expected.x)).toBeLessThan(EPSILON);
  expect(Math.abs(actual.y - expected.y)).toBeLessThan(EPSILON);
  expect(Math.abs(actual.z - expected.z)).toBeLessThan(EPSILON);
}

describe("Node.lookAt parity with three.js r186", () => {
  it("refreshes a stale world matrix before reading the eye position", () => {
    const camera = new PerspectiveCamera();
    camera.position.set(5, 2.5, 5);
    camera.lookAt(0.2, 0.1, -0.1);

    const reference = new THREELookAt.PerspectiveCamera();
    reference.position.set(5, 2.5, 5);
    reference.lookAt(0.2, 0.1, -0.1);

    expectQuaternion(camera.quaternion, reference.quaternion);
    expectQuaternion(camera.quaternion, {
      x: -0.1527486,
      y: 0.3636351,
      z: 0.0605766,
      w: 0.9169339,
    });
  });

  it("returns three.js's quaternion sign, not an Euler round-trip", () => {
    for (let i = 0; i < 500; i++) {
      const eye = [
        Math.sin(i) * 7,
        Math.cos(i * 1.3) * 7,
        Math.sin(i * 0.7) * 7,
      ];
      const target = [Math.cos(i * 2.1), Math.sin(i * 0.3), Math.cos(i * 0.9)];

      const node = new Node();
      node.position.set(eye[0], eye[1], eye[2]);
      node.lookAt(target[0], target[1], target[2]);

      const reference = new THREELookAt.Object3D();
      reference.position.set(eye[0], eye[1], eye[2]);
      reference.lookAt(target[0], target[1], target[2]);

      expectQuaternion(node.quaternion, reference.quaternion);
      expectAngles(node.rotation, reference.rotation);
    }
  });

  it("accepts a vector target without changing it", () => {
    const target = new Vector3(-3, 1, 4);
    const node = new Node();
    node.position.set(0.5, -1, 2);
    node.lookAt(target);

    const reference = new THREELookAt.Object3D();
    reference.position.set(0.5, -1, 2);
    reference.lookAt(-3, 1, 4);

    expectQuaternion(node.quaternion, reference.quaternion);
    expect(target.toArray()).toEqual([-3, 1, 4]);
  });

  it("removes a rotated, moved parent's rotation and keeps rotation in sync", () => {
    const parent = new Node();
    parent.rotation.set(0.4, -0.7, 0.2);
    parent.position.set(1, 2, 3);
    const child = new Node();
    child.position.set(0.5, -1, 2);
    parent.add(child);
    child.lookAt(-3, 1, 4);

    const referenceParent = new THREELookAt.Object3D();
    referenceParent.rotation.set(0.4, -0.7, 0.2);
    referenceParent.position.set(1, 2, 3);
    const referenceChild = new THREELookAt.Object3D();
    referenceChild.position.set(0.5, -1, 2);
    referenceParent.add(referenceChild);
    referenceChild.lookAt(-3, 1, 4);

    expectQuaternion(child.quaternion, referenceChild.quaternion);
    expectAngles(child.rotation, referenceChild.rotation);
  });

  it("points a light's -Z axis at the target, like a camera", () => {
    const light = new RectAreaLight();
    light.position.set(0, 5, 5);
    light.lookAt(0, 0, 0);

    const reference = new THREELookAt.RectAreaLight();
    reference.position.set(0, 5, 5);
    reference.lookAt(0, 0, 0);

    expect(light.isLight).toBe(true);
    expectQuaternion(light.quaternion, reference.quaternion);
  });
});
