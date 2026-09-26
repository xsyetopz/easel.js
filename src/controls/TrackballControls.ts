import { OrthographicCamera } from "../cameras/OrthographicCamera.ts";
import { PerspectiveCamera } from "../cameras/PerspectiveCamera.ts";
import { MOUSE } from "../core/Constants.ts";
import { clamp } from "../math/MathUtils.ts";
import { Quaternion } from "../math/Quaternion.ts";
import { Vector2 } from "../math/Vector2.ts";
import { Vector3 } from "../math/Vector3.ts";
import { type ControlDomElement, controlWindow } from "./ControlDom.ts";
import { type ControlMouseButtons, Controls } from "./Controls.ts";

/** Camera types that TrackballControls can move. */
export type TrackballCamera = PerspectiveCamera | OrthographicCamera;

/** Client-space bounds of the control element, set by `handleResize()`. */
export interface TrackballScreen {
  /** Page-space left edge in CSS pixels. */
  left: number;
  /** Page-space top edge in CSS pixels. */
  top: number;
  /** Width in CSS pixels. */
  width: number;
  /** Height in CSS pixels. */
  height: number;
}

type TrackballDomElement = ControlDomElement & {
  ownerDocument?: EventTarget & {
    documentElement?: { clientLeft?: number; clientTop?: number };
  };
};

type PageOffsets = { pageXOffset?: number; pageYOffset?: number };

const _changeEvent = { type: "change" };
const _startEvent = { type: "start" };
const _endEvent = { type: "end" };

const _EPS = 0.000001;
const _STATE = {
  NONE: -1,
  ROTATE: 0,
  ZOOM: 1,
  PAN: 2,
  TOUCH_ROTATE: 3,
  TOUCH_ZOOM_PAN: 4,
} as const;

const _v2 = new Vector2();
const _mouseChange = new Vector2();
const _objectUp = new Vector3();
const _pan = new Vector3();
const _axis = new Vector3();
const _quaternion = new Quaternion();
const _eyeDirection = new Vector3();
const _objectUpDirection = new Vector3();
const _objectSidewaysDirection = new Vector3();
const _moveDirection = new Vector3();

/**
 * Trackball camera controls matching three.js r186 `TrackballControls`.
 *
 * Unlike {@link OrbitControls}, the camera `up` vector is not kept constant:
 * dragging over the poles rolls the view instead of flipping it. The left,
 * middle, and right mouse buttons rotate, zoom, and pan by default; holding
 * one of {@link TrackballControls.keys} switches every button to that action.
 * One finger rotates and two fingers zoom and pan. Call `update()` once per
 * frame, and `handleResize()` whenever the element moves or changes size.
 */
export class TrackballControls extends Controls<TrackballCamera> {
  /** Element receiving pointer and wheel listeners. */
  declare domElement: TrackballDomElement | undefined;

  /** Element bounds in page space; set by `handleResize()`. */
  readonly screen: TrackballScreen = { left: 0, top: 0, width: 0, height: 0 };
  /** Rotation speed. */
  rotateSpeed = 1.0;
  /** Zoom speed. */
  zoomSpeed = 1.2;
  /** Pan speed. */
  panSpeed = 0.3;
  /** Roll speed used by the multi-touch twist gesture. */
  rollSpeed = 1.0;
  /** Disables rotation. */
  noRotate = false;
  /** Disables zooming. */
  noZoom = false;
  /** Disables panning. */
  noPan = false;
  /** Whether a two-finger twist rolls the camera around its view axis. */
  multiTouchRoll = false;
  /** Applies input immediately instead of damping it over later updates. */
  staticMoving = false;
  /** Damping intensity; used only while `staticMoving` is false. */
  dynamicDampingFactor = 0.2;
  /** Minimum camera distance from the target (perspective cameras only). */
  minDistance = 0;
  /** Maximum camera distance from the target (perspective cameras only). */
  maxDistance = Number.POSITIVE_INFINITY;
  /** Minimum `zoom` (orthographic cameras only). */
  minZoom = 0;
  /** Maximum `zoom` (orthographic cameras only). */
  maxZoom = Number.POSITIVE_INFINITY;
  /**
   * Key codes that, while held, make every mouse button rotate, zoom, or pan,
   * in that order. Defaults to A, S, and D.
   */
  override keys: string[] = ["KeyA", "KeyS", "KeyD"];
  /** Mouse-button actions; values are {@link MOUSE} action constants. */
  override mouseButtons: ControlMouseButtons = {
    LEFT: MOUSE.ROTATE,
    MIDDLE: MOUSE.DOLLY,
    RIGHT: MOUSE.PAN,
  };
  /** Focus point the camera looks at and rotates around. */
  target: Vector3 = new Vector3();
  /** Current pointer interaction state; -1 when idle. */
  override state: number = _STATE.NONE;
  /** Interaction selected by a held key; -1 when no key is held. */
  keyState: number = _STATE.NONE;

  readonly #lastPosition = new Vector3();
  readonly #lastUp = new Vector3();
  #lastZoom = 1;
  #touchZoomDistanceStart = 0;
  #touchZoomDistanceEnd = 0;
  #touchRollAngle = 0;
  #touchRollPointerIds = "";
  #lastAngle = 0;
  #lastRollAngle = 0;
  readonly #eye = new Vector3();
  readonly #movePrev = new Vector2();
  readonly #moveCurr = new Vector2();
  readonly #lastAxis = new Vector3();
  readonly #zoomStart = new Vector2();
  readonly #zoomEnd = new Vector2();
  readonly #panStart = new Vector2();
  readonly #panEnd = new Vector2();
  readonly #pointers: PointerEvent[] = [];
  readonly #pointerPositions = new Map<number, Vector2>();
  #window: EventTarget | undefined = undefined;

  readonly #target0: Vector3;
  readonly #position0: Vector3;
  readonly #up0: Vector3;
  readonly #zoom0: number;

  readonly #onPointerMove = (event: Event): void =>
    this.#pointerMove(event as PointerEvent);
  readonly #onPointerDown = (event: Event): void =>
    this.#pointerDown(event as PointerEvent);
  readonly #onPointerUp = (event: Event): void =>
    this.#pointerUp(event as PointerEvent);
  readonly #onPointerCancel = (event: Event): void =>
    this.#removePointer(event as PointerEvent);
  readonly #onContextMenu = (event: Event): void => {
    if (this.enabled === false) return;
    event.preventDefault();
  };
  readonly #onMouseWheel = (event: Event): void =>
    this.#mouseWheel(event as WheelEvent);
  readonly #onKeyDown = (event: Event): void =>
    this.#keyDown(event as KeyboardEvent);
  readonly #onKeyUp = (): void => this.#keyUp();

  /**
   * Creates controls for `object`. When `domElement` is given, listeners are
   * connected and `handleResize()` runs; the camera is then updated once.
   */
  constructor(object: TrackballCamera, domElement?: ControlDomElement) {
    super(object, domElement);
    this.#target0 = this.target.clone();
    this.#position0 = this.object.position.clone();
    this.#up0 = this.object.up.clone();
    this.#zoom0 = this.object.zoom;

    if (domElement !== undefined) {
      this.connect(domElement);
      this.handleResize();
    }

    // force an update at start
    this.update();
  }

  /** Attaches keyboard listeners to the window and pointer listeners to `element`. */
  override connect(element: ControlDomElement): void {
    super.connect(element);
    this.#window = controlWindow();
    this.#window?.addEventListener("keydown", this.#onKeyDown);
    this.#window?.addEventListener("keyup", this.#onKeyUp);

    element.addEventListener("pointerdown", this.#onPointerDown);
    element.addEventListener("pointercancel", this.#onPointerCancel);
    element.addEventListener("wheel", this.#onMouseWheel, { passive: false });
    element.addEventListener("contextmenu", this.#onContextMenu);

    if (element.style) element.style.touchAction = "none"; // Disable touch scroll
  }

  /** Removes every listener installed by `connect()`. */
  override disconnect(): void {
    this.#window?.removeEventListener("keydown", this.#onKeyDown);
    this.#window?.removeEventListener("keyup", this.#onKeyUp);

    const element = this.domElement;
    if (element === undefined) return;
    element.removeEventListener("pointerdown", this.#onPointerDown);
    const pointerTarget = this.#pointerTarget(element);
    pointerTarget.removeEventListener("pointermove", this.#onPointerMove);
    pointerTarget.removeEventListener("pointerup", this.#onPointerUp);
    element.removeEventListener("pointercancel", this.#onPointerCancel);
    element.removeEventListener("wheel", this.#onMouseWheel);
    element.removeEventListener("contextmenu", this.#onContextMenu);

    if (element.style) element.style.touchAction = ""; // Restore touch scroll
  }

  /** Removes all listeners. */
  override dispose(): void {
    this.disconnect();
  }

  /** Recomputes `screen` from the element's bounding rectangle; call after resizes. */
  handleResize(): void {
    const element = this.domElement;
    if (element === undefined) return;
    const box = element.getBoundingClientRect?.() ?? {
      left: 0,
      top: 0,
      width: element.clientWidth ?? 0,
      height: element.clientHeight ?? 0,
    };
    // adjustments come from similar code in the jquery offset() function
    const d = element.ownerDocument?.documentElement;
    const view = controlWindow() as (EventTarget & PageOffsets) | undefined;

    this.screen.left =
      box.left + (view?.pageXOffset ?? 0) - (d?.clientLeft ?? 0);
    this.screen.top = box.top + (view?.pageYOffset ?? 0) - (d?.clientTop ?? 0);
    this.screen.width = box.width;
    this.screen.height = box.height;
  }

  /**
   * Applies pending rotation, zoom, and pan in that order, clamps the distance
   * for perspective cameras, aims the camera at `target`, and dispatches
   * `change` when the position, up vector, or zoom moved.
   */
  override update(): void {
    this.#eye.subVectors(this.object.position, this.target);

    if (!this.noRotate) {
      this.#rotateCamera();
      if (this.multiTouchRoll === true) this.#rollCamera();
    }

    if (!this.noZoom) this.#zoomCamera();

    if (!this.noPan) this.#panCamera();

    this.object.position.addVectors(this.target, this.#eye);

    if (this.object instanceof PerspectiveCamera) {
      this.#checkDistances();
      this.#lookAtTarget();

      const positionChanged =
        this.#lastPosition.distanceToSquared(this.object.position) > _EPS;
      const rollChanged = this.#lastUp.distanceToSquared(this.object.up) > _EPS;

      if (positionChanged || rollChanged) {
        this.dispatchEvent(_changeEvent);
        this.#lastPosition.copy(this.object.position);
        this.#lastUp.copy(this.object.up);
      }
    } else {
      this.#lookAtTarget();

      const positionChanged =
        this.#lastPosition.distanceToSquared(this.object.position) > _EPS;
      const rollChanged = this.#lastUp.distanceToSquared(this.object.up) > _EPS;
      const zoomChanged = this.#lastZoom !== this.object.zoom;

      if (positionChanged || rollChanged || zoomChanged) {
        this.dispatchEvent(_changeEvent);
        this.#lastPosition.copy(this.object.position);
        this.#lastUp.copy(this.object.up);
        this.#lastZoom = this.object.zoom;
      }
    }
  }

  /** Restores the target, camera position, up vector, and zoom captured at construction. */
  reset(): void {
    this.state = _STATE.NONE;
    this.keyState = _STATE.NONE;

    this.target.copy(this.#target0);
    this.object.position.copy(this.#position0);
    this.object.up.copy(this.#up0);
    this.object.zoom = this.#zoom0;

    this.object.updateProjectionMatrix();

    this.#eye.subVectors(this.object.position, this.target);

    this.#lookAtTarget();

    this.dispatchEvent(_changeEvent);

    this.#lastPosition.copy(this.object.position);
    this.#lastUp.copy(this.object.up);
    this.#lastZoom = this.object.zoom;
  }

  #lookAtTarget(): void {
    // Node.lookAt refreshes the world matrix before reading the camera
    // position, as three.js Object3D.lookAt does.
    this.object.lookAt(this.target);
  }

  #pointerTarget(element: TrackballDomElement): EventTarget {
    return element.ownerDocument ?? element;
  }

  #panCamera(): void {
    _mouseChange.copy(this.#panEnd).sub(this.#panStart);

    if (_mouseChange.lengthSq) {
      if (this.object instanceof OrthographicCamera) {
        const width = this.domElement?.clientWidth ?? 0;
        const scaleX =
          (this.object.right - this.object.left) / this.object.zoom / width;
        const scaleY =
          (this.object.top - this.object.bottom) / this.object.zoom / width;

        _mouseChange.x *= scaleX;
        _mouseChange.y *= scaleY;
      }

      _mouseChange.multiplyScalar(this.#eye.length * this.panSpeed);

      _pan
        .copy(this.#eye)
        .cross(this.object.up)
        .normalize()
        .multiplyScalar(_mouseChange.x);
      _pan.add(
        _objectUp
          .copy(this.object.up)
          .normalize()
          .multiplyScalar(_mouseChange.y),
      );

      this.object.position.add(_pan);
      this.target.add(_pan);

      if (this.staticMoving) {
        this.#panStart.copy(this.#panEnd);
      } else {
        this.#panStart.add(
          _mouseChange
            .subVectors(this.#panEnd, this.#panStart)
            .multiplyScalar(this.dynamicDampingFactor),
        );
      }
    }
  }

  #rotateCamera(): void {
    _moveDirection.set(
      this.#moveCurr.x - this.#movePrev.x,
      this.#moveCurr.y - this.#movePrev.y,
      0,
    );
    let angle = _moveDirection.length;

    if (angle) {
      this.#eye.copy(this.object.position).sub(this.target);

      _eyeDirection.copy(this.#eye).normalize();
      _objectUpDirection.copy(this.object.up).normalize();
      _objectSidewaysDirection
        .crossVectors(_objectUpDirection, _eyeDirection)
        .normalize();

      _objectUpDirection
        .normalize()
        .multiplyScalar(this.#moveCurr.y - this.#movePrev.y);
      _objectSidewaysDirection
        .normalize()
        .multiplyScalar(this.#moveCurr.x - this.#movePrev.x);

      _moveDirection.copy(_objectUpDirection.add(_objectSidewaysDirection));

      _axis.crossVectors(_moveDirection, this.#eye).normalize();

      angle *= this.rotateSpeed;
      _quaternion.setFromAxisAngle(_axis, angle);

      this.#eye.applyQuaternion(_quaternion);
      this.object.up.applyQuaternion(_quaternion);

      this.#lastAxis.copy(_axis);
      this.#lastAngle = angle;
    } else if (!this.staticMoving && this.#lastAngle) {
      this.#lastAngle *= Math.sqrt(1.0 - this.dynamicDampingFactor);
      this.#eye.copy(this.object.position).sub(this.target);
      _quaternion.setFromAxisAngle(this.#lastAxis, this.#lastAngle);
      this.#eye.applyQuaternion(_quaternion);
      this.object.up.applyQuaternion(_quaternion);
    }

    this.#movePrev.copy(this.#moveCurr);
  }

  #rollCamera(): void {
    const angle = this.#touchRollAngleDelta();

    if (angle) {
      this.#lastRollAngle = angle * this.rollSpeed;
    } else if (!this.staticMoving && this.#lastRollAngle) {
      this.#lastRollAngle *= Math.sqrt(1.0 - this.dynamicDampingFactor);
    } else {
      return;
    }

    _eyeDirection.copy(this.#eye).normalize();
    _quaternion.setFromAxisAngle(_eyeDirection, this.#lastRollAngle);

    this.object.up.applyQuaternion(_quaternion);
  }

  #touchRollAngleDelta(): number {
    const first = this.#pointers[0];
    const second = this.#pointers[1];

    if (
      first === undefined ||
      second === undefined ||
      first.pointerType !== "touch" ||
      second.pointerType !== "touch"
    ) {
      this.#touchRollPointerIds = "";
      return 0;
    }

    const pointerIds = `${first.pointerId},${second.pointerId}`;

    const positionFirst = this.#pointerPositions.get(first.pointerId);
    const positionSecond = this.#pointerPositions.get(second.pointerId);
    if (positionFirst === undefined || positionSecond === undefined) return 0;

    const rollAngle = Math.atan2(
      positionSecond.y - positionFirst.y,
      positionSecond.x - positionFirst.x,
    );

    // fingers changed or new gesture started
    if (pointerIds !== this.#touchRollPointerIds) {
      this.#touchRollPointerIds = pointerIds;
      this.#touchRollAngle = rollAngle;
      return 0;
    }

    let angle = rollAngle - this.#touchRollAngle;
    this.#touchRollAngle = rollAngle;

    if (angle > Math.PI) angle -= 2 * Math.PI;
    else if (angle < -Math.PI) angle += 2 * Math.PI;

    return angle;
  }

  #applyZoomFactor(factor: number): void {
    if (this.object instanceof PerspectiveCamera) {
      this.#eye.multiplyScalar(factor);
    } else {
      this.object.zoom = clamp(
        this.object.zoom / factor,
        this.minZoom,
        this.maxZoom,
      );
      if (this.#lastZoom !== this.object.zoom)
        this.object.updateProjectionMatrix();
    }
  }

  #zoomCamera(): void {
    if (this.state === _STATE.TOUCH_ZOOM_PAN) {
      const factor = this.#touchZoomDistanceStart / this.#touchZoomDistanceEnd;
      this.#touchZoomDistanceStart = this.#touchZoomDistanceEnd;
      this.#applyZoomFactor(factor);
    } else {
      const factor =
        1.0 + (this.#zoomEnd.y - this.#zoomStart.y) * this.zoomSpeed;

      if (factor !== 1.0 && factor > 0.0) this.#applyZoomFactor(factor);

      if (this.staticMoving) {
        this.#zoomStart.copy(this.#zoomEnd);
      } else {
        this.#zoomStart.y +=
          (this.#zoomEnd.y - this.#zoomStart.y) * this.dynamicDampingFactor;
      }
    }
  }

  #mouseOnScreen(pageX: number, pageY: number): Vector2 {
    return _v2.set(
      (pageX - this.screen.left) / this.screen.width,
      (pageY - this.screen.top) / this.screen.height,
    );
  }

  #mouseOnCircle(pageX: number, pageY: number): Vector2 {
    return _v2.set(
      (pageX - this.screen.width * 0.5 - this.screen.left) /
        (this.screen.width * 0.5),
      (this.screen.height + 2 * (this.screen.top - pageY)) / this.screen.width, // screen.width intentional
    );
  }

  #removePointer(event: PointerEvent): void {
    this.#pointerPositions.delete(event.pointerId);

    for (let i = 0; i < this.#pointers.length; i++) {
      if (this.#pointers[i]?.pointerId === event.pointerId) {
        this.#pointers.splice(i, 1);
        return;
      }
    }
  }

  #trackPointer(event: PointerEvent): void {
    let position = this.#pointerPositions.get(event.pointerId);

    if (position === undefined) {
      position = new Vector2();
      this.#pointerPositions.set(event.pointerId, position);
    }

    position.set(event.pageX, event.pageY);
  }

  #secondPointerPosition(event: PointerEvent): Vector2 | undefined {
    const pointer =
      event.pointerId === this.#pointers[0]?.pointerId
        ? this.#pointers[1]
        : this.#pointers[0];

    return pointer && this.#pointerPositions.get(pointer.pointerId);
  }

  #checkDistances(): void {
    if (!this.noZoom || !this.noPan) {
      if (this.#eye.lengthSq > this.maxDistance * this.maxDistance) {
        this.object.position.addVectors(
          this.target,
          this.#eye.normalize().multiplyScalar(this.maxDistance),
        );
        this.#zoomStart.copy(this.#zoomEnd);
      }

      if (this.#eye.lengthSq < this.minDistance * this.minDistance) {
        this.object.position.addVectors(
          this.target,
          this.#eye.normalize().multiplyScalar(this.minDistance),
        );
        this.#zoomStart.copy(this.#zoomEnd);
      }
    }
  }

  #pointerDown(event: PointerEvent): void {
    if (this.enabled === false) return;
    const element = this.domElement;
    if (element === undefined) return;

    if (this.#pointers.length === 0) {
      element.setPointerCapture?.(event.pointerId);

      const pointerTarget = this.#pointerTarget(element);
      pointerTarget.addEventListener("pointermove", this.#onPointerMove);
      pointerTarget.addEventListener("pointerup", this.#onPointerUp);
    }

    this.#pointers.push(event);

    if (event.pointerType === "touch") this.#touchStart(event);
    else this.#mouseDown(event);
  }

  #pointerMove(event: PointerEvent): void {
    if (this.enabled === false) return;

    if (event.pointerType === "touch") this.#touchMove(event);
    else this.#mouseMove(event);
  }

  #pointerUp(event: PointerEvent): void {
    if (this.enabled === false) return;

    if (event.pointerType === "touch") this.#touchEnd(event);
    else this.#mouseUp();

    this.#removePointer(event);

    const element = this.domElement;
    if (this.#pointers.length === 0 && element !== undefined) {
      element.releasePointerCapture?.(event.pointerId);

      const pointerTarget = this.#pointerTarget(element);
      pointerTarget.removeEventListener("pointermove", this.#onPointerMove);
      pointerTarget.removeEventListener("pointerup", this.#onPointerUp);
    }
  }

  #keyUp(): void {
    if (this.enabled === false) return;

    this.keyState = _STATE.NONE;

    this.#window?.addEventListener("keydown", this.#onKeyDown);
  }

  #keyDown(event: KeyboardEvent): void {
    if (this.enabled === false) return;

    this.#window?.removeEventListener("keydown", this.#onKeyDown);

    if (this.keyState !== _STATE.NONE) return;
    if (event.code === this.keys[_STATE.ROTATE] && !this.noRotate) {
      this.keyState = _STATE.ROTATE;
    } else if (event.code === this.keys[_STATE.ZOOM] && !this.noZoom) {
      this.keyState = _STATE.ZOOM;
    } else if (event.code === this.keys[_STATE.PAN] && !this.noPan) {
      this.keyState = _STATE.PAN;
    }
  }

  #mouseDown(event: PointerEvent): void {
    let mouseAction: MOUSE | undefined;

    switch (event.button) {
      case 0:
        mouseAction = this.mouseButtons.LEFT;
        break;
      case 1:
        mouseAction = this.mouseButtons.MIDDLE;
        break;
      case 2:
        mouseAction = this.mouseButtons.RIGHT;
        break;
      default:
        mouseAction = undefined;
    }

    switch (mouseAction) {
      case MOUSE.DOLLY:
        this.state = _STATE.ZOOM;
        break;
      case MOUSE.ROTATE:
        this.state = _STATE.ROTATE;
        break;
      case MOUSE.PAN:
        this.state = _STATE.PAN;
        break;
      default:
        this.state = _STATE.NONE;
    }

    const state = this.keyState !== _STATE.NONE ? this.keyState : this.state;

    if (state === _STATE.ROTATE && !this.noRotate) {
      this.#moveCurr.copy(this.#mouseOnCircle(event.pageX, event.pageY));
      this.#movePrev.copy(this.#moveCurr);
    } else if (state === _STATE.ZOOM && !this.noZoom) {
      this.#zoomStart.copy(this.#mouseOnScreen(event.pageX, event.pageY));
      this.#zoomEnd.copy(this.#zoomStart);
    } else if (state === _STATE.PAN && !this.noPan) {
      this.#panStart.copy(this.#mouseOnScreen(event.pageX, event.pageY));
      this.#panEnd.copy(this.#panStart);
    }

    this.dispatchEvent(_startEvent);
  }

  #mouseMove(event: PointerEvent): void {
    const state = this.keyState !== _STATE.NONE ? this.keyState : this.state;

    if (state === _STATE.ROTATE && !this.noRotate) {
      this.#moveCurr.copy(this.#mouseOnCircle(event.pageX, event.pageY));
    } else if (state === _STATE.ZOOM && !this.noZoom) {
      this.#zoomEnd.copy(this.#mouseOnScreen(event.pageX, event.pageY));
    } else if (state === _STATE.PAN && !this.noPan) {
      this.#panEnd.copy(this.#mouseOnScreen(event.pageX, event.pageY));
    }
  }

  #mouseUp(): void {
    this.state = _STATE.NONE;

    this.dispatchEvent(_endEvent);
  }

  #mouseWheel(event: WheelEvent): void {
    if (this.enabled === false) return;

    if (this.noZoom === true) return;

    event.preventDefault();

    switch (event.deltaMode) {
      case 2:
        // Zoom in pages
        this.#zoomStart.y -= event.deltaY * 0.025;
        break;
      case 1:
        // Zoom in lines
        this.#zoomStart.y -= event.deltaY * 0.01;
        break;
      default:
        // undefined, 0, assume pixels
        this.#zoomStart.y -= event.deltaY * 0.00025;
        break;
    }

    this.dispatchEvent(_startEvent);
    this.dispatchEvent(_endEvent);
  }

  #touchStart(event: PointerEvent): void {
    this.#trackPointer(event);

    const first = this.#pointers[0] as PointerEvent;
    if (this.#pointers.length === 1) {
      this.state = _STATE.TOUCH_ROTATE;
      this.#moveCurr.copy(this.#mouseOnCircle(first.pageX, first.pageY));
      this.#movePrev.copy(this.#moveCurr);
    } else {
      // 2 or more
      const second = this.#pointers[1] as PointerEvent;
      this.state = _STATE.TOUCH_ZOOM_PAN;
      const dx = first.pageX - second.pageX;
      const dy = first.pageY - second.pageY;
      this.#touchZoomDistanceStart = Math.sqrt(dx * dx + dy * dy);
      this.#touchZoomDistanceEnd = this.#touchZoomDistanceStart;

      const x = (first.pageX + second.pageX) / 2;
      const y = (first.pageY + second.pageY) / 2;
      this.#panStart.copy(this.#mouseOnScreen(x, y));
      this.#panEnd.copy(this.#panStart);
    }

    this.dispatchEvent(_startEvent);
  }

  #touchMove(event: PointerEvent): void {
    this.#trackPointer(event);

    if (this.#pointers.length === 1) {
      this.#moveCurr.copy(this.#mouseOnCircle(event.pageX, event.pageY));
      return;
    }

    // 2 or more
    const position = this.#secondPointerPosition(event);
    if (position === undefined) return;

    const dx = event.pageX - position.x;
    const dy = event.pageY - position.y;
    this.#touchZoomDistanceEnd = Math.sqrt(dx * dx + dy * dy);

    const x = (event.pageX + position.x) / 2;
    const y = (event.pageY + position.y) / 2;
    this.#panEnd.copy(this.#mouseOnScreen(x, y));
  }

  #touchEnd(event: PointerEvent): void {
    // Runs before the pointer is removed, so the count includes this pointer.
    switch (this.#pointers.length) {
      case 0:
        this.state = _STATE.NONE;
        break;

      case 1:
        this.state = _STATE.TOUCH_ROTATE;
        this.#moveCurr.copy(this.#mouseOnCircle(event.pageX, event.pageY));
        this.#movePrev.copy(this.#moveCurr);
        break;

      case 2:
        this.state = _STATE.TOUCH_ZOOM_PAN;

        for (const pointer of this.#pointers) {
          if (pointer.pointerId !== event.pointerId) {
            const position = this.#pointerPositions.get(pointer.pointerId);
            if (position !== undefined) {
              this.#moveCurr.copy(this.#mouseOnCircle(position.x, position.y));
              this.#movePrev.copy(this.#moveCurr);
            }
            break;
          }
        }

        break;
    }

    this.dispatchEvent(_endEvent);
  }
}
