import type { Node } from "../core/Node.ts";
import { clamp, DEG2RAD, RAD2DEG } from "../math/MathUtils.ts";
import { Spherical } from "../math/Spherical.ts";
import { Vector3 } from "../math/Vector3.ts";
import {
  type ControlDomElement,
  type ControlEvent,
  controlWindow,
} from "./ControlDom.ts";
import { Controls } from "./Controls.ts";

const _lookDirection = new Vector3();
const _spherical = new Spherical();
const _target = new Vector3();
const _targetPosition = new Vector3();
const _targetVelocity = new Vector3();

/**
 * First-person navigation that drives an object from keys and pointer drags.
 * An alternative to {@link FlyControls}, matching three.js r186.
 *
 * Keys move along world axes from the camera's yaw: W/S or the up/down arrows
 * move forward and back, A/D or the left/right arrows strafe, and R/F move up
 * and down along world Y. Holding the primary pointer button moves forward
 * along the look direction and the secondary button moves back; one touch
 * moves forward and two or more touches move back. Dragging turns the view
 * by the drag offset from the press point. Movement and look velocity ease
 * toward the input by `dampingFactor` on each `update(delta)` call.
 *
 * Unlike most controls, it dispatches no `change` event, as in three.js.
 */
export class FirstPersonControls extends Controls {
  /** Movement speed in world units per second. */
  movementSpeed: number = 1.0;

  /** Look speed, in degrees per second per pixel of drag offset. */
  lookSpeed: number = 0.005;

  /**
   * How quickly movement and look velocity catch up to the input on each
   * update. Lower values feel heavier; `1` disables damping.
   */
  dampingFactor: number = 0.1;

  /** Whether vertical drags tilt the view up and down. */
  lookVertical: boolean = true;

  /** Whether the object moves forward while no other movement is held. */
  autoForward: boolean = false;

  /**
   * Whether the object's height raises the forward speed; configured by
   * `heightCoef`, `heightMin`, and `heightMax`.
   */
  heightSpeed: boolean = false;

  /** Extra forward speed per world unit of height above `heightMin`. */
  heightCoef: number = 1.0;

  /** Lower height limit used for the forward speed adjustment. */
  heightMin: number = 0.0;

  /** Upper height limit used for the forward speed adjustment. */
  heightMax: number = 1.0;

  /** Whether vertical look is limited to `verticalMin`..`verticalMax`. */
  constrainVertical: boolean = false;

  /** Lower vertical look limit, in radians from straight up (`0` to `Math.PI`). */
  verticalMin: number = 0;

  /** Upper vertical look limit, in radians from straight up (`0` to `Math.PI`). */
  verticalMax: number = Math.PI;

  readonly #velocity = new Vector3();
  #mouseDragOn = false;
  #pointerX = 0;
  #pointerY = 0;
  #pointerDownX = 0;
  #pointerDownY = 0;
  #pointerCount = 0;
  // Keys and the pointer track forward/back separately, so a click while a
  // forward or back key is held only looks.
  #keyForward = false;
  #keyBackward = false;
  #pointerForward = false;
  #pointerBackward = false;
  #moveLeft = false;
  #moveRight = false;
  #moveUp = false;
  #moveDown = false;
  #lat = 0;
  #lon = 0;
  #lonVelocity = 0;
  #latVelocity = 0;
  #window: EventTarget | undefined;
  #document: EventTarget | undefined;

  readonly #onPointerDown = (event: Event): void =>
    this.#handlePointerDown(event as ControlEvent);
  readonly #onPointerMove = (event: Event): void =>
    this.#handlePointerMove(event as ControlEvent);
  readonly #onPointerUp = (event: Event): void =>
    this.#handlePointerUp(event as ControlEvent);
  readonly #onContextMenu = (event: Event): void => {
    if (this.enabled === false) return;
    event.preventDefault();
  };
  readonly #onKeyDown = (event: Event): void =>
    this.#handleKey((event as ControlEvent).code, true);
  readonly #onKeyUp = (event: Event): void =>
    this.#handleKey((event as ControlEvent).code, false);

  /**
   * Creates controls for `object` and connects them when `domElement` is given.
   *
   * @param object The object moved and turned by the controls.
   * @param domElement Element used for pointer listeners.
   */
  constructor(object: Node, domElement?: ControlDomElement) {
    super(object, domElement);
    if (domElement !== undefined) this.connect(domElement);
    this.#setOrientation();
  }

  /** Whether a pointer is currently pressed on the element. */
  get mouseDragOn(): boolean {
    return this.#mouseDragOn;
  }

  /**
   * Adds key listeners to the window, `pointerdown` and `contextmenu` to the
   * element, pointer move/up/cancel to its owner document, and disables
   * browser touch scrolling on the element.
   */
  override connect(element: ControlDomElement): void {
    super.connect(element);
    this.#window = controlWindow();
    this.#window?.addEventListener("keydown", this.#onKeyDown);
    this.#window?.addEventListener("keyup", this.#onKeyUp);
    element.addEventListener("pointerdown", this.#onPointerDown);
    element.addEventListener("contextmenu", this.#onContextMenu);
    this.#document = element.ownerDocument ?? element;
    this.#document.addEventListener("pointermove", this.#onPointerMove);
    this.#document.addEventListener("pointerup", this.#onPointerUp);
    this.#document.addEventListener("pointercancel", this.#onPointerUp);
    if (element.style) element.style.touchAction = "none";
  }

  /** Removes the listeners added by `connect()` and restores touch scrolling. */
  override disconnect(): void {
    const element = this.domElement;
    if (element === undefined) return;
    this.#window?.removeEventListener("keydown", this.#onKeyDown);
    this.#window?.removeEventListener("keyup", this.#onKeyUp);
    element.removeEventListener("pointerdown", this.#onPointerDown);
    element.removeEventListener("contextmenu", this.#onContextMenu);
    this.#document?.removeEventListener("pointermove", this.#onPointerMove);
    this.#document?.removeEventListener("pointerup", this.#onPointerUp);
    this.#document?.removeEventListener("pointercancel", this.#onPointerUp);
    if (element.style) element.style.touchAction = "";
  }

  /** Removes all listeners. */
  override dispose(): void {
    this.disconnect();
  }

  /**
   * Turns the object toward a world-space position and resets the look angles
   * from its new orientation.
   *
   * @param x Target x coordinate, or the target position.
   * @param y Target y coordinate when `x` is a number.
   * @param z Target z coordinate when `x` is a number.
   * @returns These controls.
   */
  lookAt(x: Vector3 | number, y?: number, z?: number): this {
    if (typeof x === "number") _target.set(x, y ?? 0, z ?? 0);
    else _target.copy(x);
    this.object.lookAt(_target);
    this.#setOrientation();
    return this;
  }

  /**
   * Advances movement and look by `delta` seconds.
   *
   * @param delta Elapsed time in seconds.
   */
  override update(delta: number): void {
    if (this.enabled === false) return;
    const object = this.object;

    let drive = (this.#keyForward ? 1 : 0) - (this.#keyBackward ? 1 : 0);
    let lookMove =
      (this.#pointerForward ? 1 : 0) - (this.#pointerBackward ? 1 : 0);
    if (this.autoForward && drive === 0 && lookMove === 0) lookMove = 1;

    // Faster forward movement the higher the object is.
    let forwardSpeed = this.movementSpeed;
    if (this.heightSpeed) {
      const height = clamp(object.position.y, this.heightMin, this.heightMax);
      forwardSpeed += (height - this.heightMin) * this.heightCoef;
    }

    // Keys move along world axes in the XZ plane from the yaw only (R/F along
    // world Y); pointer and touch input move along the look direction.
    const yaw = this.#lon * DEG2RAD;
    const sinYaw = Math.sin(yaw);
    const cosYaw = Math.cos(yaw);
    let strafe = (this.#moveRight ? 1 : 0) - (this.#moveLeft ? 1 : 0);
    let climb = (this.#moveUp ? 1 : 0) - (this.#moveDown ? 1 : 0);

    // Normalize combined key input so diagonal movement is not faster.
    const keyScale =
      1 /
      Math.max(1, Math.sqrt(strafe * strafe + climb * climb + drive * drive));
    strafe *= this.movementSpeed * keyScale;
    climb *= this.movementSpeed * keyScale;
    drive *= (drive > 0 ? forwardSpeed : this.movementSpeed) * keyScale;

    _targetVelocity.set(
      sinYaw * drive - cosYaw * strafe,
      climb,
      cosYaw * drive + sinYaw * strafe,
    );
    if (lookMove !== 0) {
      _lookDirection.set(0, 0, -1).applyQuaternion(object.quaternion);
      _targetVelocity.addScaledVector(
        _lookDirection,
        lookMove * (lookMove > 0 ? forwardSpeed : this.movementSpeed),
      );
    }

    this.#velocity.lerp(_targetVelocity, this.dampingFactor);
    object.position.addScaledVector(this.#velocity, delta);

    const verticalLookRatio = this.constrainVertical
      ? Math.PI / (this.verticalMax - this.verticalMin)
      : 1;

    // The look velocity eases toward zero when no pointer is pressed.
    const targetLon = this.#mouseDragOn ? -this.#pointerX * this.lookSpeed : 0;
    const targetLat =
      this.#mouseDragOn && this.lookVertical
        ? -this.#pointerY * this.lookSpeed * verticalLookRatio
        : 0;
    const damping = this.dampingFactor;
    this.#lonVelocity = (1 - damping) * this.#lonVelocity + damping * targetLon;
    this.#latVelocity = (1 - damping) * this.#latVelocity + damping * targetLat;
    this.#lon += this.#lonVelocity * delta;
    this.#lat += this.#latVelocity * delta;
    this.#lat = Math.max(-85, Math.min(85, this.#lat));

    let phi = (90 - this.#lat) * DEG2RAD;
    const theta = this.#lon * DEG2RAD;
    if (this.constrainVertical) {
      phi =
        this.verticalMin +
        (phi * (this.verticalMax - this.verticalMin)) / Math.PI;
    }

    _targetPosition.setFromSphericalCoords(1, phi, theta).add(object.position);
    object.lookAt(_targetPosition);
  }

  #setOrientation(): void {
    _lookDirection.set(0, 0, -1).applyQuaternion(this.object.quaternion);
    _spherical.setFromVector3(_lookDirection);
    this.#lat = 90 - _spherical.phi * RAD2DEG;
    this.#lon = _spherical.theta * RAD2DEG;
  }

  #handlePointerDown(event: ControlEvent): void {
    const element = this.domElement;
    if (element === undefined) return;
    element.focus?.();
    if (event.pointerId !== undefined)
      element.setPointerCapture?.(event.pointerId);
    this.#pointerCount++;
    if (event.pointerType === "touch") {
      this.#pointerForward = this.#pointerCount === 1;
      this.#pointerBackward = this.#pointerCount >= 2;
    } else if (!(this.#keyForward || this.#keyBackward)) {
      if (event.button === 0) this.#pointerForward = true;
      else if (event.button === 2) this.#pointerBackward = true;
    }
    this.#pointerDownX = event.pageX ?? 0;
    this.#pointerDownY = event.pageY ?? 0;
    this.#pointerX = 0;
    this.#pointerY = 0;
    this.#mouseDragOn = true;
  }

  #handlePointerUp(event: ControlEvent): void {
    if (this.#mouseDragOn === false) return;
    if (event.pointerId !== undefined)
      this.domElement?.releasePointerCapture?.(event.pointerId);
    this.#pointerCount--;
    if (event.pointerType === "touch") {
      this.#pointerForward = this.#pointerCount === 1;
      this.#pointerBackward = false;
    } else if (event.button === 0) this.#pointerForward = false;
    else if (event.button === 2) this.#pointerBackward = false;
    this.#pointerX = 0;
    this.#pointerY = 0;
    if (this.#pointerCount === 0) this.#mouseDragOn = false;
  }

  #handlePointerMove(event: ControlEvent): void {
    if (this.#mouseDragOn === false) return;
    this.#pointerX = (event.pageX ?? 0) - this.#pointerDownX;
    this.#pointerY = (event.pageY ?? 0) - this.#pointerDownY;
  }

  #handleKey(code: string | undefined, pressed: boolean): void {
    switch (code) {
      case "ArrowUp":
      case "KeyW":
        this.#keyForward = pressed;
        break;
      case "ArrowLeft":
      case "KeyA":
        this.#moveLeft = pressed;
        break;
      case "ArrowDown":
      case "KeyS":
        this.#keyBackward = pressed;
        break;
      case "ArrowRight":
      case "KeyD":
        this.#moveRight = pressed;
        break;
      case "KeyR":
        this.#moveUp = pressed;
        break;
      case "KeyF":
        this.#moveDown = pressed;
        break;
    }
  }
}
