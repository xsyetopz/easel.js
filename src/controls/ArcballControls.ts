import { EventDispatcher } from "../core/EventDispatcher.ts";
import { Quaternion } from "../math/Quaternion.ts";
import { Vector3 } from "../math/Vector3.ts";
import {
  type ControlDomElement,
  type ControlEvent,
  prevent,
} from "./ControlDom.ts";

/** Camera surface consumed by the CPU arcball implementation. */
type ArcballCamera = {
  /** Camera world position. */
  position: Vector3;
  /** Camera orientation quaternion. */
  quaternion: Quaternion;
  /** Camera up direction. */
  up: Vector3;
  /** Camera world matrix elements. */
  matrixWorld: { elements: ArrayLike<number> };
  /** Reorients the camera toward a world-space target. */
  lookAt: (target: Vector3) => void;
  /** Recomputes camera world matrices. */
  updateMatrixWorld: (...args: boolean[]) => void;
};

type ArcballState = "none" | "rotate" | "pan";
/** Pointer-button actions supported by {@link ArcballControls}. */
type MouseAction = "rotate" | "pan" | "zoom";

const _offset = new Vector3();
const _rotation = new Quaternion();
const _axis = new Vector3();
const _right = new Vector3();
const _up = new Vector3();

/** CPU arcball camera controls with the public lifecycle of three.js ArcballControls. */
export class ArcballControls extends EventDispatcher {
  /** Camera moved by arcball rotation, panning, and zooming. */
  camera: ArcballCamera;
  /** Event target receiving pointer and wheel listeners. */
  domElement: ControlDomElement;
  /** World-space point at the center of the arcball. */
  target = new Vector3();
  /** Enables all user input when true. */
  enabled: boolean = true;
  /** Enables left-button arcball rotation. */
  enableRotate = true;
  /** Enables middle/right-button panning. */
  enablePan = true;
  /** Enables wheel zoom. */
  enableZoom = true;
  /** Pointer rotation multiplier. */
  rotateSpeed = 1;
  /** Pointer pan multiplier. */
  panSpeed = 1;
  /** Wheel zoom multiplier. */
  zoomSpeed = 1;
  /** Minimum camera distance from the target. */
  minDistance = 0;
  /** Maximum camera distance from the target. */
  maxDistance = Number.POSITIVE_INFINITY;
  /** Whether controls expose a CPU gizmo state; no GPU gizmo is created. */
  gizmosVisible = false;

  #state: ArcballState = "none";
  #pointerId = -1;
  readonly #pointer = { x: 0, y: 0 };
  readonly #startArcball = new Vector3();
  readonly #startOffset = new Vector3();
  readonly #initialPosition: Vector3;
  readonly #initialTarget: Vector3;
  readonly #savedPosition: Vector3;
  readonly #savedTarget: Vector3;
  #changed = false;
  readonly #listeners: Array<[string, EventListener]> = [];
  readonly #actions: Record<number, MouseAction> = {
    0: "rotate",
    1: "pan",
    2: "pan",
  };

  /** Creates arcball controls and installs listeners on `domElement`. */
  constructor(camera: ArcballCamera, domElement: ControlDomElement) {
    super();
    this.camera = camera;
    this.domElement = domElement;
    this.#initialPosition = camera.position.clone();
    this.#initialTarget = this.target.clone();
    this.#savedPosition = this.#initialPosition.clone();
    this.#savedTarget = this.#initialTarget.clone();
    this.#listen("pointerdown", this.#onPointerDown.bind(this));
    this.#listen("pointermove", this.#onPointerMove.bind(this));
    this.#listen("pointerup", this.#onPointerUp.bind(this));
    this.#listen("pointercancel", this.#onPointerUp.bind(this));
    this.#listen("wheel", this.#onWheel.bind(this));
    this.#listen("contextmenu", (event) => prevent(event));
    if (domElement.style) domElement.style.touchAction = "none";
  }

  /** Applies the current camera transform and reports whether it changed. */
  update(): boolean {
    const changed = this.#changed;
    this.#changed = false;
    this.camera.updateMatrixWorld(false, true);
    return changed;
  }

  /** Saves the current camera and target for a later `reset()`. */
  saveState(): void {
    this.#savedPosition.copy(this.camera.position);
    this.#savedTarget.copy(this.target);
  }

  /** Restores the state captured by `saveState()`. */
  reset(): void {
    this.camera.position.copy(this.#savedPosition);
    this.target.copy(this.#savedTarget);
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld(false, true);
    this.#changed = true;
    this.dispatchEvent({ type: "change" });
  }

  /** Changes whether the optional CPU gizmo state is exposed. */
  setGizmosVisible(value: boolean): void {
    this.gizmosVisible = value;
  }

  /** Replaces a mouse button's action with rotate, pan, or zoom behavior. */
  setMouseAction(button: number, action: MouseAction): void {
    if (!Number.isInteger(button) || button < 0) {
      throw new RangeError("ArcballControls mouse buttons must be integers.");
    }
    this.#actions[button] = action;
  }

  /** Clears installed DOM listeners. */
  dispose(): void {
    for (const [type, listener] of this.#listeners)
      this.domElement.removeEventListener(type, listener);
    this.#listeners.length = 0;
  }

  #listen(type: string, listener: EventListener): void {
    this.domElement.addEventListener(type, listener);
    this.#listeners.push([type, listener]);
  }

  #point(event: ControlEvent, target: Vector3): Vector3 {
    const width = this.domElement.clientWidth ?? 800;
    const height = this.domElement.clientHeight ?? 600;
    const rect = this.domElement.getBoundingClientRect?.();
    const x =
      (((event.clientX ?? 0) - (rect?.left ?? 0)) / (rect?.width ?? width)) *
        2 -
      1;
    const y =
      1 -
      (((event.clientY ?? 0) - (rect?.top ?? 0)) / (rect?.height ?? height)) *
        2;
    const length = Math.sqrt(x * x + y * y);
    if (length > 1) return target.set(x / length, y / length, 0);
    return target.set(x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y)));
  }

  #onPointerDown(raw: Event): void {
    if (!this.enabled) return;
    const event = raw as ControlEvent;
    const button = event.button ?? 0;
    const action = this.#actions[button];
    if (action === undefined || action === "zoom") return;
    if (action === "rotate" && !this.enableRotate) return;
    if (action === "pan" && !this.enablePan) return;
    this.#state = action;
    this.#pointerId = event.pointerId ?? 0;
    this.domElement.setPointerCapture?.(this.#pointerId);
    this.#pointer.x = event.clientX ?? 0;
    this.#pointer.y = event.clientY ?? 0;
    this.#startArcball.copy(this.#point(event, _offset));
    this.#startOffset.copy(this.camera.position).sub(this.target);
    this.dispatchEvent({ type: "start" });
  }

  #onPointerMove(raw: Event): void {
    if (!this.enabled || this.#state === "none") return;
    const event = raw as ControlEvent;
    if ((event.pointerId ?? 0) !== this.#pointerId) return;
    const x = event.clientX ?? 0;
    const y = event.clientY ?? 0;
    const dx = x - this.#pointer.x;
    const dy = y - this.#pointer.y;
    this.#pointer.x = x;
    this.#pointer.y = y;
    if (this.#state === "rotate") {
      const current = this.#point(event, _offset);
      _rotation.setFromUnitVectors(this.#startArcball, current);
      if (this.rotateSpeed !== 1) {
        const angle =
          2 *
          Math.acos(Math.max(-1, Math.min(1, _rotation.w))) *
          this.rotateSpeed;
        const sine = Math.sqrt(Math.max(0, 1 - _rotation.w * _rotation.w));
        if (sine > 1e-8) {
          _axis.set(_rotation.x / sine, _rotation.y / sine, _rotation.z / sine);
          _rotation.setFromAxisAngle(_axis, angle);
        }
      }
      this.camera.position
        .copy(this.#startOffset)
        .applyQuaternion(_rotation)
        .add(this.target);
      this.#clampDistance();
    } else {
      const distance = this.camera.position.distanceTo(this.target);
      const elements = this.camera.matrixWorld.elements;
      _right.set(elements[0], elements[1], elements[2]);
      _up.set(elements[4], elements[5], elements[6]);
      const scale = distance * this.panSpeed * 0.001;
      this.target.x -= (_right.x * dx - _up.x * dy) * scale;
      this.target.y -= (_right.y * dx - _up.y * dy) * scale;
      this.target.z -= (_right.z * dx - _up.z * dy) * scale;
      this.camera.position.copy(this.#startOffset).add(this.target);
    }
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld(false, true);
    this.#changed = true;
    this.dispatchEvent({ type: "change" });
  }

  #onPointerUp(raw: Event): void {
    const event = raw as ControlEvent;
    if ((event.pointerId ?? 0) !== this.#pointerId) return;
    this.domElement.releasePointerCapture?.(this.#pointerId);
    this.#pointerId = -1;
    if (this.#state !== "none") this.dispatchEvent({ type: "end" });
    this.#state = "none";
  }

  #onWheel(raw: Event): void {
    if (!(this.enabled && this.enableZoom)) return;
    const event = raw as ControlEvent;
    prevent(event);
    const distance = this.camera.position.distanceTo(this.target);
    const scale = Math.max(
      0.01,
      event.deltaY && event.deltaY > 0
        ? 1 + 0.1 * this.zoomSpeed
        : 1 - 0.1 * this.zoomSpeed,
    );
    const next = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, distance * scale),
    );
    this.camera.position
      .copy(this.camera.position)
      .sub(this.target)
      .normalize()
      .multiplyScalar(next)
      .add(this.target);
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld(false, true);
    this.#changed = true;
    this.dispatchEvent({ type: "change" });
  }

  #clampDistance(): void {
    const distance = this.camera.position.distanceTo(this.target);
    const next = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, distance),
    );
    if (distance !== next)
      this.camera.position
        .sub(this.target)
        .normalize()
        .multiplyScalar(next)
        .add(this.target);
  }
}

export type { ArcballCamera, MouseAction };
