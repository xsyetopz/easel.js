import { EventDispatcher } from "../core/EventDispatcher.ts";
import type { EulerOrder } from "../math/Euler.ts";
import { Vector3 } from "../math/Vector3.ts";
import {
  type ControlDomElement,
  type ControlEvent,
  prevent,
} from "./ControlDom.ts";

type FlyCamera = {
  position: Vector3;
  rotation: {
    x: number;
    y: number;
    z: number;
    order: EulerOrder;
    set: (x: number, y: number, z: number, order?: EulerOrder) => void;
  };
  quaternion: { x: number; y: number; z: number; w: number };
  updateMatrixWorld: (...args: boolean[]) => void;
};

type FlyMoveState = {
  up: number;
  down: number;
  left: number;
  right: number;
  forward: number;
  back: number;
  pitchUp: number;
  pitchDown: number;
  yawLeft: number;
  yawRight: number;
  rollLeft: number;
  rollRight: number;
};

const _move = new Vector3();
const _rotation = new Vector3();
const _local = new Vector3();
const _EPS = 1e-6;

/**
 * Unconstrained flight-camera controls matching three.js FlyControls input
 * semantics while translating and rotating an EASEL camera on the CPU.
 */
export class FlyControls extends EventDispatcher {
  /** Camera transformed by the flight controls. */
  camera: FlyCamera;
  /** Element receiving pointer input and browser gesture suppression. */
  domElement: ControlDomElement;
  /** World units moved per second. */
  movementSpeed: number = 1;
  /** Radians rotated per second for keyboard/pointer input. */
  rollSpeed: number = 0.005;
  /** When true, pointer look is active only during a held pointer gesture. */
  dragToLook: boolean = false;
  /** Move forward while the back key is not held. */
  autoForward: boolean = false;
  /** Temporary speed factor while either Shift key is held. */
  movementSpeedMultiplier: number = 1;
  /** Whether this control accepts input and updates the camera. */
  enabled: boolean = true;

  readonly #moveState: FlyMoveState = {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
    forward: 0,
    back: 0,
    pitchUp: 0,
    pitchDown: 0,
    yawLeft: 0,
    yawRight: 0,
    rollLeft: 0,
    rollRight: 0,
  };
  #status = 0;
  readonly #listeners: Array<[string, EventListener]> = [];
  readonly #globalListeners: Array<[string, EventListener]> = [];

  /** Creates controls and installs browser input listeners. */
  constructor(camera: FlyCamera, domElement: ControlDomElement) {
    super();
    this.camera = camera;
    this.domElement = domElement;
    this.#listenGlobal("keydown", this.#onKeyDown.bind(this));
    this.#listenGlobal("keyup", this.#onKeyUp.bind(this));
    this.#listen("pointermove", this.#onPointerMove.bind(this));
    this.#listen("pointerdown", this.#onPointerDown.bind(this));
    this.#listen("pointerup", this.#onPointerUp.bind(this));
    this.#listen("pointercancel", this.#onPointerCancel.bind(this));
    this.#listen("contextmenu", (event) => prevent(event));
    if (domElement.style) domElement.style.touchAction = "none";
  }

  /** Applies movement and rotation for elapsed seconds; returns whether changed. */
  update(delta: number): boolean {
    if (!this.enabled) return false;
    const seconds = Math.max(0, Number.isFinite(delta) ? delta : 0);
    const moveMult =
      seconds * this.movementSpeed * this.movementSpeedMultiplier;
    _local
      .set(_move.x, _move.y, _move.z)
      .applyQuaternion(this.camera.quaternion);
    this.camera.position.addScaledVector(_local, moveMult);
    const rotationMult = seconds * this.rollSpeed;
    const beforeX = this.camera.rotation.x;
    const beforeY = this.camera.rotation.y;
    const beforeZ = this.camera.rotation.z;
    this.camera.rotation.set(
      beforeX + _rotation.x * rotationMult,
      beforeY + _rotation.y * rotationMult,
      beforeZ + _rotation.z * rotationMult,
      this.camera.rotation.order,
    );
    this.camera.updateMatrixWorld(false, true);
    const moved =
      _local.lengthSq * moveMult * moveMult > _EPS ||
      Math.abs(_rotation.x * rotationMult) > _EPS ||
      Math.abs(_rotation.y * rotationMult) > _EPS ||
      Math.abs(_rotation.z * rotationMult) > _EPS;
    if (moved) this.dispatchEvent({ type: "change" });
    return moved;
  }

  /** Removes all browser listeners and restores touch scrolling. */
  dispose(): void {
    for (const [type, listener] of this.#listeners)
      this.domElement.removeEventListener(type, listener);
    this.#listeners.length = 0;
    const globalTarget = globalThis as unknown as {
      removeEventListener?: (type: string, listener: EventListener) => void;
    };
    if (globalTarget.removeEventListener)
      for (const [type, listener] of this.#globalListeners)
        globalTarget.removeEventListener(type, listener);
    this.#globalListeners.length = 0;
    if (this.domElement.style) this.domElement.style.touchAction = "";
  }

  #listen(type: string, listener: EventListener): void {
    this.domElement.addEventListener(type, listener);
    this.#listeners.push([type, listener]);
  }

  #listenGlobal(type: string, listener: EventListener): void {
    const target = globalThis as unknown as {
      addEventListener?: (type: string, listener: EventListener) => void;
    };
    if (typeof target.addEventListener === "function") {
      target.addEventListener(type, listener);
      this.#globalListeners.push([type, listener]);
    }
  }

  #updateVectors(): void {
    const state = this.#moveState;
    const forward = state.forward || (this.autoForward && !state.back) ? 1 : 0;
    _move.set(
      -state.left + state.right,
      -state.down + state.up,
      -forward + state.back,
    );
    _rotation.set(
      -state.pitchDown + state.pitchUp,
      -state.yawRight + state.yawLeft,
      -state.rollRight + state.rollLeft,
    );
  }

  #onKeyDown(raw: Event): void {
    if (!this.enabled) return;
    const event = raw as ControlEvent & { altKey?: boolean };
    if (event.altKey) return;
    const code = event.code ?? event.key ?? "";
    switch (code) {
      case "ShiftLeft":
      case "ShiftRight":
        this.movementSpeedMultiplier = 0.1;
        break;
      case "KeyW":
        this.#moveState.forward = 1;
        break;
      case "KeyS":
        this.#moveState.back = 1;
        break;
      case "KeyA":
        this.#moveState.left = 1;
        break;
      case "KeyD":
        this.#moveState.right = 1;
        break;
      case "KeyR":
        this.#moveState.up = 1;
        break;
      case "KeyF":
        this.#moveState.down = 1;
        break;
      case "ArrowUp":
        this.#moveState.pitchUp = 1;
        break;
      case "ArrowDown":
        this.#moveState.pitchDown = 1;
        break;
      case "ArrowLeft":
        this.#moveState.yawLeft = 1;
        break;
      case "ArrowRight":
        this.#moveState.yawRight = 1;
        break;
      case "KeyQ":
        this.#moveState.rollLeft = 1;
        break;
      case "KeyE":
        this.#moveState.rollRight = 1;
        break;
      default:
        return;
    }
    this.#updateVectors();
  }

  #onKeyUp(raw: Event): void {
    if (!this.enabled) return;
    const code = (raw as ControlEvent).code ?? (raw as ControlEvent).key ?? "";
    switch (code) {
      case "ShiftLeft":
      case "ShiftRight":
        this.movementSpeedMultiplier = 1;
        break;
      case "KeyW":
        this.#moveState.forward = 0;
        break;
      case "KeyS":
        this.#moveState.back = 0;
        break;
      case "KeyA":
        this.#moveState.left = 0;
        break;
      case "KeyD":
        this.#moveState.right = 0;
        break;
      case "KeyR":
        this.#moveState.up = 0;
        break;
      case "KeyF":
        this.#moveState.down = 0;
        break;
      case "ArrowUp":
        this.#moveState.pitchUp = 0;
        break;
      case "ArrowDown":
        this.#moveState.pitchDown = 0;
        break;
      case "ArrowLeft":
        this.#moveState.yawLeft = 0;
        break;
      case "ArrowRight":
        this.#moveState.yawRight = 0;
        break;
      case "KeyQ":
        this.#moveState.rollLeft = 0;
        break;
      case "KeyE":
        this.#moveState.rollRight = 0;
        break;
      default:
        return;
    }
    this.#updateVectors();
  }

  #onPointerDown(raw: Event): void {
    if (!this.enabled) return;
    const event = raw as ControlEvent;
    if (this.dragToLook) this.#status++;
    else if (event.button === 0) this.#moveState.forward = 1;
    else if (event.button === 2) this.#moveState.back = 1;
    this.#updateVectors();
  }

  #onPointerMove(raw: Event): void {
    if (!this.enabled || (this.dragToLook && this.#status === 0)) return;
    const event = raw as ControlEvent;
    const width = this.domElement.clientWidth ?? 800;
    const height = this.domElement.clientHeight ?? 600;
    const bounds = this.domElement.getBoundingClientRect?.();
    const x = (event.clientX ?? 0) - (bounds?.left ?? 0);
    const y = (event.clientY ?? 0) - (bounds?.top ?? 0);
    this.#moveState.yawLeft = -(x - width * 0.5) / Math.max(1, width * 0.5);
    this.#moveState.pitchDown = (y - height * 0.5) / Math.max(1, height * 0.5);
    this.#updateVectors();
  }

  #onPointerUp(raw: Event): void {
    if (!this.enabled) return;
    const event = raw as ControlEvent;
    if (this.dragToLook) this.#status = Math.max(0, this.#status - 1);
    else if (event.button === 0) this.#moveState.forward = 0;
    else if (event.button === 2) this.#moveState.back = 0;
    this.#moveState.yawLeft = 0;
    this.#moveState.pitchDown = 0;
    this.#updateVectors();
  }

  #onPointerCancel(): void {
    this.#status = 0;
    this.#moveState.forward = 0;
    this.#moveState.back = 0;
    this.#moveState.yawLeft = 0;
    this.#moveState.pitchDown = 0;
    this.#updateVectors();
  }
}
