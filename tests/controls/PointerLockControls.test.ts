import { describe, expect, it } from "bun:test";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.js";
import { PointerLockControls } from "@/controls/PointerLockControls.js";
import { Vector3 } from "@/math/Vector3.js";
import { FakeElement } from "../_helpers/control-dom.ts";
import {
  loadThreeControl,
  THREE,
  type ThreeCamera,
  type ThreePointerLockControls,
} from "../_helpers/three-controls.ts";

const ThreePointerLock = await loadThreeControl<
  new (
    camera: ThreeCamera,
    element?: EventTarget,
  ) => ThreePointerLockControls
>("PointerLockControls");

/**
 * Largest absolute difference allowed between EASEL and three.js results.
 * EASEL stores matrices in `Float32Array`, so matrix-derived axes and
 * Euler/quaternion round trips differ from three.js near 1e-8.
 */
const EPSILON = 1e-6;

function pair(configure?: (camera: { up: { set: Vector3["set"] } }) => void) {
  const easelDom = new FakeElement();
  const threeDom = new FakeElement();
  const easelCamera = new PerspectiveCamera({ fov: 75, near: 1, far: 1000 });
  const threeCamera = new THREE.PerspectiveCamera(75, 1, 1, 1000);
  for (const camera of [easelCamera, threeCamera]) {
    camera.position.set(1, 10, 3);
    configure?.(camera as { up: { set: Vector3["set"] } });
  }
  const easel = new PointerLockControls(easelCamera, easelDom);
  const three = new ThreePointerLock(threeCamera, threeDom);
  const events: { easel: string[]; three: string[] } = { easel: [], three: [] };
  for (const type of ["change", "lock", "unlock"]) {
    easel.addEventListener(type, () => events.easel.push(type));
    three.addEventListener(type, () => events.three.push(type));
  }
  return { easel, three, easelDom, threeDom, easelCamera, threeCamera, events };
}

function maxError(
  easelCamera: PerspectiveCamera,
  threeCamera: ThreeCamera,
): number {
  const e = easelCamera;
  const t = threeCamera;
  return Math.max(
    Math.abs(e.position.x - t.position.x),
    Math.abs(e.position.y - t.position.y),
    Math.abs(e.position.z - t.position.z),
    Math.abs(e.quaternion.x - t.quaternion.x),
    Math.abs(e.quaternion.y - t.quaternion.y),
    Math.abs(e.quaternion.z - t.quaternion.z),
    Math.abs(e.quaternion.w - t.quaternion.w),
  );
}

describe("PointerLockControls parity with three.js r186", () => {
  it("matches defaults", () => {
    const { easel, three } = pair();
    expect(easel.isLocked).toBe(three.isLocked);
    expect(easel.minPolarAngle).toBe(three.minPolarAngle);
    expect(easel.maxPolarAngle).toBe(three.maxPolarAngle);
    expect(easel.pointerSpeed).toBe(three.pointerSpeed);
    expect(easel.enabled).toBe(three.enabled);
  });

  it("locks, looks, walks, and unlocks like three.js", () => {
    const s = pair();
    s.easel.lock();
    s.three.lock();
    expect(s.easel.isLocked).toBe(true);
    expect(s.three.isLocked).toBe(true);
    const moves: Array<[number, number]> = [
      [24, -8],
      [-300, 900],
      [5, -2000],
      [700, 13],
    ];
    for (const [movementX, movementY] of moves) {
      s.easelDom.ownerDocument.fire("mousemove", { movementX, movementY });
      s.threeDom.ownerDocument.fire("mousemove", { movementX, movementY });
      s.easelCamera.updateMatrixWorld();
      s.threeCamera.updateMatrixWorld();
      s.easel.moveForward(1.5);
      s.three.moveForward(1.5);
      s.easel.moveRight(-0.75);
      s.three.moveRight(-0.75);
      expect(maxError(s.easelCamera, s.threeCamera)).toBeLessThan(EPSILON);
    }
    const easelDir = s.easel.getDirection(new Vector3());
    const threeDir = s.three.getDirection(new THREE.Vector3());
    expect(Math.abs(easelDir.x - threeDir.x)).toBeLessThan(EPSILON);
    expect(Math.abs(easelDir.y - threeDir.y)).toBeLessThan(EPSILON);
    expect(Math.abs(easelDir.z - threeDir.z)).toBeLessThan(EPSILON);
    s.easel.unlock();
    s.three.unlock();
    expect(s.easel.isLocked).toBe(false);
    expect(s.events.easel).toEqual(s.events.three);
    expect(s.events.easel).toEqual([
      "lock",
      "change",
      "change",
      "change",
      "change",
      "unlock",
    ]);
  });

  it("clamps polar angles and scales pointer speed", () => {
    const s = pair();
    for (const controls of [s.easel, s.three]) {
      controls.minPolarAngle = Math.PI / 4;
      controls.maxPolarAngle = Math.PI / 2;
      controls.pointerSpeed = 2.5;
      controls.lock();
    }
    for (const movementY of [-1000, 1000, 250]) {
      s.easelDom.ownerDocument.fire("mousemove", { movementX: 9, movementY });
      s.threeDom.ownerDocument.fire("mousemove", { movementX: 9, movementY });
      expect(maxError(s.easelCamera, s.threeCamera)).toBeLessThan(EPSILON);
    }
  });

  it("walks parallel to a custom up plane", () => {
    const s = pair((camera) => camera.up.set(0, 0, 1));
    s.easel.lock();
    s.three.lock();
    s.easelDom.ownerDocument.fire("mousemove", { movementX: 40, movementY: 5 });
    s.threeDom.ownerDocument.fire("mousemove", { movementX: 40, movementY: 5 });
    s.easelCamera.updateMatrixWorld();
    s.threeCamera.updateMatrixWorld();
    s.easel.moveForward(2);
    s.three.moveForward(2);
    expect(maxError(s.easelCamera, s.threeCamera)).toBeLessThan(EPSILON);
  });

  it("ignores input while disabled or unlocked", () => {
    const s = pair();
    s.easelDom.ownerDocument.fire("mousemove", { movementX: 40 });
    s.easel.lock();
    s.easel.enabled = false;
    s.easelDom.ownerDocument.fire("mousemove", { movementX: 40 });
    s.easel.moveForward(3);
    s.easel.moveRight(3);
    expect(s.easelCamera.quaternion.w).toBe(1);
    expect(s.easelCamera.position.toArray()).toEqual([1, 10, 3]);
  });

  it("connects to ownerDocument and disconnects on dispose", () => {
    const s = pair();
    s.easel.lock();
    s.easel.dispose();
    s.easelDom.ownerDocument.fire("mousemove", { movementX: 40 });
    s.easelDom.ownerDocument.exitPointerLock();
    expect(s.easel.isLocked).toBe(true);
    expect(s.events.easel).toEqual(["lock"]);
    s.easel.connect(s.easelDom);
    s.easelDom.ownerDocument.fire("mousemove", { movementX: 40 });
    expect(s.events.easel).toEqual(["lock", "change"]);
  });

  it("constructs without an element and connects later", () => {
    const camera = new PerspectiveCamera();
    const controls = new PointerLockControls(camera);
    expect(controls.domElement).toBeUndefined();
    const dom = new FakeElement();
    controls.connect(dom);
    controls.lock();
    expect(controls.isLocked).toBe(true);
  });
});
