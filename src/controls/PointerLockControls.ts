import { EventDispatcher } from "../core/EventDispatcher.ts";
import { Euler } from "../math/Euler.ts";
import type { Quaternion } from "../math/Quaternion.ts";
import { Vector3 } from "../math/Vector3.ts";
import type { ControlDomElement, ControlEvent } from "./ControlDom.ts";

type PointerLockCamera = {
  position: Vector3;
  up: Vector3;
  quaternion: Quaternion;
  rotation: Euler;
  updateMatrixWorld: (...args: boolean[]) => void;
};

const _right = new Vector3();
const _forward = new Vector3();
const _euler = new Euler(0, 0, 0, "YXZ");
const _PI_2: number = Math.PI / 2;
const _mouseSensitivity: number = 0.002;

/**
 * Pointer-lock first-person camera controls for Canvas2D scenes.
 *
 * The browser Pointer Lock API is used when available. In non-browser hosts,
 * `lock()` still changes the control state so deterministic tests and embedded
 * canvases can exercise the same camera behavior without a document.
 */
export class PointerLockControls extends EventDispatcher {
  /** Camera transformed by pointer look and movement methods. */
  camera: PointerLockCamera;
  /** Element that requests and owns pointer lock. */
  domElement: ControlDomElement;
  /** Whether pointer input is currently captured. */
  isLocked: boolean = false;
  /** Lower polar-angle bound for camera pitch, in radians. */
  minPolarAngle: number = 0;
  /** Upper polar-angle bound for camera pitch, in radians. */
  maxPolarAngle: number = Math.PI;
  /** Multiplier applied to relative pointer motion. */
  pointerSpeed: number = 1;

  readonly #eventTarget: EventTarget;
  readonly #listeners: Array<[string, EventListener]> = [];

  /** Creates controls and installs pointer-lock listeners. */
  constructor(camera: PointerLockCamera, domElement: ControlDomElement) {
    super();
    this.camera = camera;
    this.domElement = domElement;
    this.camera.rotation.reorder("YXZ");
    this.#eventTarget =
      domElement.ownerDocument ?? (globalThis as unknown as EventTarget);
    this.#listen("mousemove", this.#onMouseMove.bind(this));
    this.#listen("pointerlockchange", this.#onPointerLockChange.bind(this));
    this.#listen("pointerlockerror", this.#onPointerLockError.bind(this));
  }

  /** Returns the normalized forward direction represented by the camera. */
  getDirection(target: Vector3): Vector3 {
    return target.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
  }

  /** Moves the camera forward parallel to the horizontal plane. */
  moveForward(distance: number): void {
    if (!this.enabled) return;
    _right.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    _forward.crossVectors(this.camera.up, _right).normalize();
    this.camera.position.addScaledVector(_forward, distance);
    this.camera.updateMatrixWorld(false, true);
    this.dispatchEvent({ type: "change" });
  }

  /** Moves the camera sideways parallel to the horizontal plane. */
  moveRight(distance: number): void {
    if (!this.enabled) return;
    _right.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    this.camera.position.addScaledVector(_right, distance);
    this.camera.updateMatrixWorld(false, true);
    this.dispatchEvent({ type: "change" });
  }

  /** Requests pointer lock and optionally asks for unadjusted mouse movement. */
  lock(unadjustedMovement = false): void {
    const request = this.domElement.requestPointerLock;
    if (request) {
      request.call(this.domElement, { unadjustedMovement });
      if (!(this.domElement.ownerDocument || "document" in globalThis))
        this.#setLocked(true);
    } else {
      this.#setLocked(true);
    }
  }

  /** Exits pointer lock through the owning document when available. */
  unlock(): void {
    const ownerDocument = this.domElement.ownerDocument;
    if (ownerDocument?.exitPointerLock) ownerDocument.exitPointerLock();
    else {
      const documentLike = (
        globalThis as unknown as { document?: { exitPointerLock?: () => void } }
      ).document;
      if (documentLike?.exitPointerLock) documentLike.exitPointerLock();
      else this.#setLocked(false);
    }
  }

  /** Removes pointer-lock listeners. */
  dispose(): void {
    for (const [type, listener] of this.#listeners)
      this.#eventTarget.removeEventListener(type, listener);
    this.#listeners.length = 0;
    this.#setLocked(false);
  }

  /** Whether this control accepts input. */
  enabled: boolean = true;

  #listen(type: string, listener: EventListener): void {
    this.#eventTarget.addEventListener(type, listener);
    this.#listeners.push([type, listener]);
  }

  #onMouseMove(raw: Event): void {
    if (!(this.enabled && this.isLocked)) return;
    const event = raw as ControlEvent;
    _euler.setFromQuaternion(this.camera.quaternion, "YXZ");
    _euler.y -= (event.movementX ?? 0) * _mouseSensitivity * this.pointerSpeed;
    _euler.x -= (event.movementY ?? 0) * _mouseSensitivity * this.pointerSpeed;
    _euler.x = Math.max(
      _PI_2 - this.maxPolarAngle,
      Math.min(_PI_2 - this.minPolarAngle, _euler.x),
    );
    this.camera.rotation.set(_euler.x, _euler.y, _euler.z, "YXZ");
    this.camera.updateMatrixWorld(false, true);
    this.dispatchEvent({ type: "change" });
  }

  #onPointerLockChange(): void {
    const ownerDocument = this.domElement.ownerDocument;
    if (ownerDocument && "pointerLockElement" in ownerDocument) {
      this.#setLocked(ownerDocument.pointerLockElement === this.domElement);
    } else {
      this.#setLocked(!this.isLocked);
    }
  }

  #onPointerLockError(): void {
    this.dispatchEvent({ type: "error" });
  }

  #setLocked(value: boolean): void {
    if (this.isLocked === value) return;
    this.isLocked = value;
    this.dispatchEvent({ type: value ? "lock" : "unlock" });
  }
}
