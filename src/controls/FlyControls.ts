import type { Node } from "../core/Node.ts";
import { Quaternion } from "../math/Quaternion.ts";
import { Vector3 } from "../math/Vector3.ts";
import {
  type ControlDomElement,
  type ControlEvent,
  controlWindow,
} from "./ControlDom.ts";
import { Controls } from "./Controls.ts";

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

const _changeEvent = { type: "change" };
const _EPS = 0.000001;
const _tmpQuaternion = new Quaternion();

/**
 * Fly navigation similar to the fly modes of DCC tools such as Blender,
 * matching three.js r186. The object moves and rotates freely in its own
 * local frame, with no target or limits.
 *
 * Keys: W/S move forward and back, A/D strafe, R/F move up and down, the
 * up/down arrows pitch, the left/right arrows yaw, and Q/E roll. Key presses
 * with Alt held are ignored. The pointer position relative to the element
 * center yaws and pitches the object; with `dragToLook` this applies only
 * while a pointer is pressed, otherwise the primary button moves forward
 * and the secondary button moves back.
 *
 * Dispatches `change` from `update(delta)` when the object moved or turned.
 */
export class FlyControls extends Controls {
  /** Movement speed in world units per second. */
  movementSpeed: number = 1.0;

  /** Rotation speed in radians per second at full input. */
  rollSpeed: number = 0.005;

  /** When true, the pointer turns the object only while it is pressed. */
  dragToLook: boolean = false;

  /**
   * When true, the object keeps moving forward while the back input is not
   * held.
   */
  autoForward: boolean = false;

  /**
   * Set to `0.1` while Shift is held and back to `1` on release. As in
   * three.js r186, `update()` does not read it.
   */
  movementSpeedMultiplier: number = 1;

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
  readonly #moveVector = new Vector3();
  readonly #rotationVector = new Vector3();
  readonly #lastQuaternion = new Quaternion();
  readonly #lastPosition = new Vector3();
  #status = 0;
  #window: EventTarget | undefined;

  readonly #onKeyDown = (event: Event): void =>
    this.#handleKeyDown(event as ControlEvent);
  readonly #onKeyUp = (event: Event): void =>
    this.#handleKeyUp(event as ControlEvent);
  readonly #onPointerMove = (event: Event): void =>
    this.#handlePointerMove(event as ControlEvent);
  readonly #onPointerDown = (event: Event): void =>
    this.#handlePointerDown(event as ControlEvent);
  readonly #onPointerUp = (event: Event): void =>
    this.#handlePointerUp(event as ControlEvent);
  readonly #onPointerCancel = (): void => this.#handlePointerCancel();
  readonly #onContextMenu = (event: Event): void => {
    if (this.enabled === false) return;
    event.preventDefault();
  };

  /**
   * Creates controls for `object` and connects them when `domElement` is given.
   *
   * @param object The object moved and turned by the controls.
   * @param domElement Element used for pointer listeners.
   */
  constructor(object: Node, domElement?: ControlDomElement) {
    super(object, domElement);
    if (domElement !== undefined) this.connect(domElement);
  }

  /**
   * Adds key listeners to the window and pointer and context-menu listeners
   * to the element, and disables browser touch scrolling on the element.
   */
  override connect(element: ControlDomElement): void {
    super.connect(element);
    this.#window = controlWindow();
    this.#window?.addEventListener("keydown", this.#onKeyDown);
    this.#window?.addEventListener("keyup", this.#onKeyUp);
    element.addEventListener("pointermove", this.#onPointerMove);
    element.addEventListener("pointerdown", this.#onPointerDown);
    element.addEventListener("pointerup", this.#onPointerUp);
    element.addEventListener("pointercancel", this.#onPointerCancel);
    element.addEventListener("contextmenu", this.#onContextMenu);
    if (element.style) element.style.touchAction = "none";
  }

  /** Removes the listeners added by `connect()` and restores touch scrolling. */
  override disconnect(): void {
    const element = this.domElement;
    if (element === undefined) return;
    this.#window?.removeEventListener("keydown", this.#onKeyDown);
    this.#window?.removeEventListener("keyup", this.#onKeyUp);
    element.removeEventListener("pointermove", this.#onPointerMove);
    element.removeEventListener("pointerdown", this.#onPointerDown);
    element.removeEventListener("pointerup", this.#onPointerUp);
    element.removeEventListener("pointercancel", this.#onPointerCancel);
    element.removeEventListener("contextmenu", this.#onContextMenu);
    if (element.style) element.style.touchAction = "";
  }

  /** Removes all listeners. */
  override dispose(): void {
    this.disconnect();
  }

  /**
   * Moves and rotates the object for `delta` seconds of held input, then
   * dispatches `change` when its position or orientation changed since the
   * last dispatch.
   *
   * @param delta Elapsed time in seconds.
   */
  override update(delta: number): void {
    if (this.enabled === false) return;
    const object = this.object;
    const moveMult = delta * this.movementSpeed;
    const rotMult = delta * this.rollSpeed;

    object.translateX(this.#moveVector.x * moveMult);
    object.translateY(this.#moveVector.y * moveMult);
    object.translateZ(this.#moveVector.z * moveMult);

    _tmpQuaternion
      .set(
        this.#rotationVector.x * rotMult,
        this.#rotationVector.y * rotMult,
        this.#rotationVector.z * rotMult,
        1,
      )
      .normalize();
    object.quaternion.multiply(_tmpQuaternion);

    if (
      this.#lastPosition.distanceToSquared(object.position) > _EPS ||
      8 * (1 - this.#lastQuaternion.dot(object.quaternion)) > _EPS
    ) {
      this.dispatchEvent(_changeEvent);
      this.#lastQuaternion.copy(object.quaternion);
      this.#lastPosition.copy(object.position);
    }
  }

  #updateMovementVector(): void {
    const state = this.#moveState;
    const forward = state.forward || (this.autoForward && !state.back) ? 1 : 0;
    this.#moveVector.x = -state.left + state.right;
    this.#moveVector.y = -state.down + state.up;
    this.#moveVector.z = -forward + state.back;
  }

  #updateRotationVector(): void {
    const state = this.#moveState;
    this.#rotationVector.x = -state.pitchDown + state.pitchUp;
    this.#rotationVector.y = -state.yawRight + state.yawLeft;
    this.#rotationVector.z = -state.rollRight + state.rollLeft;
  }

  #handleKeyDown(event: ControlEvent): void {
    if (event.altKey || this.enabled === false) return;
    if (event.code === "ShiftLeft" || event.code === "ShiftRight")
      this.movementSpeedMultiplier = 0.1;
    else this.#setKey(event.code, 1);
    this.#updateMovementVector();
    this.#updateRotationVector();
  }

  #handleKeyUp(event: ControlEvent): void {
    if (this.enabled === false) return;
    if (event.code === "ShiftLeft" || event.code === "ShiftRight")
      this.movementSpeedMultiplier = 1;
    else this.#setKey(event.code, 0);
    this.#updateMovementVector();
    this.#updateRotationVector();
  }

  #setKey(code: string | undefined, value: number): void {
    const state = this.#moveState;
    switch (code) {
      case "KeyW":
        state.forward = value;
        break;
      case "KeyS":
        state.back = value;
        break;
      case "KeyA":
        state.left = value;
        break;
      case "KeyD":
        state.right = value;
        break;
      case "KeyR":
        state.up = value;
        break;
      case "KeyF":
        state.down = value;
        break;
      case "ArrowUp":
        state.pitchUp = value;
        break;
      case "ArrowDown":
        state.pitchDown = value;
        break;
      case "ArrowLeft":
        state.yawLeft = value;
        break;
      case "ArrowRight":
        state.yawRight = value;
        break;
      case "KeyQ":
        state.rollLeft = value;
        break;
      case "KeyE":
        state.rollRight = value;
        break;
    }
  }

  #handlePointerDown(event: ControlEvent): void {
    if (this.enabled === false) return;
    if (this.dragToLook) {
      this.#status++;
    } else {
      if (event.button === 0) this.#moveState.forward = 1;
      else if (event.button === 2) this.#moveState.back = 1;
      this.#updateMovementVector();
    }
  }

  #handlePointerMove(event: ControlEvent): void {
    if (this.enabled === false) return;
    if (this.dragToLook && this.#status <= 0) return;
    // The element's layout box, or the window when the controls listen on
    // the document itself. Targets without layout offsets, such as canvases
    // outside a document, fall back to their client bounds.
    const element = this.domElement;
    const view = this.#window as
      | { innerWidth?: number; innerHeight?: number }
      | undefined;
    let width = view?.innerWidth ?? 0;
    let height = view?.innerHeight ?? 0;
    let left = 0;
    let top = 0;
    const document = (globalThis as { document?: unknown }).document;
    if (element !== undefined && element !== document) {
      if (element.offsetWidth !== undefined) {
        width = element.offsetWidth;
        height = element.offsetHeight ?? 0;
        left = element.offsetLeft ?? 0;
        top = element.offsetTop ?? 0;
      } else {
        const bounds = element.getBoundingClientRect?.();
        width = bounds?.width ?? element.clientWidth ?? 0;
        height = bounds?.height ?? element.clientHeight ?? 0;
        left = bounds?.left ?? 0;
        top = bounds?.top ?? 0;
      }
    }
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const pageX = event.pageX ?? event.clientX ?? 0;
    const pageY = event.pageY ?? event.clientY ?? 0;
    this.#moveState.yawLeft = -(pageX - left - halfWidth) / halfWidth;
    this.#moveState.pitchDown = (pageY - top - halfHeight) / halfHeight;
    this.#updateRotationVector();
  }

  #handlePointerUp(event: ControlEvent): void {
    if (this.enabled === false) return;
    if (this.dragToLook) {
      this.#status--;
      this.#moveState.yawLeft = 0;
      this.#moveState.pitchDown = 0;
    } else {
      if (event.button === 0) this.#moveState.forward = 0;
      else if (event.button === 2) this.#moveState.back = 0;
      this.#updateMovementVector();
    }
    this.#updateRotationVector();
  }

  #handlePointerCancel(): void {
    if (this.enabled === false) return;
    if (this.dragToLook) {
      this.#status = 0;
      this.#moveState.yawLeft = 0;
      this.#moveState.pitchDown = 0;
    } else {
      this.#moveState.forward = 0;
      this.#moveState.back = 0;
      this.#updateMovementVector();
    }
    this.#updateRotationVector();
  }
}
