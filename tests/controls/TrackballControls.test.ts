import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import * as THREE from "three";
import { TrackballControls as ThreeTrackballControls } from "three/addons/controls/TrackballControls.js";
import { OrthographicCamera } from "@/cameras/OrthographicCamera.js";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.js";
import { TrackballControls } from "@/controls/TrackballControls.js";
import { MOUSE } from "@/core/Constants.js";

// Absolute tolerance for every compared component.
const TOLERANCE = 1e-6;

const WIDTH = 800;
const HEIGHT = 600;
const RECT_LEFT = 20;
const RECT_TOP = 10;
const PAGE_X_OFFSET = 5;
const PAGE_Y_OFFSET = 7;
const CLIENT_LEFT = 2;
const CLIENT_TOP = 3;

class FakeDocument extends EventTarget {
  readonly documentElement = { clientLeft: CLIENT_LEFT, clientTop: CLIENT_TOP };
}

class FakeElement extends EventTarget {
  readonly clientWidth = WIDTH;
  readonly clientHeight = HEIGHT;
  readonly style: { touchAction?: string } = {};
  readonly ownerDocument = new FakeDocument();
  readonly captured: number[] = [];
  readonly released: number[] = [];

  getBoundingClientRect() {
    return { left: RECT_LEFT, top: RECT_TOP, width: WIDTH, height: HEIGHT };
  }

  setPointerCapture(pointerId: number): void {
    this.captured.push(pointerId);
  }

  releasePointerCapture(pointerId: number): void {
    this.released.push(pointerId);
  }
}

const STUBBED_GLOBALS = {
  window: globalThis,
  pageXOffset: PAGE_X_OFFSET,
  pageYOffset: PAGE_Y_OFFSET,
};
const savedGlobals = new Map<string, PropertyDescriptor | undefined>();

beforeAll(() => {
  // three.js TrackballControls reads the bare `window` global for key
  // listeners and page offsets; EASEL reads the same window through
  // controlWindow(), so both controls share one key event target.
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
});

type Props = Record<string, number | string>;

function event(type: string, props: Props): Event {
  return Object.assign(new Event(type, { cancelable: true }), props);
}

type Vec3 = { x: number; y: number; z: number };
type Quat = Vec3 & { w: number };

type CameraKind = "perspective" | "orthographic";

type Options = {
  camera?: CameraKind;
  position?: [number, number, number];
  up?: [number, number, number];
  configure?: (controls: SharedOptions) => void;
};

/** Options set identically on both controls. */
type SharedOptions = {
  rotateSpeed: number;
  zoomSpeed: number;
  panSpeed: number;
  rollSpeed: number;
  noRotate: boolean;
  noZoom: boolean;
  noPan: boolean;
  multiTouchRoll: boolean;
  staticMoving: boolean;
  dynamicDampingFactor: number;
  minDistance: number;
  maxDistance: number;
  minZoom: number;
  maxZoom: number;
  keys: string[];
  enabled: boolean;
  mouseButtons: {
    LEFT: MOUSE | undefined;
    MIDDLE: MOUSE | undefined;
    RIGHT: MOUSE | undefined;
  };
};

type ThreeCamera = {
  position: Vec3 & { set(x: number, y: number, z: number): unknown };
  up: Vec3 & { set(x: number, y: number, z: number): unknown };
  quaternion: Quat;
  zoom: number;
};

// tests/three.d.ts declares only part of three; these are the camera members
// the comparison reads.
const ThreeCameras = THREE as unknown as {
  PerspectiveCamera: new (
    fov: number,
    aspect: number,
    near: number,
    far: number,
  ) => ThreeCamera;
  OrthographicCamera: new (
    left: number,
    right: number,
    top: number,
    bottom: number,
    near: number,
    far: number,
  ) => ThreeCamera;
};

type Snapshot = number[];

function snapshot(
  position: Vec3,
  quaternion: Quat,
  up: Vec3,
  target: Vec3,
  zoom: number,
): Snapshot {
  return [
    position.x,
    position.y,
    position.z,
    quaternion.x,
    quaternion.y,
    quaternion.z,
    quaternion.w,
    up.x,
    up.y,
    up.z,
    target.x,
    target.y,
    target.z,
    zoom,
  ];
}

function createPair(options: Options = {}) {
  const kind = options.camera ?? "perspective";
  const [px, py, pz] = options.position ?? [1, 2, 6];
  const [ux, uy, uz] = options.up ?? [0, 1, 0];
  const aspect = WIDTH / HEIGHT;

  const threeCamera =
    kind === "perspective"
      ? new ThreeCameras.PerspectiveCamera(50, aspect, 0.1, 100)
      : new ThreeCameras.OrthographicCamera(
          -4 * aspect,
          4 * aspect,
          4,
          -4,
          0.1,
          100,
        );
  const easelCamera =
    kind === "perspective"
      ? new PerspectiveCamera({ fov: 50, aspect, near: 0.1, far: 100 })
      : new OrthographicCamera({
          left: -4 * aspect,
          right: 4 * aspect,
          top: 4,
          bottom: -4,
          near: 0.1,
          far: 100,
        });
  threeCamera.position.set(px, py, pz);
  threeCamera.up.set(ux, uy, uz);
  easelCamera.position.set(px, py, pz);
  easelCamera.up.set(ux, uy, uz);

  const element = new FakeElement();
  const three = new ThreeTrackballControls(threeCamera, element);
  const easel = new TrackballControls(easelCamera, element);
  options.configure?.(three);
  options.configure?.(easel);

  const threeEvents: string[] = [];
  const easelEvents: string[] = [];
  for (const type of ["start", "change", "end"]) {
    three.addEventListener(type, (e) => threeEvents.push(e.type));
    easel.addEventListener(type, (e) => easelEvents.push(e.type));
  }

  let maxError = 0;

  const pair = {
    element,
    three,
    easel,
    threeCamera,
    easelCamera,
    threeEvents,
    easelEvents,
    get maxError() {
      return maxError;
    },
    update(times = 1) {
      for (let i = 0; i < times; i++) {
        three.update();
        easel.update();
        pair.compare();
      }
    },
    compare() {
      const a = snapshot(
        threeCamera.position,
        threeCamera.quaternion,
        threeCamera.up,
        three.target,
        threeCamera.zoom,
      );
      const b = snapshot(
        easelCamera.position,
        easelCamera.quaternion,
        easelCamera.up,
        easel.target,
        easelCamera.zoom,
      );
      // q and -q are the same rotation. EASEL's Node.lookAt re-derives the
      // quaternion from Euler angles, which can flip its sign, so align it.
      let dot = 0;
      for (let i = 3; i < 7; i++) dot += (a[i] ?? 0) * (b[i] ?? 0);
      if (dot < 0) for (let i = 3; i < 7; i++) b[i] = -(b[i] ?? 0);
      for (let i = 0; i < a.length; i++) {
        const error = Math.abs((a[i] ?? 0) - (b[i] ?? 0));
        if (!(error <= maxError)) maxError = error;
      }
      expect(b).toHaveLength(a.length);
      expect(maxError).toBeLessThan(TOLERANCE);
      expect(easel.state).toBe(three.state);
      expect(easel.keyState).toBe(three.keyState);
      expect(easelEvents).toEqual(threeEvents);
    },
    down(pointerId: number, x: number, y: number, extra: Props = {}) {
      element.dispatchEvent(
        event("pointerdown", {
          pointerId,
          pointerType: "mouse",
          button: 0,
          pageX: x,
          pageY: y,
          ...extra,
        }),
      );
    },
    move(pointerId: number, x: number, y: number, extra: Props = {}) {
      element.ownerDocument.dispatchEvent(
        event("pointermove", {
          pointerId,
          pointerType: "mouse",
          pageX: x,
          pageY: y,
          ...extra,
        }),
      );
    },
    up(pointerId: number, x: number, y: number, extra: Props = {}) {
      element.ownerDocument.dispatchEvent(
        event("pointerup", {
          pointerId,
          pointerType: "mouse",
          pageX: x,
          pageY: y,
          ...extra,
        }),
      );
    },
    wheel(deltaY: number, deltaMode = 0) {
      element.dispatchEvent(event("wheel", { deltaY, deltaMode }));
    },
    key(type: "keydown" | "keyup", code: string) {
      globalThis.dispatchEvent(event(type, { code }));
    },
    /** Drags one mouse button along a path, updating between moves. */
    drag(button: number, path: Array<[number, number]>, updates = 1) {
      const [start, ...rest] = path;
      if (start === undefined) return;
      pair.down(1, start[0], start[1], { button });
      pair.compare();
      for (const [x, y] of rest) {
        pair.move(1, x, y);
        pair.update(updates);
      }
      const last = path[path.length - 1] ?? start;
      pair.up(1, last[0], last[1], { button });
      pair.compare();
    },
    dispose() {
      three.dispose();
      easel.dispose();
    },
  };
  pair.compare();
  return pair;
}

const SWEEP: Array<[number, number]> = [
  [400, 300],
  [430, 290],
  [470, 260],
  [520, 250],
  [560, 230],
];

const LONG_SWEEP: Array<[number, number]> = [
  [400, 300],
  [400, 200],
  [400, 100],
  [400, 20],
  [410, 580],
  [420, 400],
];

describe("TrackballControls parity with three.js r186", () => {
  it("matches three.js defaults and computes screen from the element rect", () => {
    const pair = createPair();
    const { easel, three } = pair;
    expect(easel.rotateSpeed).toBe(three.rotateSpeed);
    expect(easel.zoomSpeed).toBe(three.zoomSpeed);
    expect(easel.panSpeed).toBe(three.panSpeed);
    expect(easel.rollSpeed).toBe(three.rollSpeed);
    expect(easel.noRotate).toBe(three.noRotate);
    expect(easel.noZoom).toBe(three.noZoom);
    expect(easel.noPan).toBe(three.noPan);
    expect(easel.multiTouchRoll).toBe(three.multiTouchRoll);
    expect(easel.staticMoving).toBe(three.staticMoving);
    expect(easel.dynamicDampingFactor).toBe(three.dynamicDampingFactor);
    expect(easel.minDistance).toBe(three.minDistance);
    expect(easel.maxDistance).toBe(three.maxDistance);
    expect(easel.minZoom).toBe(three.minZoom);
    expect(easel.maxZoom).toBe(three.maxZoom);
    expect(easel.keys).toEqual(three.keys);
    expect({ ...easel.mouseButtons }).toEqual({ ...three.mouseButtons });
    expect(easel.mouseButtons).toEqual({
      LEFT: MOUSE.ROTATE,
      MIDDLE: MOUSE.DOLLY,
      RIGHT: MOUSE.PAN,
    });
    expect(easel.state).toBe(-1);
    expect({ ...easel.screen }).toEqual({ ...three.screen });
    expect(easel.screen).toEqual({
      left: RECT_LEFT + PAGE_X_OFFSET - CLIENT_LEFT,
      top: RECT_TOP + PAGE_Y_OFFSET - CLIENT_TOP,
      width: WIDTH,
      height: HEIGHT,
    });
    expect(pair.element.style.touchAction).toBe("none");
    pair.dispose();
    expect(pair.element.style.touchAction).toBe("");
  });

  for (const staticMoving of [true, false]) {
    const label = staticMoving ? "static" : "damped";

    it(`rotates freely and rolls the up vector (${label})`, () => {
      const pair = createPair({
        configure: (c) => (c.staticMoving = staticMoving),
      });
      pair.drag(0, LONG_SWEEP, 2);
      pair.update(8);
      expect(pair.easelCamera.up.y).not.toBeCloseTo(1, 3);
      pair.dispose();
    });

    it(`zooms with a middle drag (${label})`, () => {
      const pair = createPair({
        configure: (c) => (c.staticMoving = staticMoving),
      });
      pair.drag(1, [
        [400, 300],
        [400, 330],
        [400, 380],
        [400, 250],
      ]);
      pair.update(6);
      pair.dispose();
    });

    it(`pans with a right drag (${label})`, () => {
      const pair = createPair({
        configure: (c) => (c.staticMoving = staticMoving),
      });
      pair.drag(2, SWEEP, 2);
      pair.update(6);
      expect(pair.easel.target.lengthSq).toBeGreaterThan(0);
      pair.dispose();
    });

    it(`zooms with the wheel in every delta mode (${label})`, () => {
      const pair = createPair({
        configure: (c) => (c.staticMoving = staticMoving),
      });
      for (const [deltaY, deltaMode] of [
        [120, 0],
        [-240, 0],
        [3, 1],
        [-5, 1],
        [1, 2],
        [-2, 2],
      ] as const) {
        pair.wheel(deltaY, deltaMode);
        pair.update(3);
      }
      pair.dispose();
    });

    it(`zooms and pans an orthographic camera through zoom (${label})`, () => {
      const pair = createPair({
        camera: "orthographic",
        configure: (c) => {
          c.staticMoving = staticMoving;
          c.minZoom = 0.5;
          c.maxZoom = 1.6;
        },
      });
      pair.drag(1, [
        [400, 300],
        [400, 250],
        [400, 150],
        [400, 50],
      ]);
      pair.update(4);
      expect(pair.easelCamera.zoom).toBe(1.6);
      // A pixel-mode wheel step of 4000 divides zoom by up to 2.2.
      for (let i = 0; i < 3; i++) {
        pair.wheel(4000);
        pair.update(6);
      }
      expect(pair.easelCamera.zoom).toBe(0.5);
      pair.drag(2, SWEEP, 2);
      pair.drag(0, SWEEP, 2);
      pair.update(4);
      pair.dispose();
    });
  }

  it("clamps the perspective distance to minDistance and maxDistance", () => {
    const pair = createPair({
      configure: (c) => {
        c.minDistance = 5;
        c.maxDistance = 8;
        c.staticMoving = true;
      },
    });
    pair.wheel(-30, 1);
    pair.update();
    expect(pair.easelCamera.position.distanceTo(pair.easel.target)).toBeCloseTo(
      5,
      9,
    );
    pair.wheel(100, 1);
    pair.update();
    expect(pair.easelCamera.position.distanceTo(pair.easel.target)).toBeCloseTo(
      8,
      9,
    );
    pair.drag(1, [
      [400, 300],
      [400, 100],
    ]);
    pair.dispose();
  });

  it("switches every button to the action of a held A, S, or D key", () => {
    const pair = createPair({ configure: (c) => (c.staticMoving = true) });
    for (const code of ["KeyA", "KeyS", "KeyD"]) {
      pair.key("keydown", code);
      // A repeated keydown while held must not change the key state.
      pair.key("keydown", "KeyS");
      pair.compare();
      pair.drag(2, SWEEP);
      pair.key("keyup", code);
      pair.compare();
    }
    pair.drag(0, SWEEP);
    pair.dispose();
  });

  it("ignores keys whose action is disabled", () => {
    const pair = createPair({
      configure: (c) => {
        c.noZoom = true;
        c.keys = ["KeyQ", "KeyW", "KeyE"];
      },
    });
    pair.key("keydown", "KeyW");
    pair.compare();
    expect(pair.easel.keyState).toBe(-1);
    pair.key("keyup", "KeyW");
    pair.key("keydown", "KeyE");
    pair.compare();
    expect(pair.easel.keyState).toBe(2);
    pair.key("keyup", "KeyE");
    pair.dispose();
  });

  it("honours noRotate, noZoom, and noPan", () => {
    const pair = createPair({
      configure: (c) => {
        c.noRotate = true;
        c.noZoom = true;
        c.noPan = true;
      },
    });
    pair.drag(0, SWEEP);
    pair.drag(1, SWEEP);
    pair.drag(2, SWEEP);
    pair.wheel(500);
    pair.update(3);
    expect(pair.easelCamera.position.toArray()).toEqual([1, 2, 6]);
    pair.dispose();
  });

  it("maps mouseButtons to actions and ignores unmapped buttons", () => {
    const pair = createPair({
      configure: (c) => {
        c.mouseButtons = {
          LEFT: MOUSE.PAN,
          MIDDLE: undefined,
          RIGHT: MOUSE.DOLLY,
        };
      },
    });
    pair.drag(0, SWEEP);
    pair.drag(1, SWEEP);
    pair.drag(2, SWEEP);
    pair.drag(4, SWEEP);
    pair.update(5);
    pair.dispose();
  });

  it("rotates with a non +Y up vector and custom speeds", () => {
    const pair = createPair({
      position: [4, -3, 2],
      up: [0, 0, 1],
      configure: (c) => {
        c.rotateSpeed = 2.5;
        c.zoomSpeed = 3;
        c.panSpeed = 0.9;
        c.dynamicDampingFactor = 0.35;
      },
    });
    pair.drag(0, LONG_SWEEP, 2);
    pair.drag(1, SWEEP);
    pair.drag(2, SWEEP);
    pair.update(10);
    pair.dispose();
  });

  it("rotates with one finger and zooms and pans with two", () => {
    const pair = createPair();
    const touch = { pointerType: "touch" };
    pair.down(1, 400, 300, touch);
    pair.compare();
    pair.move(1, 450, 280, touch);
    pair.update(2);
    pair.down(2, 500, 300, touch);
    pair.compare();
    pair.move(2, 560, 320, touch);
    pair.update();
    pair.move(1, 380, 260, touch);
    pair.update();
    pair.move(2, 520, 250, touch);
    pair.update(2);
    pair.up(2, 520, 250, touch);
    pair.compare();
    pair.move(1, 360, 240, touch);
    pair.update(2);
    pair.up(1, 360, 240, touch);
    pair.update(4);
    expect(pair.element.captured).toEqual([1, 1]);
    expect(pair.element.released).toEqual([1, 1]);
    pair.dispose();
  });

  it("pinches an orthographic camera through zoom", () => {
    const pair = createPair({ camera: "orthographic" });
    const touch = { pointerType: "touch" };
    pair.down(1, 300, 300, touch);
    pair.down(2, 500, 300, touch);
    pair.move(2, 600, 300, touch);
    pair.update();
    pair.move(1, 250, 320, touch);
    pair.update(2);
    pair.up(1, 250, 320, touch);
    pair.up(2, 600, 300, touch);
    pair.update(3);
    expect(pair.easelCamera.zoom).not.toBe(1);
    pair.dispose();
  });

  for (const staticMoving of [true, false]) {
    it(`rolls with a two-finger twist when multiTouchRoll is on (${staticMoving ? "static" : "damped"})`, () => {
      const pair = createPair({
        configure: (c) => {
          c.multiTouchRoll = true;
          c.rollSpeed = 1.5;
          c.staticMoving = staticMoving;
        },
      });
      const touch = { pointerType: "touch" };
      pair.down(1, 300, 300, touch);
      pair.down(2, 500, 300, touch);
      pair.update();
      pair.move(2, 490, 360, touch);
      pair.update();
      pair.move(1, 310, 240, touch);
      pair.update();
      pair.move(2, 440, 420, touch);
      pair.update(2);
      pair.up(2, 440, 420, touch);
      pair.up(1, 310, 240, touch);
      pair.update(5);
      pair.dispose();
    });
  }

  it("drops a cancelled pointer", () => {
    const pair = createPair();
    const touch = { pointerType: "touch" };
    pair.down(1, 300, 300, touch);
    pair.down(2, 500, 300, touch);
    pair.element.dispatchEvent(
      event("pointercancel", { pointerId: 2, pointerType: "touch" }),
    );
    pair.move(1, 340, 280, touch);
    pair.update(2);
    pair.up(1, 340, 280, touch);
    pair.update(2);
    pair.dispose();
  });

  it("resets the target, position, up vector, and zoom", () => {
    for (const camera of ["perspective", "orthographic"] as const) {
      const pair = createPair({ camera, up: [0.2, 1, 0] });
      pair.drag(0, LONG_SWEEP);
      pair.drag(2, SWEEP);
      pair.wheel(-300);
      pair.update(3);
      pair.three.reset();
      pair.easel.reset();
      pair.compare();
      expect(pair.easelCamera.position.toArray()).toEqual([1, 2, 6]);
      expect(pair.easelCamera.zoom).toBe(1);
      pair.update(3);
      pair.dispose();
    }
  });

  it("ignores input while disabled and stops listening after dispose", () => {
    const pair = createPair();
    pair.three.enabled = false;
    pair.easel.enabled = false;
    pair.drag(0, SWEEP);
    pair.wheel(300);
    pair.key("keydown", "KeyA");
    pair.update(2);
    pair.key("keyup", "KeyA");
    pair.three.enabled = true;
    pair.easel.enabled = true;
    pair.dispose();
    pair.drag(0, SWEEP);
    pair.wheel(300);
    pair.update(2);
    expect(pair.easelCamera.position.toArray()).toEqual([1, 2, 6]);
  });
});
