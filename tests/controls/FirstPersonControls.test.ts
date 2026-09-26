import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.js";
import { FirstPersonControls } from "@/controls/FirstPersonControls.js";
import { Vector3 } from "@/math/Vector3.js";
import {
  FakeElement,
  FakeTarget,
  mouse,
  touch,
} from "../_helpers/control-dom.ts";
import {
  loadThreeControl,
  THREE,
  type ThreeCamera,
  type ThreeControls,
  type ThreeVector3,
} from "../_helpers/three-controls.ts";

/** The three.js r186 FirstPersonControls members these tests read or set. */
interface ThreeFirstPersonControls extends ThreeControls {
  movementSpeed: number;
  lookSpeed: number;
  dampingFactor: number;
  lookVertical: boolean;
  autoForward: boolean;
  heightSpeed: boolean;
  heightCoef: number;
  heightMin: number;
  heightMax: number;
  constrainVertical: boolean;
  verticalMin: number;
  verticalMax: number;
  mouseDragOn: boolean;
  lookAt(x: number | ThreeVector3, y?: number, z?: number): this;
  update(delta: number): void;
}

const ThreeFirstPerson = await loadThreeControl<
  new (
    camera: ThreeCamera,
    element?: EventTarget,
  ) => ThreeFirstPersonControls
>("FirstPersonControls");

/**
 * Largest absolute difference allowed between EASEL and three.js positions
 * and quaternion components. EASEL's `lookAt` builds its rotation from a
 * `Float32Array` matrix, so each frame's orientation differs from three.js
 * near 1e-8.
 */
const EPSILON = 1e-6;

/** Fixed frame time, in seconds, fed to both controls. */
const DELTA = 1 / 60;

type Settings = Partial<
  Pick<
    FirstPersonControls,
    | "movementSpeed"
    | "lookSpeed"
    | "dampingFactor"
    | "lookVertical"
    | "autoForward"
    | "heightSpeed"
    | "heightCoef"
    | "heightMin"
    | "heightMax"
    | "constrainVertical"
    | "verticalMin"
    | "verticalMax"
  >
>;

type Scene = ReturnType<typeof pair>;

const globals = globalThis as unknown as {
  window?: EventTarget | undefined;
  document?: EventTarget | undefined;
};
let windowTarget: FakeTarget;
let savedWindow: EventTarget | undefined;
let savedDocument: EventTarget | undefined;
let hadWindow = false;
let hadDocument = false;

beforeEach(() => {
  // three.js listens for keys on `window` and compares the element to
  // `document`; EASEL uses the same `window` when one exists.
  hadWindow = Object.hasOwn(globalThis, "window");
  hadDocument = Object.hasOwn(globalThis, "document");
  savedWindow = globals.window;
  savedDocument = globals.document;
  windowTarget = new FakeTarget();
  globals.window = windowTarget;
  globals.document = new FakeTarget();
});

afterEach(() => {
  if (hadWindow) globals.window = savedWindow;
  else delete globals.window;
  if (hadDocument) globals.document = savedDocument;
  else delete globals.document;
});

function pair(
  settings: Settings = {},
  options: { up?: [number, number, number] } = {},
) {
  const easelDom = new FakeElement();
  const threeDom = new FakeElement();
  const easelCamera = new PerspectiveCamera({ fov: 75, near: 1, far: 1000 });
  const threeCamera = new THREE.PerspectiveCamera(75, 1, 1, 1000);
  easelCamera.position.set(1, 0.4, 3);
  threeCamera.position.set(1, 0.4, 3);
  if (options.up) {
    easelCamera.up.set(...options.up);
    threeCamera.up.set(...options.up);
  }
  easelCamera.updateMatrixWorld();
  easelCamera.lookAt(new Vector3(-4, 2, -7));
  threeCamera.lookAt(-4, 2, -7);
  const easel = new FirstPersonControls(easelCamera, easelDom);
  const three = new ThreeFirstPerson(threeCamera, threeDom);
  Object.assign(easel, settings);
  Object.assign(three, settings);
  const events: { easel: string[]; three: string[] } = { easel: [], three: [] };
  for (const type of ["change", "start", "end"]) {
    easel.addEventListener(type, () => events.easel.push(type));
    three.addEventListener(type, () => events.three.push(type));
  }
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

/** Fires the same pointer event on both elements or both owner documents. */
function pointer(
  s: Scene,
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
  fields: Record<string, unknown>,
): void {
  for (const dom of [s.easelDom, s.threeDom]) {
    const target = type === "pointerdown" ? dom : dom.ownerDocument;
    target.fire(type, fields);
  }
}

function key(type: "keydown" | "keyup", code: string): void {
  windowTarget.fire(type, { code });
}

function expectParity(s: Scene, error: number): void {
  expect(error).toBeLessThan(EPSILON);
  expect(s.easel.mouseDragOn).toBe(s.three.mouseDragOn);
  expect(s.events.easel).toEqual(s.events.three);
}

describe("FirstPersonControls parity with three.js r186", () => {
  it("matches defaults and the initial orientation", () => {
    const s = pair();
    const fields = [
      "enabled",
      "movementSpeed",
      "lookSpeed",
      "dampingFactor",
      "lookVertical",
      "autoForward",
      "heightSpeed",
      "heightCoef",
      "heightMin",
      "heightMax",
      "constrainVertical",
      "verticalMin",
      "verticalMax",
      "mouseDragOn",
    ] as const;
    for (const field of fields) expect(s.easel[field]).toBe(s.three[field]);
    expect(s.easelDom.style["touchAction"]).toBe("none");
    expectParity(s, run(s, 30));
  });

  it("walks with W/A/S/D, arrows, and R/F on world axes", () => {
    const s = pair({ movementSpeed: 3 });
    let error = 0;
    const sequence: Array<[string, number]> = [
      ["KeyW", 20],
      ["KeyA", 15],
      ["KeyR", 10],
      ["ArrowDown", 12],
      ["ArrowRight", 8],
      ["KeyF", 9],
      ["ArrowUp", 7],
      ["ArrowLeft", 7],
      ["KeyS", 5],
      ["KeyD", 5],
    ];
    key("keydown", "KeyD");
    for (const [code, frames] of sequence) {
      key("keydown", code);
      error = Math.max(error, run(s, frames));
      key("keyup", code);
    }
    key("keyup", "KeyD");
    // Space and Shift are not bindings.
    key("keydown", "Space");
    key("keydown", "ShiftLeft");
    error = Math.max(error, run(s, 60));
    expect(s.easelCamera.position.y).toBeCloseTo(s.threeCamera.position.y, 6);
    expectParity(s, error);
  });

  it("moves along the look direction with the left and right buttons while dragging to look", () => {
    const s = pair({ movementSpeed: 2, lookSpeed: 0.2 });
    pointer(s, "pointerdown", mouse(400, 300, 0));
    expect(s.easel.mouseDragOn).toBe(true);
    let error = run(s, 5);
    pointer(s, "pointermove", mouse(460, 280, 0));
    error = Math.max(error, run(s, 20));
    pointer(s, "pointermove", mouse(310, 390, 0));
    error = Math.max(error, run(s, 20));
    pointer(s, "pointerup", mouse(310, 390, 0));
    error = Math.max(error, run(s, 40));
    pointer(s, "pointerdown", mouse(200, 200, 2));
    pointer(s, "pointermove", mouse(150, 260, 2));
    error = Math.max(error, run(s, 25));
    pointer(s, "pointerup", mouse(150, 260, 2));
    error = Math.max(error, run(s, 40));
    expect(s.easelDom.captured.size).toBe(0);
    expectParity(s, error);
  });

  it("only looks when the pointer is pressed while a forward or back key is held", () => {
    const s = pair({ lookSpeed: 0.3, dampingFactor: 1 });
    key("keydown", "KeyW");
    pointer(s, "pointerdown", mouse(100, 100, 2));
    pointer(s, "pointermove", mouse(180, 60, 2));
    let error = run(s, 15);
    key("keyup", "KeyW");
    error = Math.max(error, run(s, 15));
    pointer(s, "pointercancel", mouse(180, 60, 2));
    error = Math.max(error, run(s, 15));
    expectParity(s, error);
  });

  it("moves forward with one touch and back with two", () => {
    const s = pair({ lookSpeed: 0.1 });
    pointer(s, "pointerdown", touch(100, 100, 1));
    let error = run(s, 10);
    pointer(s, "pointerdown", touch(300, 100, 2));
    pointer(s, "pointermove", touch(340, 150, 2));
    error = Math.max(error, run(s, 10));
    pointer(s, "pointerup", touch(340, 150, 2));
    error = Math.max(error, run(s, 10));
    pointer(s, "pointerup", touch(100, 100, 1));
    expect(s.easel.mouseDragOn).toBe(false);
    error = Math.max(error, run(s, 20));
    expectParity(s, error);
  });

  it("maps vertical look into verticalMin..verticalMax and ignores it when lookVertical is false", () => {
    const constrained = pair({
      lookSpeed: 0.4,
      constrainVertical: true,
      verticalMin: 1.0,
      verticalMax: 2.0,
    });
    pointer(constrained, "pointerdown", mouse(0, 0, 1));
    pointer(constrained, "pointermove", mouse(90, -400, 1));
    let error = run(constrained, 120);
    expectParity(constrained, error);

    const flat = pair({ lookSpeed: 0.4, lookVertical: false });
    pointer(flat, "pointerdown", mouse(0, 0, 1));
    pointer(flat, "pointermove", mouse(-120, 300, 1));
    error = run(flat, 60);
    expectParity(flat, error);
  });

  it("clamps latitude at 85 degrees", () => {
    const s = pair({ lookSpeed: 2, dampingFactor: 1 });
    pointer(s, "pointerdown", mouse(0, 0, 1));
    pointer(s, "pointermove", mouse(0, -500, 1));
    expectParity(s, run(s, 90));
  });

  it("drives forward automatically and speeds up with height", () => {
    const s = pair({
      autoForward: true,
      heightSpeed: true,
      heightCoef: 2,
      heightMin: 0,
      heightMax: 5,
      movementSpeed: 1.5,
    });
    let error = run(s, 30);
    key("keydown", "KeyS");
    error = Math.max(error, run(s, 10));
    key("keyup", "KeyS");
    key("keydown", "KeyR");
    error = Math.max(error, run(s, 20));
    key("keyup", "KeyR");
    error = Math.max(error, run(s, 20));
    expectParity(s, error);
  });

  it("turns toward coordinates or a vector with lookAt and keeps looking from there", () => {
    const s = pair({ lookSpeed: 0.2 });
    expect(s.easel.lookAt(10, 3, -2)).toBe(s.easel);
    s.three.lookAt(10, 3, -2);
    let error = cameraError(s);
    pointer(s, "pointerdown", mouse(10, 10, 1));
    pointer(s, "pointermove", mouse(60, 30, 1));
    error = Math.max(error, run(s, 20));
    s.easel.lookAt(new Vector3(-5, -1, 4));
    s.three.lookAt(new THREE.Vector3(-5, -1, 4));
    error = Math.max(error, run(s, 20));
    expectParity(s, error);
  });

  it("uses camera.up for its lookAt basis", () => {
    const s = pair({ lookSpeed: 0.1 }, { up: [0, 0, 1] });
    key("keydown", "KeyA");
    pointer(s, "pointerdown", mouse(10, 10, 1));
    pointer(s, "pointermove", mouse(40, -20, 1));
    const error = run(s, 30);
    key("keyup", "KeyA");
    expectParity(s, error);
  });

  it("ignores update while disabled but keeps tracking input, like three.js", () => {
    const s = pair({ dampingFactor: 1 });
    s.easel.enabled = false;
    s.three.enabled = false;
    key("keydown", "KeyW");
    pointer(s, "pointerdown", mouse(0, 0, 0));
    let error = run(s, 10);
    const contextMenu = s.easelDom.fire("contextmenu");
    expect(contextMenu.defaultPrevented).toBe(false);
    s.easel.enabled = true;
    s.three.enabled = true;
    error = Math.max(error, run(s, 10));
    expect(s.easelDom.fire("contextmenu").defaultPrevented).toBe(true);
    key("keyup", "KeyW");
    expectParity(s, error);
  });

  it("removes every listener on dispose and restores touch scrolling", () => {
    const s = pair({ dampingFactor: 1 });
    s.easel.dispose();
    s.three.dispose();
    key("keydown", "KeyW");
    pointer(s, "pointerdown", mouse(0, 0, 0));
    pointer(s, "pointermove", mouse(50, 50, 0));
    expect(s.easel.mouseDragOn).toBe(false);
    expect(s.easelDom.style["touchAction"]).toBe("");
    expect(s.easelDom.fire("contextmenu").defaultPrevented).toBe(false);
    expectParity(s, run(s, 10));
    key("keyup", "KeyW");
  });

  it("connects later and moves its listeners when reconnected", () => {
    const lone = new FirstPersonControls(new PerspectiveCamera());
    expect(lone.domElement).toBeUndefined();
    lone.disconnect();

    const s = pair({ dampingFactor: 1, lookSpeed: 0.2 });
    const first = { easel: s.easelDom, three: s.threeDom };
    s.easelDom = new FakeElement();
    s.threeDom = new FakeElement();
    s.easel.connect(s.easelDom);
    s.three.connect(s.threeDom);
    expect(s.easel.domElement).toBe(s.easelDom);
    expect(first.easel.style["touchAction"]).toBe("");
    expect(s.easelDom.style["touchAction"]).toBe("none");
    for (const dom of [first.easel, first.three]) {
      dom.fire("pointerdown", mouse(0, 0, 0));
      dom.ownerDocument.fire("pointermove", mouse(80, 40, 0));
    }
    expect(s.easel.mouseDragOn).toBe(false);
    let error = run(s, 10);
    pointer(s, "pointerdown", mouse(0, 0, 0));
    pointer(s, "pointermove", mouse(80, 40, 0));
    for (const dom of [first.easel, first.three])
      dom.ownerDocument.fire("pointerup", mouse(80, 40, 0));
    expect(s.easel.mouseDragOn).toBe(true);
    error = Math.max(error, run(s, 20));
    pointer(s, "pointerup", mouse(80, 40, 0));
    expectParity(s, error);
  });

  it("warns that handleResize was removed", () => {
    const spy = spyOn(console, "warn").mockImplementation(() => undefined);
    const s = pair();
    s.easel.handleResize();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0]?.[0])).toContain("handleResize");
    spy.mockRestore();
  });
});
