/**
 * Side-by-side rig for OrbitControls and MapControls parity tests.
 *
 * One fake DOM element feeds identical pointer, wheel, and key events to the
 * three.js r186 control and the EASEL control. After every step the rig
 * compares camera position, quaternion, zoom, target, and the dispatched
 * event types, and tracks the largest numeric difference.
 */
import { OrthographicCamera } from "@/cameras/OrthographicCamera.js";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.js";
import { MapControls } from "@/controls/MapControls.js";
import { OrbitControls } from "@/controls/OrbitControls.js";

type Xyz = { x: number; y: number; z: number };

interface ThreeVector3 extends Xyz {
  set(x: number, y: number, z: number): this;
}

interface ThreeCamera {
  position: ThreeVector3;
  up: ThreeVector3;
  quaternion: Xyz & { w: number };
  zoom: number;
  updateMatrixWorld(force?: boolean): void;
}

interface ThreeOrbitControls {
  target: ThreeVector3;
  cursor: ThreeVector3;
  addEventListener(
    type: string,
    listener: (event: { type: string }) => void,
  ): void;
  enabled: boolean;
  state: number;
  getPolarAngle(): number;
  getAzimuthalAngle(): number;
  getDistance(): number;
  listenToKeyEvents(target: EventTarget): void;
  update(delta?: number | null): boolean;
  saveState(): void;
  reset(): void;
  dispose(): void;
}

type ThreeOrbitControlsConstructor = new (
  object: ThreeCamera,
  element: EventTarget,
) => ThreeOrbitControls;

interface ThreeModule {
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
}

const threeModulePath = "three";
const orbitModulePath = "three/examples/jsm/controls/OrbitControls.js";
const mapModulePath = "three/examples/jsm/controls/MapControls.js";

const THREE = (await import(threeModulePath)) as ThreeModule;
const ThreeOrbit = ((await import(orbitModulePath)) as Record<string, unknown>)[
  "OrbitControls"
] as ThreeOrbitControlsConstructor;
const ThreeMap = ((await import(mapModulePath)) as Record<string, unknown>)[
  "MapControls"
] as ThreeOrbitControlsConstructor;

/**
 * Default tolerance: each compared number must satisfy
 * `|easel - three| < epsilon * max(1, |three|)`. EASEL stores matrices as
 * Float32, so errors scale with the magnitude of the compared value.
 */
export const PARITY_EPSILON = 1e-6;

/** Element size used by every rig. */
export const WIDTH = 800;
export const HEIGHT = 600;

/** Minimal DOM element both controls attach to. */
class FakeElement extends EventTarget {
  readonly clientWidth = WIDTH;
  readonly clientHeight = HEIGHT;
  readonly style = { touchAction: "", cursor: "" };
  readonly ownerDocument = new EventTarget();
  getRootNode(): EventTarget {
    return this.ownerDocument;
  }
  setPointerCapture(_pointerId: number): void {}
  releasePointerCapture(_pointerId: number): void {}
  getBoundingClientRect() {
    return { left: 0, top: 0, width: WIDTH, height: HEIGHT };
  }
}

/** Options shared by both implementations and set on both before a sequence. */
export interface OrbitParityOptions {
  enableDamping?: boolean;
  dampingFactor?: number;
  enableZoom?: boolean;
  enableRotate?: boolean;
  enablePan?: boolean;
  zoomSpeed?: number;
  rotateSpeed?: number;
  panSpeed?: number;
  keyPanSpeed?: number;
  keyRotateSpeed?: number;
  screenSpacePanning?: boolean;
  zoomToCursor?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  minDistance?: number;
  maxDistance?: number;
  minZoom?: number;
  maxZoom?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  minAzimuthAngle?: number;
  maxAzimuthAngle?: number;
  minTargetRadius?: number;
  maxTargetRadius?: number;
  cursorStyle?: "auto" | "grab";
}

/** Camera setup applied identically to both sides before the controls exist. */
export interface OrbitParityCamera {
  kind: "perspective" | "orthographic";
  position: [number, number, number];
  up?: [number, number, number];
  target?: [number, number, number];
}

interface PointerOptions {
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}

/** Drives both controls with the same inputs and compares their outputs. */
export class OrbitParityRig {
  readonly element = new FakeElement();
  readonly keyTarget = new EventTarget();
  readonly threeCamera: ThreeCamera;
  readonly easelCamera: PerspectiveCamera | OrthographicCamera;
  readonly three: ThreeOrbitControls;
  readonly easel: OrbitControls;
  readonly threeEvents: string[] = [];
  readonly easelEvents: string[] = [];
  /** Largest `|easel - three| / max(1, |three|)` seen so far. */
  maxError = 0;
  readonly epsilon: number;

  constructor(
    kind: "orbit" | "map",
    camera: OrbitParityCamera,
    options: OrbitParityOptions = {},
    epsilon = PARITY_EPSILON,
  ) {
    this.epsilon = epsilon;
    if (camera.kind === "perspective") {
      this.threeCamera = new THREE.PerspectiveCamera(
        50,
        WIDTH / HEIGHT,
        0.1,
        1000,
      );
      this.easelCamera = new PerspectiveCamera({
        fov: 50,
        aspect: WIDTH / HEIGHT,
        near: 0.1,
        far: 1000,
      });
    } else {
      this.threeCamera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 1000);
      this.easelCamera = new OrthographicCamera({
        left: -4,
        right: 4,
        top: 3,
        bottom: -3,
        near: 0.1,
        far: 1000,
      });
    }
    const [px, py, pz] = camera.position;
    this.threeCamera.position.set(px, py, pz);
    this.easelCamera.position.set(px, py, pz);
    if (camera.up) {
      const [ux, uy, uz] = camera.up;
      this.threeCamera.up.set(ux, uy, uz);
      this.easelCamera.up.set(ux, uy, uz);
    }

    const ThreeControls = kind === "orbit" ? ThreeOrbit : ThreeMap;
    const EaselControls = kind === "orbit" ? OrbitControls : MapControls;
    this.three = new ThreeControls(this.threeCamera, this.element);
    this.easel = new EaselControls(this.easelCamera, this.element);

    if (camera.target) {
      const [tx, ty, tz] = camera.target;
      this.three.target.set(tx, ty, tz);
      this.easel.target.set(tx, ty, tz);
    }
    this.configure(options);
    this.three.update();
    this.easel.update();

    for (const type of ["change", "start", "end"]) {
      this.three.addEventListener(type, (event) =>
        this.threeEvents.push(event.type),
      );
      this.easel.addEventListener(type, (event) =>
        this.easelEvents.push(event.type),
      );
    }
    this.compare("setup");
  }

  /** Assigns the same options to both controls. */
  configure(options: OrbitParityOptions): void {
    Object.assign(this.three, options);
    Object.assign(this.easel, options);
  }

  /** Mouse button press at client coordinates. */
  down(
    button: number,
    x: number,
    y: number,
    options: PointerOptions = {},
  ): this {
    this.#pointer(
      this.element,
      "pointerdown",
      1,
      "mouse",
      x,
      y,
      button,
      options,
    );
    return this;
  }

  /** Mouse move while pressed, delivered to the owner document. */
  move(x: number, y: number): this {
    this.#pointer(
      this.element.ownerDocument,
      "pointermove",
      1,
      "mouse",
      x,
      y,
      -1,
    );
    return this;
  }

  /** Mouse button release, delivered to the owner document. */
  up(x: number, y: number): this {
    this.#pointer(this.element.ownerDocument, "pointerup", 1, "mouse", x, y, 0);
    return this;
  }

  /** Presses, moves in `steps` equal parts, and releases one mouse button. */
  drag(
    button: number,
    from: [number, number],
    to: [number, number],
    steps = 4,
    options: PointerOptions = {},
  ): this {
    this.down(button, from[0], from[1], options);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      this.move(
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t,
      );
    }
    return this.up(to[0], to[1]);
  }

  /** Wheel event at client coordinates. */
  wheel(
    deltaY: number,
    x = WIDTH / 2,
    y = HEIGHT / 2,
    extra: { deltaMode?: number; ctrlKey?: boolean } = {},
  ): this {
    const event = Object.assign(new Event("wheel", { cancelable: true }), {
      deltaY,
      deltaMode: extra.deltaMode ?? 0,
      ctrlKey: extra.ctrlKey ?? false,
      clientX: x,
      clientY: y,
    });
    this.element.dispatchEvent(event);
    return this.compare(`wheel ${deltaY}`);
  }

  /** Touch pointer press. */
  touchDown(pointerId: number, x: number, y: number): this {
    this.#pointer(this.element, "pointerdown", pointerId, "touch", x, y, 0);
    return this;
  }

  /** Touch pointer move, delivered to the owner document. */
  touchMove(pointerId: number, x: number, y: number): this {
    this.#pointer(
      this.element.ownerDocument,
      "pointermove",
      pointerId,
      "touch",
      x,
      y,
      -1,
    );
    return this;
  }

  /** Touch pointer release, delivered to the owner document. */
  touchUp(pointerId: number, x: number, y: number): this {
    this.#pointer(
      this.element.ownerDocument,
      "pointerup",
      pointerId,
      "touch",
      x,
      y,
      0,
    );
    return this;
  }

  /** Key press on the target passed to `listenToKeyEvents`. */
  key(code: string, options: PointerOptions = {}): this {
    const event = Object.assign(new Event("keydown", { cancelable: true }), {
      code,
      key: code,
      ctrlKey: options.ctrlKey ?? false,
      metaKey: options.metaKey ?? false,
      shiftKey: options.shiftKey ?? false,
    });
    this.keyTarget.dispatchEvent(event);
    return this.compare(`key ${code}`);
  }

  /** Key press or release on the element's root node, as seen by the Control-key intercept. */
  rootKey(type: "keydown" | "keyup", key: string): this {
    const event = Object.assign(new Event(type), { key, code: key });
    this.element.ownerDocument.dispatchEvent(event);
    return this.compare(`root ${type} ${key}`);
  }

  /** Calls `update` on both controls `count` times. */
  update(count = 1, delta?: number): this {
    for (let i = 0; i < count; i++) {
      const threeChanged = this.three.update(delta ?? null);
      const easelChanged = this.easel.update(delta);
      if (threeChanged !== easelChanged) {
        throw new Error(
          `update() returned ${easelChanged}, three.js ${threeChanged}`,
        );
      }
      this.compare(`update ${i}`);
    }
    return this;
  }

  /** Throws when a compared value is outside the rig tolerance or more. */
  compare(step: string): this {
    const pairs: [string, Xyz, Xyz][] = [
      ["position", this.easelCamera.position, this.threeCamera.position],
      ["target", this.easel.target, this.three.target],
    ];
    for (const [name, easel, three] of pairs) {
      this.#check(step, `${name}.x`, easel.x, three.x);
      this.#check(step, `${name}.y`, easel.y, three.y);
      this.#check(step, `${name}.z`, easel.z, three.z);
    }
    const eq = this.easelCamera.quaternion;
    const tq = this.threeCamera.quaternion;
    // q and -q are the same rotation; compare with a matching sign.
    const sign =
      eq.x * tq.x + eq.y * tq.y + eq.z * tq.z + eq.w * tq.w < 0 ? -1 : 1;
    this.#check(step, "quaternion.x", eq.x * sign, tq.x);
    this.#check(step, "quaternion.y", eq.y * sign, tq.y);
    this.#check(step, "quaternion.z", eq.z * sign, tq.z);
    this.#check(step, "quaternion.w", eq.w * sign, tq.w);
    this.#check(step, "zoom", this.easelCamera.zoom, this.threeCamera.zoom);
    this.#check(
      step,
      "polarAngle",
      this.easel.polarAngle,
      this.three.getPolarAngle(),
    );
    this.#check(
      step,
      "azimuthalAngle",
      this.easel.azimuthalAngle,
      this.three.getAzimuthalAngle(),
    );
    this.#check(
      step,
      "distance",
      this.easel.distance,
      this.three.getDistance(),
    );
    if (this.easel.state !== this.three.state) {
      throw new Error(
        `${step}: state ${this.easel.state} vs three.js ${this.three.state}`,
      );
    }
    const easelEvents = this.easelEvents.join(",");
    const threeEvents = this.threeEvents.join(",");
    if (easelEvents !== threeEvents) {
      throw new Error(
        `${step}: events [${easelEvents}] vs three.js [${threeEvents}]`,
      );
    }
    return this;
  }

  /** Removes both controls' listeners. */
  dispose(): void {
    this.three.dispose();
    this.easel.dispose();
  }

  #check(step: string, name: string, easel: number, three: number): void {
    const error = Math.abs(easel - three) / Math.max(1, Math.abs(three));
    if (!(error < this.epsilon)) {
      throw new Error(`${step}: ${name} is ${easel}, three.js ${three}`);
    }
    if (error > this.maxError) this.maxError = error;
  }

  #pointer(
    target: EventTarget,
    type: string,
    pointerId: number,
    pointerType: "mouse" | "touch",
    x: number,
    y: number,
    button: number,
    options: PointerOptions = {},
  ): void {
    const event = Object.assign(new Event(type, { cancelable: true }), {
      pointerId,
      pointerType,
      button,
      clientX: x,
      clientY: y,
      pageX: x,
      pageY: y,
      ctrlKey: options.ctrlKey ?? false,
      metaKey: options.metaKey ?? false,
      shiftKey: options.shiftKey ?? false,
    });
    target.dispatchEvent(event);
    this.compare(`${pointerType} ${type} (${x}, ${y})`);
  }
}
