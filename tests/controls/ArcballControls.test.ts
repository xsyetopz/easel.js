/**
 * Side-by-side parity tests for ArcballControls against three.js r186.
 *
 * One fake element and one fake window feed identical pointer, touch, and
 * wheel events to both controls. `performance.now`, event `timeStamp`, and
 * `requestAnimationFrame` all read one test-controlled clock, so rotation
 * inertia and the focus animation run the same frames on both sides.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { OrthographicCamera } from "@/cameras/OrthographicCamera.js";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.js";
import {
  type ArcballCamera,
  ArcballControls,
  type ArcballModifierKey,
  type ArcballMouseInput,
  type ArcballOperation,
} from "@/controls/ArcballControls.js";
import type { Node } from "@/core/Node.js";
import { Scene } from "@/core/Scene.js";
import { BoxGeometry } from "@/geometry/primitives/BoxGeometry.js";
import { BasicMaterial } from "@/materials/BasicMaterial.js";
import type { Line } from "@/objects/Line.js";
import { Mesh } from "@/objects/Mesh.js";
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
  type ThreeObject3D,
  type ThreeVector3,
} from "../_helpers/three-controls.ts";

/**
 * Tolerance: each compared number must satisfy
 * `|easel - three| < EPSILON * max(1, |three|)`. EASEL stores matrices as
 * Float32 and Arcball round-trips the camera through its matrix state on
 * every step, so errors scale with the magnitude of the compared value.
 */
const EPSILON = 1e-6;
/**
 * Bound for perspective sequences whose rotation inertia runs at full speed.
 * The inertia axis comes from cursor points unprojected through the Float32
 * `projectionMatrixInverse`, and inertia spins it by up to `wMax² / (2 *
 * dampingFactor)` = 8 rad, so the ~1e-7 axis error grows to a few 1e-6 at a
 * camera distance of 6. With `wMax` 8 the same sequence stays below 5e-7.
 */
const INERTIA_EPSILON = 5e-6;
const WIDTH = 800;
const HEIGHT = 600;
const LEFT = 0;
const MIDDLE = 1;
const RIGHT = 2;
const FRAME = 16;

type Xyz = { x: number; y: number; z: number };

interface ThreeNode {
  type: string;
  visible: boolean;
  position: Xyz;
  scale: Xyz;
  quaternion: Xyz & { w: number };
  children: ThreeNode[];
  geometry?: { attributes: { position: { getX(index: number): number } } };
  material?: { opacity: number };
}

interface ThreeArcballCamera extends ThreeCamera {
  fov: number;
  near: number;
  far: number;
}

interface ThreeArcballControls {
  target: ThreeVector3;
  enabled: boolean;
  mouseActions: Array<{
    operation: string;
    mouse: number | string;
    key: string | null;
  }>;
  addEventListener(
    type: string,
    listener: (event: { type: string }) => void,
  ): void;
  setMouseAction(
    operation: string,
    mouse: number | string,
    key?: string | null,
  ): boolean;
  unsetMouseAction(mouse: number | string, key?: string | null): boolean;
  update(): void;
  reset(): void;
  saveState(): void;
  setCamera(camera: ThreeCamera): void;
  setTbRadius(value: number): void;
  setGizmosVisible(value: boolean): void;
  setStateFromJSON(json: string): void;
  activateGizmos(isActive: boolean): void;
  disposeGrid(): void;
  dispose(): void;
}

type ThreeArcballConstructor = new (
  camera: ThreeCamera,
  element: EventTarget,
  scene: ThreeObject3D,
) => ThreeArcballControls;

const ThreeArcball =
  await loadThreeControl<ThreeArcballConstructor>("ArcballControls");

/** Options assigned to both controls before a sequence. */
interface ArcballOptions {
  radiusFactor?: number;
  focusAnimationTime?: number;
  adjustNearFar?: boolean;
  scaleFactor?: number;
  dampingFactor?: number;
  wMax?: number;
  enableAnimations?: boolean;
  enableGrid?: boolean;
  cursorZoom?: boolean;
  minFov?: number;
  maxFov?: number;
  rotateSpeed?: number;
  enablePan?: boolean;
  enableRotate?: boolean;
  enableZoom?: boolean;
  enableFocus?: boolean;
  minDistance?: number;
  maxDistance?: number;
  minZoom?: number;
  maxZoom?: number;
}

interface CameraSetup {
  kind: "perspective" | "orthographic";
  position?: [number, number, number];
  up?: [number, number, number];
  zoom?: number;
}

interface Modifiers {
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}

// Shared clock and animation-frame queue read by both implementations.
let clock = 1000;
const frameQueue = new Map<number, (time: number) => void>();
let nextFrame = 1;

function requestFrame(callback: (time: number) => void): number {
  const id = nextFrame++;
  frameQueue.set(id, callback);
  return id;
}

function cancelFrame(id: number): void {
  frameQueue.delete(id);
}

let clipboardText = "";
const windowTarget = Object.assign(new FakeTarget(), {
  devicePixelRatio: 1,
  requestAnimationFrame: requestFrame,
  cancelAnimationFrame: cancelFrame,
});

const STUBBED_GLOBALS: Record<string, unknown> = {
  window: windowTarget,
  requestAnimationFrame: requestFrame,
  cancelAnimationFrame: cancelFrame,
  performance: { now: () => clock },
  navigator: {
    clipboard: {
      writeText: (text: string) => {
        clipboardText = text;
        return Promise.resolve();
      },
      readText: () => Promise.resolve(clipboardText),
    },
  },
};
const savedGlobals = new Map<string, PropertyDescriptor | undefined>();

beforeAll(() => {
  // three.js reads the bare `window`, `performance`, `navigator`, and
  // animation-frame globals; EASEL reads the same globals.
  for (const [key, value] of Object.entries(STUBBED_GLOBALS)) {
    savedGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
});

afterAll(() => {
  for (const [key, descriptor] of savedGlobals) {
    if (descriptor === undefined) Reflect.deleteProperty(globalThis, key);
    else Object.defineProperty(globalThis, key, descriptor);
  }
  if (process.env["CONTROLS_PARITY_REPORT"])
    console.table(Object.fromEntries(maxErrors));
});

const maxErrors = new Map<string, number>();

/** Dispatches an event whose `timeStamp` reads the shared clock. */
function fire(
  target: EventTarget,
  type: string,
  fields: Record<string, unknown>,
): void {
  const event = Object.assign(new Event(type, { cancelable: true }), fields);
  Object.defineProperty(event, "timeStamp", { value: clock });
  target.dispatchEvent(event);
}

function findGroup<T extends { type: string }>(children: readonly T[]): T {
  const group = children.find((child) => child.type === "Group");
  if (group === undefined) throw new Error("gizmo group missing");
  return group;
}

/** Drives both controls with the same inputs and compares their outputs. */
class ArcballRig {
  readonly element = new FakeElement(WIDTH, HEIGHT);
  readonly threeScene = new THREE.Scene();
  readonly easelScene = new Scene();
  readonly threeCamera: ThreeArcballCamera;
  readonly easelCamera: ArcballCamera;
  readonly three: ThreeArcballControls;
  readonly easel: ArcballControls;
  readonly threeEvents: string[] = [];
  readonly easelEvents: string[] = [];
  readonly start: Xyz;
  maxError = 0;
  #worst = "";
  readonly #epsilon: number;

  constructor(
    camera: CameraSetup,
    options: ArcballOptions = {},
    dpr = 1,
    epsilon = EPSILON,
  ) {
    this.#epsilon = epsilon;
    frameQueue.clear();
    windowTarget.devicePixelRatio = dpr;
    this.threeScene.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshBasicMaterial(),
      ),
    );
    this.easelScene.add(
      new Mesh(new BoxGeometry(2, 2, 2), new BasicMaterial()),
    );

    this.threeCamera = makeThreeCamera(camera);
    this.easelCamera = makeEaselCamera(camera);

    this.three = new ThreeArcball(
      this.threeCamera,
      this.element,
      this.threeScene,
    );
    this.easel = new ArcballControls(
      this.easelCamera,
      this.element,
      this.easelScene,
    );
    this.configure(options);
    this.threeScene.updateMatrixWorld(true);
    this.easelScene.updateMatrixWorld();

    for (const type of ["change", "start", "end"]) {
      this.three.addEventListener(type, (event) =>
        this.threeEvents.push(event.type),
      );
      this.easel.addEventListener(type, (event) =>
        this.easelEvents.push(event.type),
      );
    }
    const { x, y, z } = this.threeCamera.position;
    this.start = { x, y, z };
    this.compare("setup");
  }

  configure(options: ArcballOptions): this {
    Object.assign(this.three, options);
    Object.assign(this.easel, options);
    return this;
  }

  /** Runs `action` on both controls, then compares. */
  both(
    label: string,
    action: (controls: ThreeArcballControls | ArcballControls) => void,
  ): this {
    action(this.three);
    action(this.easel);
    return this.compare(label);
  }

  down(button: number, x: number, y: number, modifiers: Modifiers = {}): this {
    fire(this.element, "pointerdown", { ...mouse(x, y, button), ...modifiers });
    return this.compare(`down ${button} ${x},${y}`);
  }

  move(button: number, x: number, y: number, modifiers: Modifiers = {}): this {
    clock += FRAME;
    fire(windowTarget, "pointermove", { ...mouse(x, y, button), ...modifiers });
    return this.compare(`move ${x},${y}`);
  }

  up(button: number, x: number, y: number, modifiers: Modifiers = {}): this {
    fire(windowTarget, "pointerup", { ...mouse(x, y, button), ...modifiers });
    return this.compare(`up ${x},${y}`);
  }

  drag(
    button: number,
    from: [number, number],
    to: [number, number],
    steps = 4,
    modifiers: Modifiers = {},
  ): this {
    this.down(button, from[0], from[1], modifiers);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      this.move(
        button,
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t,
        modifiers,
      );
    }
    return this.up(button, to[0], to[1], modifiers);
  }

  touchDown(id: number, x: number, y: number): this {
    fire(this.element, "pointerdown", touch(x, y, id));
    return this.compare(`touch down ${id}`);
  }

  touchMove(id: number, x: number, y: number): this {
    clock += FRAME;
    fire(windowTarget, "pointermove", touch(x, y, id));
    return this.compare(`touch move ${id} ${x},${y}`);
  }

  touchUp(id: number, x: number, y: number): this {
    fire(windowTarget, "pointerup", touch(x, y, id));
    return this.compare(`touch up ${id}`);
  }

  cancel(): this {
    fire(this.element, "pointercancel", touch(0, 0, 1));
    return this.compare("cancel");
  }

  wheel(
    deltaY: number,
    x = 400,
    y = 300,
    modifiers: Modifiers = {},
    deltaX = 0,
  ): this {
    fire(this.element, "wheel", {
      deltaY,
      deltaX,
      clientX: x,
      clientY: y,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      ...modifiers,
    });
    return this.compare(`wheel ${deltaY}`);
  }

  /** Clicks twice at one spot within the double-click window. */
  doubleClick(x: number, y: number): this {
    // Focus picking reads the camera world matrix, which a render refreshes.
    this.render();
    for (let i = 0; i < 2; i++) {
      this.down(LEFT, x, y);
      clock += 40;
      this.up(LEFT, x, y);
      clock += 40;
      this.frames(1);
    }
    return this;
  }

  /** Refreshes scene and camera world matrices on both sides, as a render would. */
  render(): this {
    this.threeScene.updateMatrixWorld(true);
    this.threeCamera.updateMatrixWorld(true);
    this.easelScene.updateMatrixWorld();
    this.easelCamera.updateMatrixWorld();
    return this.compare("render");
  }

  /** Advances the clock and runs queued animation frames until none remain. */
  frames(limit = 400): this {
    for (let i = 0; i < limit && frameQueue.size > 0; i++) {
      clock += FRAME;
      const pending = [...frameQueue.values()];
      frameQueue.clear();
      for (const callback of pending) callback(clock);
      this.compare(`frame ${i}`);
    }
    return this;
  }

  get moved(): number {
    const p = this.threeCamera.position;
    return Math.hypot(
      p.x - this.start.x,
      p.y - this.start.y,
      p.z - this.start.z,
    );
  }

  compare(label: string): this {
    const tc = this.threeCamera;
    const ec = this.easelCamera;
    this.#vec(label, "position", tc.position, ec.position);
    this.#quat(label, tc.quaternion, ec.quaternion);
    this.#vec(label, "up", tc.up, ec.up);
    this.#num(label, "zoom", tc.zoom, ec.zoom);
    this.#num(label, "near", tc.near, ec.near);
    this.#num(label, "far", tc.far, ec.far);
    if (ec instanceof PerspectiveCamera)
      this.#num(label, "fov", tc.fov, ec.fov);
    this.#vec(label, "target", this.three.target, this.easel.target);

    const tg = findGroup(this.threeScene.children as unknown as ThreeNode[]);
    const eg = findGroup(this.easelScene.children);
    this.#vec(label, "gizmo position", tg.position, eg.position);
    this.#vec(label, "gizmo scale", tg.scale, eg.scale);
    this.#num(label, "gizmo visible", Number(tg.visible), Number(eg.visible));
    for (let i = 0; i < 3; i++) {
      const threeLine = tg.children[i];
      const easelLine = eg.children[i] as Line;
      this.#num(
        label,
        `gizmo ${i} radius`,
        threeLine.geometry?.attributes.position.getX(0) ?? Number.NaN,
        easelLine.geometry?.getAttribute("position")?.getX(0) ?? Number.NaN,
      );
      // three.js opacity 1 / 0.6 maps to EASEL discrete transparency 0 / 3.
      this.#num(
        label,
        `gizmo ${i} opacity`,
        threeLine.material?.opacity === 1 ? 0 : 3,
        easelLine.material?.opacity ?? Number.NaN,
      );
    }
    this.#num(
      label,
      "scene children",
      this.threeScene.children.length,
      this.easelScene.children.length,
    );
    const threeGrid = (this.threeScene.children as unknown as ThreeNode[]).find(
      (child) => child.type === "GridHelper",
    );
    const easelGrid = this.easelScene.children.find(
      (child: Node) => child.type === "GridHelper",
    );
    if (threeGrid !== undefined && easelGrid !== undefined) {
      this.#vec(label, "grid position", threeGrid.position, easelGrid.position);
      this.#quat(label, threeGrid.quaternion, easelGrid.quaternion);
    }
    expect(this.easelEvents, label).toEqual(this.threeEvents);
    return this;
  }

  finish(name: string): void {
    this.three.dispose();
    this.easel.dispose();
    frameQueue.clear();
    maxErrors.set(name, this.maxError);
    expect(this.maxError, this.#worst).toBeLessThan(this.#epsilon);
  }

  #num(label: string, what: string, three: number, easel: number): void {
    if (Number.isNaN(three) || Number.isNaN(easel)) {
      expect(Number.isNaN(easel), `${label}: ${what} NaN`).toBe(
        Number.isNaN(three),
      );
      return;
    }
    if (three === easel) return;
    const error = Math.abs(easel - three) / Math.max(1, Math.abs(three));
    if (error > this.maxError) {
      this.maxError = error;
      this.#worst = `${label}: ${what} three=${three} easel=${easel}`;
    }
  }

  #vec(label: string, what: string, three: Xyz, easel: Xyz): void {
    this.#num(label, `${what}.x`, three.x, easel.x);
    this.#num(label, `${what}.y`, three.y, easel.y);
    this.#num(label, `${what}.z`, three.z, easel.z);
  }

  #quat(
    label: string,
    three: Xyz & { w: number },
    easel: Xyz & { w: number },
  ): void {
    // q and -q are the same rotation.
    const sign =
      three.x * easel.x +
        three.y * easel.y +
        three.z * easel.z +
        three.w * easel.w <
      0
        ? -1
        : 1;
    this.#num(label, "quaternion.x", three.x, sign * easel.x);
    this.#num(label, "quaternion.y", three.y, sign * easel.y);
    this.#num(label, "quaternion.z", three.z, sign * easel.z);
    this.#num(label, "quaternion.w", three.w, sign * easel.w);
  }
}

function makeThreeCamera(setup: CameraSetup): ThreeArcballCamera {
  const camera = (
    setup.kind === "perspective"
      ? new THREE.PerspectiveCamera(50, WIDTH / HEIGHT, 0.1, 1000)
      : new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 1000)
  ) as ThreeArcballCamera;
  const [px, py, pz] = setup.position ?? [3, 2, 5];
  camera.position.set(px, py, pz);
  if (setup.up) camera.up.set(...setup.up);
  if (setup.zoom !== undefined) camera.zoom = setup.zoom;
  camera.updateProjectionMatrix();
  return camera;
}

function makeEaselCamera(setup: CameraSetup): ArcballCamera {
  const camera =
    setup.kind === "perspective"
      ? new PerspectiveCamera({
          fov: 50,
          aspect: WIDTH / HEIGHT,
          near: 0.1,
          far: 1000,
        })
      : new OrthographicCamera({
          left: -4,
          right: 4,
          top: 3,
          bottom: -3,
          near: 0.1,
          far: 1000,
        });
  const [px, py, pz] = setup.position ?? [3, 2, 5];
  camera.position.set(px, py, pz);
  if (setup.up) camera.up.set(...setup.up);
  if (setup.zoom !== undefined) camera.zoom = setup.zoom;
  camera.updateProjectionMatrix();
  return camera;
}

const perspective: CameraSetup = { kind: "perspective" };
const orthographic: CameraSetup = { kind: "orthographic" };
const cameras = [perspective, orthographic];

function parity(
  name: string,
  camera: CameraSetup,
  run: (rig: ArcballRig) => void,
  options: ArcballOptions = {},
  dpr = 1,
  epsilon = EPSILON,
): void {
  it(`${name} (${camera.kind}) matches three.js`, () => {
    const rig = new ArcballRig(camera, options, dpr, epsilon);
    run(rig);
    rig.finish(`arcball ${name} ${camera.kind}`);
  });
}

describe("ArcballControls parity with three.js r186", () => {
  for (const camera of cameras) {
    const kind = camera.kind;
    const inertia = kind === "perspective" ? INERTIA_EPSILON : EPSILON;

    parity(
      "left drag rotates on the sphere and hyperboloid",
      camera,
      (rig) => {
        rig.drag(LEFT, [400, 300], [470, 250]).frames();
        rig.drag(LEFT, [100, 80], [700, 560], 6).frames();
        expect(rig.moved).toBeGreaterThan(0.1);
      },
      {},
      1,
      inertia,
    );

    parity(
      "rotation inertia decays over animation frames",
      camera,
      (rig) => {
        rig.drag(LEFT, [300, 300], [520, 260], 5);
        expect(frameQueue.size).toBeGreaterThan(0);
        rig.frames();
        expect(
          rig.threeEvents.filter((type) => type === "change").length,
        ).toBeGreaterThan(10);
      },
      {},
      1,
      inertia,
    );

    parity("a pause before release skips inertia", camera, (rig) => {
      rig.down(LEFT, 400, 300).move(LEFT, 450, 280).move(LEFT, 500, 260);
      clock += 200;
      rig.up(LEFT, 500, 260);
      expect(frameQueue.size).toBe(0);
      expect(rig.moved).toBeGreaterThan(0.1);
    });

    parity(
      "rotation without animations",
      camera,
      (rig) => {
        rig.drag(LEFT, [400, 300], [480, 200]);
        expect(frameQueue.size).toBe(0);
        expect(rig.moved).toBeGreaterThan(0.1);
      },
      { enableAnimations: false, rotateSpeed: 1.7 },
    );

    parity("ctrl+left and right drags pan", camera, (rig) => {
      rig.drag(LEFT, [400, 300], [460, 340], 4, { ctrlKey: true });
      rig.drag(RIGHT, [200, 100], [120, 180]);
      rig.drag(LEFT, [400, 300], [300, 200], 3, { metaKey: true });
      expect(rig.moved).toBeGreaterThan(0.1);
    });

    parity(
      "panning draws and removes the grid",
      camera,
      (rig) => {
        rig.down(RIGHT, 400, 300).move(RIGHT, 440, 320);
        expect(rig.easelScene.children.length).toBe(3);
        rig.wheel(-125).move(RIGHT, 480, 330).up(RIGHT, 480, 330);
        expect(rig.easelScene.children.length).toBe(2);
      },
      { enableGrid: true },
    );

    parity("middle drag zooms", camera, (rig) => {
      rig
        .drag(MIDDLE, [400, 300], [400, 380])
        .drag(MIDDLE, [400, 300], [400, 120]);
      expect(rig.moved + Math.abs(rig.threeCamera.zoom - 1)).toBeGreaterThan(
        0.01,
      );
    });

    parity("shift+middle drag changes the fov", camera, (rig) => {
      rig
        .drag(MIDDLE, [400, 300], [400, 200], 4, { shiftKey: true })
        .drag(MIDDLE, [400, 300], [400, 500], 4, { shiftKey: true });
      if (kind === "perspective") expect(rig.threeCamera.fov).not.toBe(50);
    });

    parity(
      "a modifier change mid-drag restarts the operation",
      camera,
      (rig) => {
        rig
          .down(LEFT, 400, 300)
          .move(LEFT, 430, 300)
          .move(LEFT, 460, 320, { ctrlKey: true })
          .move(LEFT, 490, 340, { ctrlKey: true })
          .move(LEFT, 500, 360)
          .move(LEFT, 520, 380)
          .up(LEFT, 520, 380)
          .frames();
        expect(rig.threeEvents.filter((type) => type === "start").length).toBe(
          3,
        );
        rig
          .down(MIDDLE, 400, 300)
          .move(MIDDLE, 400, 320)
          .move(MIDDLE, 400, 340, { shiftKey: true })
          .move(MIDDLE, 400, 380, { shiftKey: true })
          .up(MIDDLE, 400, 380);
      },
    );

    parity("wheel zooms in and out", camera, (rig) => {
      rig.wheel(-125).wheel(-250).wheel(125).wheel(40).wheel(-10);
      expect(rig.moved + Math.abs(rig.threeCamera.zoom - 1)).toBeGreaterThan(
        0.01,
      );
    });

    parity("shift+wheel changes the fov, including deltaX", camera, (rig) => {
      rig
        .wheel(-125, 400, 300, { shiftKey: true })
        .wheel(250, 400, 300, { shiftKey: true })
        .wheel(0, 400, 300, { shiftKey: true }, 125)
        .wheel(0, 400, 300, { shiftKey: true }, -375);
      if (kind === "perspective") expect(rig.threeCamera.fov).not.toBe(50);
    });

    parity(
      "cursorZoom zooms toward the cursor",
      camera,
      (rig) => {
        rig.wheel(-250, 120, 90).wheel(-125, 700, 500).wheel(250, 300, 400);
        expect(rig.moved).toBeGreaterThan(0.01);
      },
      { cursorZoom: true },
    );

    parity(
      "cursorZoom without pan zooms toward the center",
      camera,
      (rig) => rig.wheel(-250, 120, 90).wheel(125, 700, 500),
      { cursorZoom: true, enablePan: false },
    );

    parity(
      "distance, zoom, and fov limits",
      camera,
      (rig) => {
        for (let i = 0; i < 12; i++) rig.wheel(-250);
        for (let i = 0; i < 12; i++) rig.wheel(250);
        rig
          .drag(MIDDLE, [400, 300], [400, 0])
          .drag(MIDDLE, [400, 300], [400, 600]);
        for (let i = 0; i < 6; i++)
          rig.wheel(-250, 400, 300, { shiftKey: true });
        for (let i = 0; i < 6; i++)
          rig.wheel(250, 400, 300, { shiftKey: true });
      },
      {
        minDistance: 4,
        maxDistance: 9,
        minZoom: 0.6,
        maxZoom: 1.8,
        minFov: 30,
        maxFov: 70,
      },
    );

    parity(
      "disabled rotate, pan, and zoom",
      camera,
      (rig) => {
        rig.drag(LEFT, [400, 300], [470, 250]);
        rig.drag(RIGHT, [400, 300], [470, 250]);
        rig.drag(MIDDLE, [400, 300], [400, 250]);
        rig.wheel(-125);
        rig
          .touchDown(1, 400, 300)
          .touchDown(2, 500, 300)
          .touchMove(2, 540, 340);
        rig.touchUp(2, 540, 340).touchUp(1, 400, 300);
        expect(rig.moved).toBe(0);
      },
      { enableRotate: false, enablePan: false, enableZoom: false },
    );

    parity("disabled controls ignore input", camera, (rig) => {
      rig.three.enabled = false;
      rig.easel.enabled = false;
      rig.drag(LEFT, [400, 300], [470, 250]).wheel(-125);
      expect(rig.moved).toBe(0);
    });

    parity("double click focuses with an animation", camera, (rig) => {
      rig.doubleClick(420, 310);
      // one focus frame queued per implementation
      expect(frameQueue.size).toBe(2);
      rig.frames();
      expect(rig.moved).toBeGreaterThan(0.01);
    });

    parity(
      "double click focuses instantly without animations",
      camera,
      (rig) => {
        rig.doubleClick(380, 290);
        expect(rig.moved).toBeGreaterThan(0.01);
      },
      { enableAnimations: false },
    );

    parity("a drag interrupts the focus animation", camera, (rig) => {
      rig.doubleClick(420, 310).frames(5);
      expect(frameQueue.size).toBe(2);
      rig.drag(RIGHT, [400, 300], [450, 330]).frames();
      expect(rig.moved).toBeGreaterThan(0.01);
    });

    parity("double click on empty space does not focus", camera, (rig) => {
      rig.doubleClick(5, 5).frames();
    });

    parity(
      "double click with focus disabled",
      camera,
      (rig) => rig.doubleClick(420, 310).frames(),
      { enableFocus: false },
    );

    parity(
      "one-finger touch rotates",
      camera,
      (rig) => {
        rig
          .touchDown(1, 400, 300)
          .touchMove(1, 430, 280)
          .touchMove(1, 480, 250);
        rig.touchUp(1, 480, 250).frames();
        expect(rig.moved).toBeGreaterThan(0.01);
      },
      {},
      1,
      inertia,
    );

    parity("two fingers rotate, pinch, and pan together", camera, (rig) => {
      rig.touchDown(1, 380, 300).touchDown(2, 480, 300);
      rig.touchMove(2, 500, 330).touchMove(1, 360, 280).touchMove(2, 540, 360);
      rig.touchMove(1, 350, 250);
      rig.touchUp(2, 540, 360);
      // below the switch threshold, then past it
      rig.touchMove(1, 360, 260).touchMove(1, 400, 290).touchMove(1, 420, 300);
      rig.touchUp(1, 420, 300).frames();
      expect(
        rig.threeEvents.filter((type) => type === "start").length,
      ).toBeGreaterThan(3);
    });

    parity(
      "two-finger switch threshold scales with devicePixelRatio",
      camera,
      (rig) => {
        rig
          .touchDown(1, 380, 300)
          .touchDown(2, 480, 300)
          .touchMove(2, 470, 320);
        rig.touchUp(2, 470, 320).touchMove(1, 380, 318).touchMove(1, 400, 330);
        rig.touchUp(1, 400, 330).frames();
      },
      {},
      2,
    );

    parity(
      "two fingers without pan zoom about the center",
      camera,
      (rig) => {
        rig.touchDown(1, 380, 300).touchDown(2, 480, 300);
        rig.touchMove(2, 520, 340).touchMove(1, 340, 280);
        rig.touchUp(2, 520, 340).touchUp(1, 340, 280);
      },
      { enablePan: false },
    );

    parity("three fingers change the fov", camera, (rig) => {
      rig.touchDown(1, 380, 300).touchDown(2, 480, 300).touchDown(3, 430, 360);
      rig.touchMove(3, 430, 300).touchMove(1, 380, 250).touchMove(2, 480, 240);
      rig.touchUp(3, 430, 300).touchUp(2, 480, 240).touchUp(1, 380, 250);
    });

    parity("pointercancel resets touch input", camera, (rig) => {
      rig.touchDown(1, 400, 300).touchMove(1, 420, 290).cancel();
      rig
        .touchDown(1, 400, 300)
        .touchMove(1, 380, 320)
        .touchUp(1, 380, 320)
        .frames();
    });

    parity(
      "setMouseAction and unsetMouseAction rebind buttons",
      camera,
      (rig) => {
        const ops: Array<
          [ArcballOperation, ArcballMouseInput, ArcballModifierKey | undefined]
        > = [
          ["ROTATE", 2, undefined],
          ["PAN", 0, undefined],
          ["ZOOM", 0, "SHIFT"],
          ["FOV", "WHEEL", undefined],
        ];
        for (const [operation, input, key] of ops) {
          expect(rig.easel.setMouseAction(operation, input, key)).toBe(
            rig.three.setMouseAction(operation, input, key ?? null),
          );
        }
        expect(rig.easel.setMouseAction("PAN", "WHEEL")).toBe(false);
        expect(rig.three.setMouseAction("PAN", "WHEEL")).toBe(false);
        expect(rig.easel.unsetMouseAction(1)).toBe(
          rig.three.unsetMouseAction(1),
        );
        expect(rig.easel.unsetMouseAction(1)).toBe(
          rig.three.unsetMouseAction(1),
        );
        expect(
          rig.easel.mouseActions.map(({ operation, mouse, key }): unknown[] => [
            operation,
            mouse,
            key ?? null,
          ]),
        ).toEqual(
          rig.three.mouseActions.map(({ operation, mouse, key }) => [
            operation,
            mouse,
            key,
          ]),
        );
        rig.drag(RIGHT, [400, 300], [470, 250]).frames();
        rig.drag(LEFT, [400, 300], [470, 250]);
        rig.drag(LEFT, [400, 300], [400, 250], 4, { shiftKey: true });
        rig.drag(MIDDLE, [400, 300], [400, 250]);
        rig.wheel(-125);
        expect(rig.moved).toBeGreaterThan(0.01);
      },
    );

    parity(
      "saveState and reset",
      camera,
      (rig) => {
        rig.drag(LEFT, [400, 300], [470, 250]).frames().wheel(-250);
        rig.both("save", (controls) => controls.saveState());
        rig.drag(RIGHT, [400, 300], [300, 250]).wheel(250);
        rig.both("reset", (controls) => controls.reset());
        rig.drag(LEFT, [400, 300], [300, 400]).frames();
        rig.both("reset again", (controls) => controls.reset());
        expect(rig.moved).toBeGreaterThan(0.01);
      },
      {},
      1,
      inertia,
    );

    parity(
      "setStateFromJSON restores a copied state",
      camera,
      (rig) => {
        rig.drag(LEFT, [400, 300], [470, 250]).frames().wheel(-250);
        rig.drag(RIGHT, [400, 300], [300, 250]);
        const easelCamera = rig.easelCamera;
        easelCamera.updateMatrix();
        const state = JSON.parse(
          JSON.stringify({
            arcballState: {
              cameraFar: easelCamera.far,
              cameraFov:
                easelCamera instanceof PerspectiveCamera
                  ? easelCamera.fov
                  : undefined,
              cameraMatrix: {
                elements: Array.from(easelCamera.matrix.elements),
              },
              cameraNear: easelCamera.near,
              cameraUp: { x: 0, y: 1, z: 0 },
              cameraZoom: easelCamera.zoom,
              gizmoMatrix: {
                elements: [
                  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0.5, 0.25, -0.5, 1,
                ],
              },
              target: [0.5, 0.25, -0.5],
            },
          }),
        ) as unknown;
        rig.drag(LEFT, [400, 300], [300, 400]).frames();
        const json = JSON.stringify(state);
        rig.both("restore", (controls) => controls.setStateFromJSON(json));
        rig.both("update", (controls) => controls.update());
        rig.drag(LEFT, [400, 300], [450, 330]).frames();
      },
      {},
      1,
      inertia,
    );

    parity(
      "three.js reads the state EASEL copies",
      camera,
      (rig) => {
        rig.drag(LEFT, [400, 300], [470, 250]).frames().wheel(-250);
        rig.drag(RIGHT, [400, 300], [300, 250]);
        rig.render();
        void rig.easel.copyState();
        const copied = clipboardText;
        rig.drag(LEFT, [400, 300], [300, 400]).frames();
        rig.both("paste", (controls) => controls.setStateFromJSON(copied));
        rig.drag(LEFT, [400, 300], [450, 330]).frames();
        expect(copied).toContain('"target":[');
      },
      {},
      1,
      inertia,
    );

    parity("update moves the trackball to a changed target", camera, (rig) => {
      rig.three.target.set(1, 0.5, -1);
      rig.easel.target.set(1, 0.5, -1);
      rig.both("update", (controls) => controls.update());
      rig.drag(LEFT, [400, 300], [470, 250]).frames().wheel(-125);
    });

    parity(
      "update applies limits changed outside the controls",
      camera,
      (rig) => {
        rig.configure({ minDistance: 7, maxZoom: 0.8, maxFov: 40 });
        rig.both("update", (controls) => controls.update());
        rig.threeCamera.zoom = 0.3;
        rig.easelCamera.zoom = 0.3;
        rig.configure({ minZoom: 0.5, maxDistance: 8 });
        rig.both("update again", (controls) => controls.update());
        rig.drag(LEFT, [400, 300], [470, 250]).frames();
      },
    );

    parity(
      "setCamera and setTbRadius",
      camera,
      (rig) => {
        rig.drag(LEFT, [400, 300], [470, 250]).frames();
        rig.three.setCamera(rig.threeCamera);
        rig.easel.setCamera(rig.easelCamera);
        rig.compare("setCamera");
        rig.both("setTbRadius", (controls) => controls.setTbRadius(0.4));
        rig.both("gizmos hidden", (controls) =>
          controls.setGizmosVisible(false),
        );
        rig.both("gizmos active", (controls) => controls.activateGizmos(true));
        rig.drag(LEFT, [400, 300], [300, 380]).frames();
        fire(windowTarget, "resize", {});
        rig.compare("resize");
      },
      {},
      1,
      inertia,
    );

    parity(
      "adjustNearFar follows zoom",
      camera,
      (rig) => {
        rig.wheel(-250).wheel(-250).drag(MIDDLE, [400, 300], [400, 200]);
        rig.wheel(750).wheel(750).drag(MIDDLE, [400, 300], [400, 450]);
        // dollying out past the initial distance moves both planes
        if (kind === "perspective") {
          expect(rig.threeCamera.near).not.toBe(0.1);
          expect(rig.threeCamera.far).not.toBe(1000);
        }
        rig.doubleClick(410, 300).frames();
      },
      { adjustNearFar: true },
    );

    parity("camera.up other than +Y", { ...camera, up: [0, 0, 1] }, (rig) => {
      rig.drag(LEFT, [400, 300], [470, 250]).frames();
      rig.drag(RIGHT, [400, 300], [350, 330]).wheel(-125);
      rig.touchDown(1, 380, 300).touchDown(2, 480, 300).touchMove(2, 470, 350);
      rig.touchUp(2, 470, 350).touchUp(1, 380, 300).frames();
      rig.both("reset", (controls) => controls.reset());
    });
  }

  parity(
    "orthographic zoom other than 1 scales the gizmos",
    { ...orthographic, zoom: 2 },
    (rig) => {
      rig.drag(LEFT, [400, 300], [470, 250]).frames().wheel(-125);
      rig.drag(RIGHT, [400, 300], [350, 330]);
    },
  );
});

describe("ArcballControls", () => {
  it("installs and removes its listeners and restores touch scrolling", () => {
    const element = new FakeElement(WIDTH, HEIGHT);
    const camera = makeEaselCamera(perspective);
    const scene = new Scene();
    const controls = new ArcballControls(camera, element, scene);
    expect(element.style.touchAction).toBe("none");
    expect(scene.children.length).toBe(1);
    controls.dispose();
    expect(element.style.touchAction).toBe("");
    expect(scene.children.length).toBe(0);

    let changes = 0;
    controls.addEventListener("change", () => changes++);
    fire(element, "wheel", {
      deltaY: -125,
      deltaX: 0,
      clientX: 400,
      clientY: 300,
    });
    expect(changes).toBe(0);
  });

  it("prevents the context menu only while button 2 is bound", () => {
    const element = new FakeElement(WIDTH, HEIGHT);
    const controls = new ArcballControls(makeEaselCamera(perspective), element);
    const menu = () => {
      const event = new Event("contextmenu", { cancelable: true });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(menu()).toBe(true);
    controls.unsetMouseAction(2);
    expect(menu()).toBe(false);
    controls.dispose();
  });

  it("rejects invalid mouse actions like three.js", () => {
    const controls = new ArcballControls(makeEaselCamera(perspective));
    const loose = controls as unknown as {
      setMouseAction(operation: string, mouse: unknown, key?: unknown): boolean;
    };
    expect(loose.setMouseAction("SPIN", 0)).toBe(false);
    expect(loose.setMouseAction("PAN", 3)).toBe(false);
    expect(loose.setMouseAction("PAN", 0, "ALT")).toBe(false);
    expect(controls.setMouseAction("ROTATE", "WHEEL")).toBe(false);
    expect(controls.unsetMouseAction(0, "SHIFT")).toBe(false);
    expect(controls.mouseActions.length).toBe(7);
  });

  it("round-trips copyState through pasteState", async () => {
    const camera = makeEaselCamera(perspective);
    const controls = new ArcballControls(camera, undefined, new Scene());
    controls.target.set(0.5, 0, 0);
    controls.update();
    await controls.copyState();
    const saved = JSON.parse(clipboardText) as {
      arcballState: { target: number[]; cameraMatrix: { elements: number[] } };
    };
    expect(saved.arcballState.target).toEqual([0.5, 0, 0]);
    expect(saved.arcballState.cameraMatrix.elements.length).toBe(16);
    const position = camera.position.clone();
    camera.position.set(9, 9, 9);
    controls.target.set(0, 0, 0);
    await controls.pasteState();
    expect(controls.target.x).toBe(0.5);
    expect(camera.position.distanceTo(position)).toBeLessThan(1e-6);
  });

  it("completes animated operations immediately without requestAnimationFrame", () => {
    const saved = Object.getOwnPropertyDescriptor(
      globalThis,
      "requestAnimationFrame",
    );
    Reflect.deleteProperty(globalThis, "requestAnimationFrame");
    try {
      const element = new FakeElement(WIDTH, HEIGHT);
      const scene = new Scene();
      scene.add(new Mesh(new BoxGeometry(2, 2, 2), new BasicMaterial()));
      const camera = makeEaselCamera(perspective);
      const controls = new ArcballControls(camera, element, scene);
      const events: string[] = [];
      for (const type of ["change", "start", "end"])
        controls.addEventListener(type, (event) => events.push(event.type));

      fire(element, "pointerdown", mouse(400, 300));
      clock += FRAME;
      fire(windowTarget, "pointermove", mouse(480, 260));
      events.length = 0;
      fire(windowTarget, "pointerup", mouse(480, 260));
      expect(events).toEqual(["change", "end"]);
      expect(frameQueue.size).toBe(0);

      scene.updateMatrixWorld();
      camera.updateMatrixWorld();
      const before = camera.position.clone();
      for (let i = 0; i < 2; i++) {
        fire(element, "pointerdown", mouse(410, 300));
        clock += 40;
        fire(windowTarget, "pointerup", mouse(410, 300));
        clock += 40;
      }
      expect(frameQueue.size).toBe(0);
      expect(camera.position.distanceTo(before)).toBeGreaterThan(0.01);
      controls.dispose();
    } finally {
      if (saved !== undefined)
        Object.defineProperty(globalThis, "requestAnimationFrame", saved);
    }
  });

  it("exposes the shared raycaster", () => {
    const a = new ArcballControls(makeEaselCamera(perspective));
    const b = new ArcballControls(makeEaselCamera(orthographic));
    expect(a.raycaster).toBe(b.raycaster);
  });
});
