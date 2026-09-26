import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.js";
import { FlyControls } from "@/controls/FlyControls.js";
import { Vector3 } from "@/math/Vector3.js";
import { FakeElement, FakeTarget, mouse } from "../_helpers/control-dom.ts";
import {
  loadThreeControl,
  THREE,
  type ThreeCamera,
  type ThreeControls,
} from "../_helpers/three-controls.ts";

/** The three.js r186 FlyControls members these tests read or set. */
interface ThreeFlyControls extends ThreeControls {
  movementSpeed: number;
  rollSpeed: number;
  dragToLook: boolean;
  autoForward: boolean;
  movementSpeedMultiplier?: number;
  update(delta: number): void;
}

const ThreeFly =
  await loadThreeControl<
    new (
      camera: ThreeCamera,
      element?: EventTarget,
    ) => ThreeFlyControls
  >("FlyControls");

/**
 * Largest absolute difference allowed between EASEL and three.js positions
 * and quaternion components. The shared starting orientation comes from
 * EASEL's `lookAt`, which builds its rotation from a `Float32Array` matrix,
 * so the observed error stays near 1e-8.
 */
const EPSILON = 1e-6;

/** Fixed frame time, in seconds, fed to both controls. */
const DELTA = 1 / 60;

/** Fake element with the layout box three.js FlyControls reads. */
class FlyElement extends FakeElement {
  offsetWidth = 800;
  offsetHeight = 600;
  offsetLeft = 12;
  offsetTop = 7;
}

type Settings = Partial<
  Pick<
    FlyControls,
    "movementSpeed" | "rollSpeed" | "dragToLook" | "autoForward"
  >
>;

type Scene = ReturnType<typeof pair>;

const globals = globalThis as unknown as {
  window?: EventTarget | undefined;
  document?: EventTarget | undefined;
};
let windowTarget: FakeTarget & { innerWidth: number; innerHeight: number };
let documentTarget: FlyElement;
let savedWindow: EventTarget | undefined;
let savedDocument: EventTarget | undefined;
let hadWindow = false;
let hadDocument = false;

beforeEach(() => {
  // three.js listens for keys on `window` and reads the window size when the
  // element is `document`; EASEL uses the same `window` when one exists.
  hadWindow = Object.hasOwn(globalThis, "window");
  hadDocument = Object.hasOwn(globalThis, "document");
  savedWindow = globals.window;
  savedDocument = globals.document;
  windowTarget = Object.assign(new FakeTarget(), {
    innerWidth: 1024,
    innerHeight: 768,
  });
  documentTarget = new FlyElement();
  globals.window = windowTarget;
  globals.document = documentTarget;
});

afterEach(() => {
  if (hadWindow) globals.window = savedWindow;
  else delete globals.window;
  if (hadDocument) globals.document = savedDocument;
  else delete globals.document;
});

function pair(
  settings: Settings = {},
  elements: { easel?: FakeElement; three?: FakeElement } = {},
) {
  const easelDom = elements.easel ?? new FlyElement();
  const threeDom = elements.three ?? new FlyElement();
  const easelCamera = new PerspectiveCamera({ fov: 45, near: 1, far: 1000 });
  const threeCamera = new THREE.PerspectiveCamera(45, 1, 1, 1000);
  easelCamera.position.set(1, 10, 3);
  threeCamera.position.set(1, 10, 3);
  easelCamera.updateMatrixWorld();
  easelCamera.lookAt(new Vector3(-4, 2, -7));
  threeCamera.lookAt(-4, 2, -7);
  const easel = new FlyControls(easelCamera, easelDom);
  const three = new ThreeFly(threeCamera, threeDom);
  Object.assign(easel, { rollSpeed: 0.8, movementSpeed: 4, ...settings });
  Object.assign(three, { rollSpeed: 0.8, movementSpeed: 4, ...settings });
  const events: { easel: string[]; three: string[] } = { easel: [], three: [] };
  easel.addEventListener("change", () => events.easel.push("change"));
  three.addEventListener("change", () => events.three.push("change"));
  return { easel, three, easelDom, threeDom, easelCamera, threeCamera, events };
}

function cameraError(s: Scene): number {
  const e = s.easelCamera;
  const t = s.threeCamera;
  const dot =
    e.quaternion.x * t.quaternion.x +
    e.quaternion.y * t.quaternion.y +
    e.quaternion.z * t.quaternion.z +
    e.quaternion.w * t.quaternion.w;
  const sign = dot < 0 ? -1 : 1;
  return Math.max(
    Math.abs(e.position.x - t.position.x),
    Math.abs(e.position.y - t.position.y),
    Math.abs(e.position.z - t.position.z),
    Math.abs(e.quaternion.x - sign * t.quaternion.x),
    Math.abs(e.quaternion.y - sign * t.quaternion.y),
    Math.abs(e.quaternion.z - sign * t.quaternion.z),
    Math.abs(e.quaternion.w - sign * t.quaternion.w),
  );
}

/** Advances both controls `frames` times and returns the largest error seen. */
function run(s: Scene, frames: number, delta = DELTA): number {
  let error = cameraError(s);
  for (let i = 0; i < frames; i++) {
    s.easel.update(delta);
    s.three.update(delta);
    error = Math.max(error, cameraError(s));
  }
  return error;
}

function pointer(
  s: Scene,
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
  fields: Record<string, unknown> = {},
): void {
  s.easelDom.fire(type, fields);
  if (s.threeDom !== s.easelDom) s.threeDom.fire(type, fields);
}

function key(
  type: "keydown" | "keyup",
  code: string,
  fields: Record<string, unknown> = {},
): void {
  windowTarget.fire(type, { code, altKey: false, ...fields });
}

function expectParity(s: Scene, error: number): void {
  expect(error).toBeLessThan(EPSILON);
  expect(s.events.easel).toEqual(s.events.three);
}

describe("FlyControls parity with three.js r186", () => {
  it("matches defaults", () => {
    const easel = new FlyControls(new PerspectiveCamera());
    const three = new ThreeFly(new THREE.PerspectiveCamera());
    for (const field of [
      "enabled",
      "movementSpeed",
      "rollSpeed",
      "dragToLook",
      "autoForward",
    ] as const)
      expect(easel[field]).toBe(three[field]);
    expect(easel.domElement).toBeUndefined();
    const s = pair();
    expect(s.easelDom.style["touchAction"]).toBe("none");
  });

  it("dispatches change on the first update, as three.js compares against an identity start", () => {
    const s = pair();
    const error = run(s, 5);
    expect(s.events.easel).toEqual(["change"]);
    expectParity(s, error);
  });

  it("translates with W/S/A/D/R/F and rotates with arrows and Q/E", () => {
    const s = pair();
    let error = 0;
    const sequence: Array<[string, number]> = [
      ["KeyW", 20],
      ["KeyA", 10],
      ["KeyR", 10],
      ["ArrowUp", 15],
      ["ArrowLeft", 15],
      ["KeyQ", 15],
      ["KeyS", 12],
      ["KeyD", 8],
      ["KeyF", 9],
      ["ArrowDown", 7],
      ["ArrowRight", 7],
      ["KeyE", 30],
    ];
    key("keydown", "KeyE");
    for (const [code, frames] of sequence) {
      key("keydown", code);
      error = Math.max(error, run(s, frames));
      key("keyup", code);
    }
    key("keyup", "KeyE");
    error = Math.max(error, run(s, 10));
    expect(s.events.easel.length).toBeGreaterThan(100);
    expectParity(s, error);
  });

  it("ignores key presses with Alt, and Shift does not change the update speed", () => {
    const s = pair();
    key("keydown", "KeyW", { altKey: true });
    let error = run(s, 10);
    key("keydown", "ShiftLeft");
    key("keydown", "KeyW");
    expect(s.easel.movementSpeedMultiplier).toBe(0.1);
    expect(s.three.movementSpeedMultiplier).toBe(0.1);
    error = Math.max(error, run(s, 20));
    key("keyup", "ShiftLeft");
    expect(s.easel.movementSpeedMultiplier).toBe(1);
    error = Math.max(error, run(s, 20));
    key("keyup", "KeyW");
    expectParity(s, error);
  });

  it("yaws and pitches toward the pointer and moves with the left and right buttons", () => {
    const s = pair();
    pointer(s, "pointermove", mouse(700, 120));
    let error = run(s, 30);
    pointer(s, "pointerdown", mouse(700, 120, 0));
    error = Math.max(error, run(s, 20));
    pointer(s, "pointerup", mouse(700, 120, 0));
    // Releasing a button keeps the pointer look.
    error = Math.max(error, run(s, 20));
    pointer(s, "pointerdown", mouse(90, 560, 2));
    pointer(s, "pointermove", mouse(90, 560, 2));
    error = Math.max(error, run(s, 20));
    pointer(s, "pointercancel");
    error = Math.max(error, run(s, 20));
    expectParity(s, error);
  });

  it("looks only while pressed with dragToLook", () => {
    const s = pair({ dragToLook: true });
    pointer(s, "pointermove", mouse(700, 120));
    let error = run(s, 10);
    const hovered = s.easelCamera.quaternion.clone();
    pointer(s, "pointerdown", mouse(400, 300, 0));
    pointer(s, "pointermove", mouse(150, 500, 0));
    error = Math.max(error, run(s, 30));
    expect(s.easelCamera.quaternion.equals(hovered)).toBe(false);
    pointer(s, "pointerup", mouse(150, 500, 0));
    error = Math.max(error, run(s, 10));
    pointer(s, "pointerdown", mouse(400, 300, 0));
    pointer(s, "pointermove", mouse(600, 100, 0));
    error = Math.max(error, run(s, 10));
    pointer(s, "pointercancel");
    pointer(s, "pointermove", mouse(10, 10, 0));
    error = Math.max(error, run(s, 10));
    expectParity(s, error);
  });

  it("drives forward with autoForward from the next input event until back is held", () => {
    const s = pair({ autoForward: true });
    let error = run(s, 10);
    key("keydown", "KeyZ");
    error = Math.max(error, run(s, 20));
    key("keydown", "KeyS");
    error = Math.max(error, run(s, 10));
    key("keyup", "KeyS");
    error = Math.max(error, run(s, 10));
    expectParity(s, error);
  });

  it("falls back to client bounds on targets without layout offsets", () => {
    const three = Object.assign(new FlyElement(), {
      offsetLeft: 0,
      offsetTop: 0,
    });
    const s = pair({}, { easel: new FakeElement(), three });
    pointer(s, "pointermove", mouse(150, 520));
    expectParity(s, run(s, 30));
  });

  it("uses the window size when the element is the document", () => {
    const s = pair({}, { easel: documentTarget, three: documentTarget });
    pointer(s, "pointermove", mouse(900, 100));
    expectParity(s, run(s, 30));
  });

  it("ignores input and update while disabled", () => {
    const s = pair();
    run(s, 1);
    s.easel.enabled = false;
    s.three.enabled = false;
    key("keydown", "KeyW");
    pointer(s, "pointermove", mouse(700, 120));
    pointer(s, "pointerdown", mouse(700, 120, 0));
    let error = run(s, 10);
    expect(s.easelDom.fire("contextmenu").defaultPrevented).toBe(false);
    s.easel.enabled = true;
    s.three.enabled = true;
    error = Math.max(error, run(s, 10));
    expect(s.easelDom.fire("contextmenu").defaultPrevented).toBe(true);
    expect(s.events.easel).toEqual(["change"]);
    expectParity(s, error);
  });

  it("keeps input state per instance", () => {
    const first = pair();
    const second = pair();
    run(first, 1);
    run(second, 1);
    pointer(first, "pointerdown", mouse(400, 300, 0));
    const before = second.easelCamera.position.clone();
    run(second, 10);
    expect(second.easelCamera.position.equals(before)).toBe(true);
    expectParity(second, cameraError(second));
  });

  it("connects later and moves its listeners when reconnected", () => {
    const lone = new FlyControls(new PerspectiveCamera());
    lone.disconnect();
    expect(lone.domElement).toBeUndefined();

    const s = pair();
    run(s, 1);
    const first = { easel: s.easelDom, three: s.threeDom };
    s.easelDom = new FlyElement();
    s.threeDom = new FlyElement();
    s.easel.connect(s.easelDom);
    s.three.connect(s.threeDom);
    expect(first.easel.style["touchAction"]).toBe("");
    expect(s.easelDom.style["touchAction"]).toBe("none");
    for (const dom of [first.easel, first.three]) {
      dom.fire("pointermove", mouse(700, 120));
      dom.fire("pointerdown", mouse(700, 120, 0));
    }
    let error = run(s, 10);
    expect(s.events.easel).toEqual(["change"]);
    pointer(s, "pointermove", mouse(100, 500));
    key("keydown", "KeyD");
    error = Math.max(error, run(s, 20));
    key("keyup", "KeyD");
    expectParity(s, error);
  });

  it("removes every listener on dispose and restores touch scrolling", () => {
    const s = pair();
    run(s, 1);
    s.easel.dispose();
    s.three.dispose();
    key("keydown", "KeyW");
    pointer(s, "pointermove", mouse(700, 120));
    pointer(s, "pointerdown", mouse(700, 120, 0));
    const error = run(s, 10);
    expect(s.easelDom.style["touchAction"]).toBe("");
    expect(s.easelDom.fire("contextmenu").defaultPrevented).toBe(false);
    expect(s.events.easel).toEqual(["change"]);
    expectParity(s, error);
  });
});
