import type { Camera } from "../cameras/Camera.ts";
import { Euler } from "../math/Euler.ts";
import { Vector3 } from "../math/Vector3.ts";
import { error } from "../utils/ConsoleUtils.ts";
import type { ControlEvent } from "./ControlDom.ts";
import { Controls } from "./Controls.ts";

/** Element that can request browser pointer lock for {@link PointerLockControls}. */
interface PointerLockDomElement extends EventTarget {
  /** Document that receives `mousemove` and pointer-lock change events. */
  ownerDocument: EventTarget & {
    pointerLockElement?: unknown;
    exitPointerLock: () => void;
  };
  /** Starts the browser pointer lock on this element. */
  requestPointerLock: (options?: { unadjustedMovement?: boolean }) => unknown;
}

const _euler = new Euler(0, 0, 0, "YXZ");
const _vector = new Vector3();

const _changeEvent = { type: "change" };
const _lockEvent = { type: "lock" };
const _unlockEvent = { type: "unlock" };

const _MOUSE_SENSITIVITY = 0.002;
const _PI_2: number = Math.PI / 2;

/**
 * First-person camera controls built on the browser Pointer Lock API.
 *
 * Relative mouse motion turns the camera while the pointer is locked, and
 * `moveForward()` and `moveRight()` translate it parallel to the ground plane.
 * Listeners are installed on the element's `ownerDocument`.
 *
 * Dispatches `change` after each look update, `lock` when the pointer locks
 * to `domElement`, and `unlock` when it is released.
 */
export class PointerLockControls extends Controls {
  /** Camera turned by pointer motion and moved by the movement methods. */
  declare object: Camera;

  /** Element that requests pointer lock and whose document receives listeners. */
  declare domElement: PointerLockDomElement | undefined;

  /** Whether the pointer is currently locked to `domElement`. */
  isLocked: boolean = false;

  /** Lower bound of the vertical look angle, in radians from straight up. */
  minPolarAngle: number = 0;

  /** Upper bound of the vertical look angle, in radians from straight up. */
  maxPolarAngle: number = Math.PI;

  /** Multiplier applied to relative pointer motion. */
  pointerSpeed: number = 1.0;

  readonly #onMouseMove = (event: Event): void => this.#handleMouseMove(event);
  readonly #onPointerlockChange = (): void => this.#handlePointerlockChange();
  readonly #onPointerlockError = (): void => {
    error("PointerLockControls: Unable to use Pointer Lock API");
  };

  /**
   * Creates pointer-lock controls for `camera`.
   *
   * @param camera The camera to control.
   * @param domElement Element used for pointer lock; listeners connect when given.
   */
  constructor(camera: Camera, domElement?: PointerLockDomElement) {
    super(camera, domElement);
    if (domElement !== undefined) this.connect(domElement);
  }

  /** Adds `mousemove` and pointer-lock listeners to the element's document. */
  override connect(element: PointerLockDomElement): void {
    super.connect(element);
    const ownerDocument = element.ownerDocument;
    ownerDocument.addEventListener("mousemove", this.#onMouseMove);
    ownerDocument.addEventListener(
      "pointerlockchange",
      this.#onPointerlockChange,
    );
    ownerDocument.addEventListener(
      "pointerlockerror",
      this.#onPointerlockError,
    );
  }

  /** Removes the document listeners added by `connect()`. */
  override disconnect(): void {
    const ownerDocument = this.domElement?.ownerDocument;
    if (ownerDocument === undefined) return;
    ownerDocument.removeEventListener("mousemove", this.#onMouseMove);
    ownerDocument.removeEventListener(
      "pointerlockchange",
      this.#onPointerlockChange,
    );
    ownerDocument.removeEventListener(
      "pointerlockerror",
      this.#onPointerlockError,
    );
  }

  /** Removes all listeners. */
  override dispose(): void {
    this.disconnect();
  }

  /**
   * Writes the camera's look direction into `target`.
   *
   * @param target Vector receiving the normalized direction.
   * @returns `target`.
   */
  getDirection(target: Vector3): Vector3 {
    return target.set(0, 0, -1).applyQuaternion(this.object.quaternion);
  }

  /**
   * Moves the camera forward parallel to the plane perpendicular to
   * `camera.up`. Reads the local `camera.matrix`, as three.js does.
   *
   * @param distance Distance to move in world units.
   */
  moveForward(distance: number): void {
    if (this.enabled === false) return;
    const camera = this.object;
    _vector.setFromMatrixColumn(camera.matrix, 0);
    _vector.crossVectors(camera.up, _vector);
    camera.position.addScaledVector(_vector, distance);
  }

  /**
   * Moves the camera sideways along its local x axis.
   *
   * @param distance Distance to move in world units.
   */
  moveRight(distance: number): void {
    if (this.enabled === false) return;
    const camera = this.object;
    _vector.setFromMatrixColumn(camera.matrix, 0);
    camera.position.addScaledVector(_vector, distance);
  }

  /**
   * Requests pointer lock on `domElement`.
   *
   * @param unadjustedMovement Whether to ask the browser for raw mouse input.
   */
  lock(unadjustedMovement: boolean = false): void {
    this.domElement?.requestPointerLock({ unadjustedMovement });
  }

  /** Exits pointer lock through the element's document. */
  unlock(): void {
    this.domElement?.ownerDocument.exitPointerLock();
  }

  #handleMouseMove(raw: Event): void {
    if (this.enabled === false || this.isLocked === false) return;
    const event = raw as ControlEvent;
    const camera = this.object;
    _euler.setFromQuaternion(camera.quaternion);
    _euler.y -= (event.movementX ?? 0) * _MOUSE_SENSITIVITY * this.pointerSpeed;
    _euler.x -= (event.movementY ?? 0) * _MOUSE_SENSITIVITY * this.pointerSpeed;
    _euler.x = Math.max(
      _PI_2 - this.maxPolarAngle,
      Math.min(_PI_2 - this.minPolarAngle, _euler.x),
    );
    camera.quaternion.setFromEuler(_euler);
    this.dispatchEvent(_changeEvent);
  }

  #handlePointerlockChange(): void {
    const domElement = this.domElement;
    if (domElement === undefined) return;
    if (domElement.ownerDocument.pointerLockElement === domElement) {
      this.dispatchEvent(_lockEvent);
      this.isLocked = true;
    } else {
      this.dispatchEvent(_unlockEvent);
      this.isLocked = false;
    }
  }
}
