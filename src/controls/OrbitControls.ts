import { OrthographicCamera } from "../cameras/OrthographicCamera.ts";
import { PerspectiveCamera } from "../cameras/PerspectiveCamera.ts";
import { MOUSE, TOUCH } from "../core/Constants.ts";
import { toRadians } from "../math/MathUtils.ts";
import { Plane } from "../math/Plane.ts";
import { Quaternion } from "../math/Quaternion.ts";
import { Ray } from "../math/Ray.ts";
import { Spherical } from "../math/Spherical.ts";
import { Vector2 } from "../math/Vector2.ts";
import { Vector3 } from "../math/Vector3.ts";
import type { ControlDomElement } from "./ControlDom.ts";
import { Controls } from "./Controls.ts";

/** Camera types that orbit, map, and related controls can drive. */
export type OrbitCamera = PerspectiveCamera | OrthographicCamera;

/** Arrow-key codes that pan (or, with a modifier, rotate) the camera. */
export interface OrbitControlsKeys {
  /** Key code that pans left. */
  LEFT: string;
  /** Key code that pans up. */
  UP: string;
  /** Key code that pans right. */
  RIGHT: string;
  /** Key code that pans down. */
  BOTTOM: string;
}

/** Pointer fields read by the touch gesture handlers. */
interface TouchPoint {
  pointerId: number;
  pageX: number;
  pageY: number;
}

const _changeEvent = { type: "change" };
const _startEvent = { type: "start" };
const _endEvent = { type: "end" };

const _ray = new Ray();
const _plane = new Plane();
const _TILT_LIMIT = Math.cos(toRadians(70));

const _v = new Vector3();
const _mouseBefore = new Vector3();
const _mouseAfter = new Vector3();
const _twoPI = 2 * Math.PI;

const STATE = {
  NONE: -1,
  ROTATE: 0,
  DOLLY: 1,
  PAN: 2,
  TOUCH_ROTATE: 3,
  TOUCH_PAN: 4,
  TOUCH_DOLLY_PAN: 5,
  TOUCH_DOLLY_ROTATE: 6,
} as const;

const _EPS = 0.000001;

const _captureOptions = { capture: true };
const _passiveCaptureOptions = { passive: true, capture: true };
const _activeOptions = { passive: false };

/**
 * Orbit controls let the camera orbit around a target.
 *
 * Mirrors three.js r186 `OrbitControls`. With the default mappings:
 * - Orbit: left mouse, or left mouse + ctrl/meta/shift for the pan swap;
 *   one-finger touch.
 * - Zoom: middle mouse or mouse wheel; two-finger spread or squish.
 * - Pan: right mouse, or left mouse + ctrl/meta/shift; arrow keys after
 *   `listenToKeyEvents`; two-finger move.
 *
 * The orbit axis is the camera's `up` vector at construction time.
 *
 * Dispatches `change` when the camera moves, `start` when an interaction
 * begins, and `end` when it ends.
 */
export class OrbitControls extends Controls<OrbitCamera> {
  /** Focus point the camera orbits around. */
  target: Vector3 = new Vector3();

  /**
   * Focus point of `minTargetRadius` and `maxTargetRadius`; the target is kept
   * within that distance range of this point.
   */
  cursor: Vector3 = new Vector3();

  /** Minimum dolly distance (perspective cameras only). */
  minDistance: number = 0;

  /** Maximum dolly distance (perspective cameras only). */
  maxDistance: number = Number.POSITIVE_INFINITY;

  /** Minimum camera zoom (orthographic cameras only). */
  minZoom: number = 0;

  /** Maximum camera zoom (orthographic cameras only). */
  maxZoom: number = Number.POSITIVE_INFINITY;

  /** Minimum distance of the target from `cursor`. */
  minTargetRadius: number = 0;

  /** Maximum distance of the target from `cursor`. */
  maxTargetRadius: number = Number.POSITIVE_INFINITY;

  /** Lower polar-angle limit in radians, in `[0, PI]`. */
  minPolarAngle: number = 0;

  /** Upper polar-angle limit in radians, in `[0, PI]`. */
  maxPolarAngle: number = Math.PI;

  /**
   * Lower azimuth limit in radians. With both limits finite, the interval
   * `[min, max]` must be a sub-interval of `[-2 PI, 2 PI]` spanning less than
   * `2 PI`.
   */
  minAzimuthAngle: number = Number.NEGATIVE_INFINITY;

  /** Upper azimuth limit in radians; see `minAzimuthAngle`. */
  maxAzimuthAngle: number = Number.POSITIVE_INFINITY;

  /** Adds inertia; call `update()` every frame when enabled. */
  enableDamping: boolean = false;

  /** Damping inertia used when `enableDamping` is true. */
  dampingFactor: number = 0.05;

  /** Enables zooming (dollying) the camera. */
  enableZoom: boolean = true;

  /** Zoom speed multiplier. */
  zoomSpeed: number = 1.0;

  /** Enables rotating the camera around the target. */
  enableRotate: boolean = true;

  /** Pointer rotation speed multiplier. */
  rotateSpeed: number = 1.0;

  /** Keyboard rotation speed multiplier. */
  keyRotateSpeed: number = 1.0;

  /** Enables panning the camera. */
  enablePan: boolean = true;

  /** Pointer pan speed multiplier. */
  panSpeed: number = 1.0;

  /**
   * Pans in screen space when true; otherwise pans in the plane orthogonal to
   * the camera's `up` vector.
   */
  screenSpacePanning: boolean = true;

  /** Pixels moved per arrow-key press. */
  keyPanSpeed: number = 7.0;

  /** Zooms toward the pointer position instead of the target. */
  zoomToCursor: boolean = false;

  /** Automatically rotates around the target; call `update()` every frame. */
  autoRotate: boolean = false;

  /**
   * Auto-rotation speed. `2.0` is 30 seconds per orbit at 60 fps, or per
   * 30 seconds of `update(delta)` time.
   */
  autoRotateSpeed: number = 2.0;

  /** Arrow-key codes used after `listenToKeyEvents`. */
  override keys: OrbitControlsKeys = {
    LEFT: "ArrowLeft",
    UP: "ArrowUp",
    RIGHT: "ArrowRight",
    BOTTOM: "ArrowDown",
  };

  /** Mouse-button actions: left rotates, middle dollies, right pans. */
  override mouseButtons: Controls["mouseButtons"] = {
    LEFT: MOUSE.ROTATE,
    MIDDLE: MOUSE.DOLLY,
    RIGHT: MOUSE.PAN,
  };

  /** Touch actions: one finger rotates, two fingers dolly and pan. */
  override touches: Controls["touches"] = {
    ONE: TOUCH.ROTATE,
    TWO: TOUCH.DOLLY_PAN,
  };

  /** Target saved by `saveState()` and restored by `reset()`. */
  target0: Vector3;

  /** Camera position saved by `saveState()` and restored by `reset()`. */
  position0: Vector3;

  /** Camera zoom saved by `saveState()` and restored by `reset()`. */
  zoom0: number;

  /** World-space pan offset applied to the target by the next `update()`. */
  protected readonly panOffset: Vector3 = new Vector3();

  #cursorStyle: "auto" | "grab" = "auto";
  #domElementKeyEvents: EventTarget | undefined;

  readonly #lastPosition = new Vector3();
  readonly #lastQuaternion = new Quaternion();
  readonly #lastTargetPosition = new Vector3();

  // Rotates offsets into "y-axis-is-up" space so camera.up is the orbit axis.
  readonly #quat: Quaternion;
  readonly #quatInverse: Quaternion;

  readonly #spherical = new Spherical();
  readonly #sphericalDelta = new Spherical();

  #scale = 1;

  readonly #rotateStart = new Vector2();
  readonly #rotateEnd = new Vector2();
  readonly #rotateDelta = new Vector2();

  readonly #panStart = new Vector2();
  readonly #panEnd = new Vector2();
  readonly #panDelta = new Vector2();

  readonly #dollyStart = new Vector2();
  readonly #dollyEnd = new Vector2();
  readonly #dollyDelta = new Vector2();

  readonly #dollyDirection = new Vector3();
  readonly #mouse = new Vector2();
  #performCursorZoom = false;

  readonly #pointers: number[] = [];
  readonly #pointerPositions = new Map<number, Vector2>();
  readonly #freePointerPositions: Vector2[] = [];
  readonly #untrackedPosition = new Vector2();
  readonly #touchPlaceholder: TouchPoint = { pointerId: 0, pageX: 0, pageY: 0 };

  #controlActive = false;

  readonly #onPointerMove = (event: Event): void =>
    this.#handlePointerMove(event as PointerEvent);
  readonly #onPointerDown = (event: Event): void =>
    this.#handlePointerDown(event as PointerEvent);
  readonly #onPointerUp = (event: Event): void =>
    this.#handlePointerUp(event as PointerEvent);
  readonly #onContextMenu = (event: Event): void => {
    if (this.enabled === false) return;
    event.preventDefault();
  };
  readonly #onMouseWheel = (event: Event): void =>
    this.#handleWheel(event as WheelEvent);
  readonly #onKeyDown = (event: Event): void => {
    if (this.enabled === false) return;
    this.#handleKeyDown(event as KeyboardEvent);
  };
  readonly #interceptControlDown = (event: Event): void => {
    if ((event as KeyboardEvent).key !== "Control") return;
    this.#controlActive = true;
    this.#rootNode()?.addEventListener(
      "keyup",
      this.#interceptControlUp,
      _passiveCaptureOptions,
    );
  };
  readonly #interceptControlUp = (event: Event): void => {
    if ((event as KeyboardEvent).key !== "Control") return;
    this.#controlActive = false;
    this.#rootNode()?.removeEventListener(
      "keyup",
      this.#interceptControlUp,
      _passiveCaptureOptions,
    );
  };

  /**
   * Creates orbit controls for `object`, connecting to `domElement` when given.
   *
   * @param object The camera to control.
   * @param domElement The element used for pointer and wheel listeners.
   */
  constructor(object: OrbitCamera, domElement?: ControlDomElement) {
    super(object, domElement);
    this.state = STATE.NONE;
    this.target0 = this.target.clone();
    this.position0 = object.position.clone();
    this.zoom0 = object.zoom;
    this.#quat = new Quaternion().setFromUnitVectors(
      object.up,
      new Vector3(0, 1, 0),
    );
    this.#quatInverse = this.#quat.clone().invert();

    if (domElement !== undefined) this.connect(domElement);

    this.update();
  }

  /**
   * Pointer cursor style: `"grab"` shows a grab cursor over the element and a
   * grabbing cursor while dragging; `"auto"` leaves the cursor unchanged.
   */
  get cursorStyle(): "auto" | "grab" {
    return this.#cursorStyle;
  }

  /** Sets the pointer cursor style and applies it to the element. */
  set cursorStyle(type: "auto" | "grab") {
    this.#cursorStyle = type;
    const style = this.domElement?.style;
    if (style) style.cursor = type === "grab" ? "grab" : "auto";
  }

  /** Current polar (vertical) rotation in radians. */
  get polarAngle(): number {
    return this.#spherical.phi;
  }

  /** Current azimuthal (horizontal) rotation in radians. */
  get azimuthalAngle(): number {
    return this.#spherical.theta;
  }

  /** Distance from the camera to the target. */
  get distance(): number {
    return this.object.position.distanceTo(this.target);
  }

  /** Adds pointer, wheel, context-menu, and Control-key listeners to `element`. */
  override connect(element: ControlDomElement): void {
    super.connect(element);

    element.addEventListener("pointerdown", this.#onPointerDown);
    element.addEventListener("pointercancel", this.#onPointerUp);
    element.addEventListener("contextmenu", this.#onContextMenu);
    element.addEventListener("wheel", this.#onMouseWheel, _activeOptions);

    this.#rootNode()?.addEventListener(
      "keydown",
      this.#interceptControlDown,
      _passiveCaptureOptions,
    );

    if (element.style) element.style.touchAction = "none"; // Disable touch scroll
  }

  /** Removes every listener added by `connect` and `listenToKeyEvents`. */
  override disconnect(): void {
    this.state = STATE.NONE;
    const element = this.domElement;
    if (element === undefined) return;

    element.removeEventListener("pointerdown", this.#onPointerDown);
    const pointerTarget = this.#pointerTarget(element);
    pointerTarget.removeEventListener("pointermove", this.#onPointerMove);
    pointerTarget.removeEventListener("pointerup", this.#onPointerUp);
    element.removeEventListener("pointercancel", this.#onPointerUp);

    element.removeEventListener("wheel", this.#onMouseWheel);
    element.removeEventListener("contextmenu", this.#onContextMenu);

    this.stopListenToKeyEvents();

    const root = this.#rootNode();
    root?.removeEventListener(
      "keydown",
      this.#interceptControlDown,
      _captureOptions,
    );
    root?.removeEventListener(
      "keyup",
      this.#interceptControlUp,
      _captureOptions,
    );

    this.#controlActive = false;

    this.#pointers.length = 0;
    for (const position of this.#pointerPositions.values()) {
      this.#freePointerPositions.push(position);
    }
    this.#pointerPositions.clear();

    if (element.style) {
      element.style.touchAction = ""; // Restore touch scroll
      element.style.cursor = "auto";
    }
  }

  /** Disconnects all listeners; call when the controls are no longer needed. */
  override dispose(): void {
    this.disconnect();
  }

  /**
   * Adds a `keydown` listener for arrow-key panning to `domElement`, commonly
   * `window`.
   *
   * @param domElement The target that receives key events.
   */
  listenToKeyEvents(domElement: EventTarget): void {
    domElement.addEventListener("keydown", this.#onKeyDown);
    this.#domElementKeyEvents = domElement;
  }

  /** Removes the key listener added by `listenToKeyEvents`. */
  stopListenToKeyEvents(): void {
    if (this.#domElementKeyEvents !== undefined) {
      this.#domElementKeyEvents.removeEventListener("keydown", this.#onKeyDown);
      this.#domElementKeyEvents = undefined;
    }
  }

  /** Saves the current target, camera position, and zoom for `reset()`. */
  saveState(): void {
    this.target0.copy(this.target);
    this.position0.copy(this.object.position);
    this.zoom0 = this.object.zoom;
  }

  /** Restores the state saved by `saveState()` (or the constructor). */
  reset(): void {
    this.target.copy(this.target0);
    this.object.position.copy(this.position0);
    this.object.zoom = this.zoom0;

    this.object.updateProjectionMatrix();
    this.dispatchEvent(_changeEvent);

    this.update();

    this.state = STATE.NONE;
  }

  /**
   * Pans the camera by a pixel delta and updates.
   *
   * @param deltaX Horizontal delta in pixels; right is positive.
   * @param deltaY Vertical delta in pixels; down is positive.
   */
  pan(deltaX: number, deltaY: number): void {
    this.#pan(deltaX, deltaY);
    this.update();
  }

  /**
   * Dollies in (zooms in) by `dollyScale` and updates.
   *
   * @param dollyScale The dolly scale factor.
   */
  dollyIn(dollyScale: number): void {
    this.#dollyIn(dollyScale);
    this.update();
  }

  /**
   * Dollies out (zooms out) by `dollyScale` and updates.
   *
   * @param dollyScale The dolly scale factor.
   */
  dollyOut(dollyScale: number): void {
    this.#dollyOut(dollyScale);
    this.update();
  }

  /**
   * Rotates the camera left around the target and updates.
   *
   * @param angle The rotation angle in radians.
   */
  rotateLeft(angle: number): void {
    this.#rotateLeft(angle);
    this.update();
  }

  /**
   * Rotates the camera up around the target and updates.
   *
   * @param angle The rotation angle in radians.
   */
  rotateUp(angle: number): void {
    this.#rotateUp(angle);
    this.update();
  }

  /**
   * Applies pending rotation, dolly, pan, and auto-rotation to the camera.
   * Call every frame when damping or auto-rotation is enabled.
   *
   * @param delta Seconds since the last update; auto-rotation assumes 60 fps
   * per call when omitted.
   * @returns Whether the camera changed.
   */
  override update(delta?: number): boolean {
    const object = this.object;
    const position = object.position;

    _v.copy(position).sub(this.target);

    // rotate offset to "y-axis-is-up" space
    _v.applyQuaternion(this.#quat);

    // angle from z-axis around y-axis
    this.#spherical.setFromVector3(_v);

    if (this.autoRotate && this.state === STATE.NONE) {
      this.#rotateLeft(this.#autoRotationAngle(delta));
    }

    if (this.enableDamping) {
      this.#spherical.theta += this.#sphericalDelta.theta * this.dampingFactor;
      this.#spherical.phi += this.#sphericalDelta.phi * this.dampingFactor;
    } else {
      this.#spherical.theta += this.#sphericalDelta.theta;
      this.#spherical.phi += this.#sphericalDelta.phi;
    }

    // restrict theta to be between desired limits
    let min = this.minAzimuthAngle;
    let max = this.maxAzimuthAngle;

    if (Number.isFinite(min) && Number.isFinite(max)) {
      if (min < -Math.PI) min += _twoPI;
      else if (min > Math.PI) min -= _twoPI;

      if (max < -Math.PI) max += _twoPI;
      else if (max > Math.PI) max -= _twoPI;

      if (min <= max) {
        this.#spherical.theta = Math.max(
          min,
          Math.min(max, this.#spherical.theta),
        );
      } else {
        this.#spherical.theta =
          this.#spherical.theta > (min + max) / 2
            ? Math.max(min, this.#spherical.theta)
            : Math.min(max, this.#spherical.theta);
      }
    }

    // restrict phi to be between desired limits
    this.#spherical.phi = Math.max(
      this.minPolarAngle,
      Math.min(this.maxPolarAngle, this.#spherical.phi),
    );

    this.#spherical.makeSafe();

    // move target to panned location
    if (this.enableDamping === true) {
      this.target.addScaledVector(this.panOffset, this.dampingFactor);
    } else {
      this.target.add(this.panOffset);
    }

    // Limit the target distance from the cursor to create a sphere around the center of interest
    this.target.sub(this.cursor);
    this.target.clampLength(this.minTargetRadius, this.maxTargetRadius);
    this.target.add(this.cursor);

    let zoomChanged = false;
    // adjust the camera position based on zoom only if we're not zooming to the cursor or if it's an ortho camera
    // we adjust zoom later in these cases
    if (
      (this.zoomToCursor && this.#performCursorZoom) ||
      object instanceof OrthographicCamera
    ) {
      this.#spherical.radius = this.#clampDistance(this.#spherical.radius);
    } else {
      const prevRadius = this.#spherical.radius;
      this.#spherical.radius = this.#clampDistance(
        this.#spherical.radius * this.#scale,
      );
      zoomChanged = prevRadius !== this.#spherical.radius;
    }

    _v.setFromSpherical(this.#spherical);

    // rotate offset back to "camera-up-vector-is-up" space
    _v.applyQuaternion(this.#quatInverse);

    position.copy(this.target).add(_v);

    this.#lookAtTarget();

    if (this.enableDamping === true) {
      this.#sphericalDelta.theta *= 1 - this.dampingFactor;
      this.#sphericalDelta.phi *= 1 - this.dampingFactor;

      this.panOffset.multiplyScalar(1 - this.dampingFactor);
    } else {
      this.#sphericalDelta.set(0, 0, 0);

      this.panOffset.set(0, 0, 0);
    }

    // adjust camera position
    if (this.zoomToCursor && this.#performCursorZoom) {
      let newRadius: number;
      if (object instanceof PerspectiveCamera) {
        // move the camera down the pointer ray
        // this method avoids floating point error
        const prevRadius = _v.length;
        newRadius = this.#clampDistance(prevRadius * this.#scale);

        const radiusDelta = prevRadius - newRadius;
        object.position.addScaledVector(this.#dollyDirection, radiusDelta);
        object.updateMatrixWorld();

        zoomChanged = !!radiusDelta;
      } else {
        // adjust the ortho camera position based on zoom changes
        _mouseBefore.set(this.#mouse.x, this.#mouse.y, 0).unproject(object);

        const prevZoom = object.zoom;
        object.zoom = Math.max(
          this.minZoom,
          Math.min(this.maxZoom, object.zoom / this.#scale),
        );
        object.updateProjectionMatrix();

        zoomChanged = prevZoom !== object.zoom;

        _mouseAfter.set(this.#mouse.x, this.#mouse.y, 0).unproject(object);

        object.position.sub(_mouseAfter).add(_mouseBefore);
        object.updateMatrixWorld();

        newRadius = _v.length;
      }

      // handle the placement of the target
      if (this.screenSpacePanning) {
        // position the orbit target in front of the new camera position
        this.target
          .set(0, 0, -1)
          .transformDirection(object.matrix)
          .multiplyScalar(newRadius)
          .add(object.position);
      } else {
        // get the ray and translation plane to compute target
        _ray.origin.copy(object.position);
        _ray.direction.set(0, 0, -1).transformDirection(object.matrix);

        // if the camera is 20 degrees above the horizon then don't adjust the focus target to avoid
        // extremely large values
        if (Math.abs(object.up.dot(_ray.direction)) < _TILT_LIMIT) {
          this.#lookAtTarget();
        } else {
          _plane.setFromNormalAndCoplanarPoint(object.up, this.target);
          _ray.intersectPlane(_plane, this.target);
        }
      }
    } else if (object instanceof OrthographicCamera) {
      const prevZoom = object.zoom;
      object.zoom = Math.max(
        this.minZoom,
        Math.min(this.maxZoom, object.zoom / this.#scale),
      );

      if (prevZoom !== object.zoom) {
        object.updateProjectionMatrix();
        zoomChanged = true;
      }
    }

    this.#scale = 1;
    this.#performCursorZoom = false;

    // update condition is:
    // min(camera displacement, camera rotation in radians)^2 > EPS
    // using small-angle approximation cos(x/2) = 1 - x^2 / 8

    if (
      zoomChanged ||
      this.#lastPosition.distanceToSquared(object.position) > _EPS ||
      8 * (1 - this.#lastQuaternion.dot(object.quaternion)) > _EPS ||
      this.#lastTargetPosition.distanceToSquared(this.target) > _EPS
    ) {
      this.dispatchEvent(_changeEvent);

      this.#lastPosition.copy(object.position);
      this.#lastQuaternion.copy(object.quaternion);
      this.#lastTargetPosition.copy(this.target);

      return true;
    }

    return false;
  }

  /**
   * Starts a mouse pan at the event position. Subclasses override this to
   * change how a pan gesture begins.
   *
   * @param event The pointer event that started the pan.
   */
  protected handleMouseDownPan(event: PointerEvent): void {
    this.#panStart.set(event.clientX, event.clientY);
  }

  /**
   * Continues a mouse pan to the event position and updates. Subclasses
   * override this to change how a pan gesture moves the camera.
   *
   * @param event The pointer event that moved the pan.
   */
  protected handleMouseMovePan(event: PointerEvent): void {
    this.#panEnd.set(event.clientX, event.clientY);

    this.#panDelta
      .subVectors(this.#panEnd, this.#panStart)
      .multiplyScalar(this.panSpeed);

    this.#pan(this.#panDelta.x, this.#panDelta.y);

    this.#panStart.copy(this.#panEnd);

    this.update();
  }

  // Node.lookAt refreshes the world matrix from the new position (and the
  // previous rotation) before aiming the camera, as three.js Object3D.lookAt does.
  #lookAtTarget(): void {
    this.object.lookAt(this.target);
  }

  #rootNode(): EventTarget | undefined {
    const element = this.domElement;
    if (element === undefined) return undefined;
    return element.getRootNode?.() ?? element.ownerDocument;
  }

  #pointerTarget(element: ControlDomElement): EventTarget {
    return element.ownerDocument ?? element;
  }

  #clientHeight(): number {
    const element = this.domElement;
    return (
      element?.clientHeight ?? element?.getBoundingClientRect?.().height ?? 1
    );
  }

  #clientWidth(): number {
    const element = this.domElement;
    return (
      element?.clientWidth ?? element?.getBoundingClientRect?.().width ?? 1
    );
  }

  #autoRotationAngle(delta: number | undefined): number {
    if (delta !== undefined) {
      return (_twoPI / 60) * this.autoRotateSpeed * delta;
    }
    return (_twoPI / 60 / 60) * this.autoRotateSpeed;
  }

  #zoomScale(delta: number): number {
    const normalizedDelta = Math.abs(delta * 0.01);
    return 0.95 ** (this.zoomSpeed * normalizedDelta);
  }

  #rotateLeft(angle: number): void {
    this.#sphericalDelta.theta -= angle;
  }

  #rotateUp(angle: number): void {
    this.#sphericalDelta.phi -= angle;
  }

  #panLeft(
    distance: number,
    objectMatrix: { elements: ArrayLike<number> },
  ): void {
    _v.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix
    _v.multiplyScalar(-distance);

    this.panOffset.add(_v);
  }

  #panUp(
    distance: number,
    objectMatrix: { elements: ArrayLike<number> },
  ): void {
    if (this.screenSpacePanning === true) {
      _v.setFromMatrixColumn(objectMatrix, 1);
    } else {
      _v.setFromMatrixColumn(objectMatrix, 0);
      _v.crossVectors(this.object.up, _v);
    }

    _v.multiplyScalar(distance);

    this.panOffset.add(_v);
  }

  // deltaX and deltaY are in pixels; right and down are positive
  #pan(deltaX: number, deltaY: number): void {
    const object = this.object;
    const height = this.#clientHeight();

    if (object instanceof PerspectiveCamera) {
      // perspective
      _v.copy(object.position).sub(this.target);
      let targetDistance = _v.length;

      // half of the fov is center to top of screen
      targetDistance *= Math.tan(toRadians(object.fov / 2));

      // we use only clientHeight here so aspect ratio does not distort speed
      this.#panLeft((2 * deltaX * targetDistance) / height, object.matrix);
      this.#panUp((2 * deltaY * targetDistance) / height, object.matrix);
    } else {
      // orthographic
      this.#panLeft(
        (deltaX * (object.right - object.left)) /
          object.zoom /
          this.#clientWidth(),
        object.matrix,
      );
      this.#panUp(
        (deltaY * (object.top - object.bottom)) / object.zoom / height,
        object.matrix,
      );
    }
  }

  #dollyOut(dollyScale: number): void {
    this.#scale /= dollyScale;
  }

  #dollyIn(dollyScale: number): void {
    this.#scale *= dollyScale;
  }

  #updateZoomParameters(x: number, y: number): void {
    if (!this.zoomToCursor) return;

    const rect = this.domElement?.getBoundingClientRect?.();
    if (rect === undefined) return;

    this.#performCursorZoom = true;

    const dx = x - rect.left;
    const dy = y - rect.top;
    const w = rect.width;
    const h = rect.height;

    this.#mouse.x = (dx / w) * 2 - 1;
    this.#mouse.y = -(dy / h) * 2 + 1;

    this.#dollyDirection
      .set(this.#mouse.x, this.#mouse.y, 1)
      .unproject(this.object)
      .sub(this.object.position)
      .normalize();
  }

  #clampDistance(dist: number): number {
    return Math.max(this.minDistance, Math.min(this.maxDistance, dist));
  }

  //
  // event callbacks - update the object state
  //

  #handleMouseDownRotate(event: PointerEvent): void {
    this.#rotateStart.set(event.clientX, event.clientY);
  }

  #handleMouseDownDolly(event: PointerEvent): void {
    // three.js r186 passes clientX twice here; kept for parity.
    this.#updateZoomParameters(event.clientX, event.clientX);
    this.#dollyStart.set(event.clientX, event.clientY);
  }

  #handleMouseMoveRotate(event: PointerEvent): void {
    this.#rotateEnd.set(event.clientX, event.clientY);

    this.#rotateDelta
      .subVectors(this.#rotateEnd, this.#rotateStart)
      .multiplyScalar(this.rotateSpeed);

    const height = this.#clientHeight();

    this.#rotateLeft((_twoPI * this.#rotateDelta.x) / height); // yes, height

    this.#rotateUp((_twoPI * this.#rotateDelta.y) / height);

    this.#rotateStart.copy(this.#rotateEnd);

    this.update();
  }

  #handleMouseMoveDolly(event: PointerEvent): void {
    this.#dollyEnd.set(event.clientX, event.clientY);

    this.#dollyDelta.subVectors(this.#dollyEnd, this.#dollyStart);

    if (this.#dollyDelta.y > 0) {
      this.#dollyOut(this.#zoomScale(this.#dollyDelta.y));
    } else if (this.#dollyDelta.y < 0) {
      this.#dollyIn(this.#zoomScale(this.#dollyDelta.y));
    }

    this.#dollyStart.copy(this.#dollyEnd);

    this.update();
  }

  #handleMouseWheel(clientX: number, clientY: number, deltaY: number): void {
    this.#updateZoomParameters(clientX, clientY);

    if (deltaY < 0) {
      this.#dollyIn(this.#zoomScale(deltaY));
    } else if (deltaY > 0) {
      this.#dollyOut(this.#zoomScale(deltaY));
    }

    this.update();
  }

  #handleKeyDown(event: KeyboardEvent): void {
    let needsUpdate = false;
    const modified = event.ctrlKey || event.metaKey || event.shiftKey;
    const rotateStep = (_twoPI * this.keyRotateSpeed) / this.#clientHeight();

    switch (event.code) {
      case this.keys.UP:
        if (modified) {
          if (this.enableRotate) this.#rotateUp(rotateStep);
        } else if (this.enablePan) {
          this.#pan(0, this.keyPanSpeed);
        }
        needsUpdate = true;
        break;

      case this.keys.BOTTOM:
        if (modified) {
          if (this.enableRotate) this.#rotateUp(-rotateStep);
        } else if (this.enablePan) {
          this.#pan(0, -this.keyPanSpeed);
        }
        needsUpdate = true;
        break;

      case this.keys.LEFT:
        if (modified) {
          if (this.enableRotate) this.#rotateLeft(rotateStep);
        } else if (this.enablePan) {
          this.#pan(this.keyPanSpeed, 0);
        }
        needsUpdate = true;
        break;

      case this.keys.RIGHT:
        if (modified) {
          if (this.enableRotate) this.#rotateLeft(-rotateStep);
        } else if (this.enablePan) {
          this.#pan(-this.keyPanSpeed, 0);
        }
        needsUpdate = true;
        break;
    }

    if (needsUpdate) {
      // prevent the browser from scrolling on cursor keys
      event.preventDefault();

      this.update();
    }
  }

  #handleTouchStartRotate(event: TouchPoint): void {
    if (this.#pointers.length === 1) {
      this.#rotateStart.set(event.pageX, event.pageY);
    } else {
      const position = this.#secondPointerPosition(event);
      this.#rotateStart.set(
        0.5 * (event.pageX + position.x),
        0.5 * (event.pageY + position.y),
      );
    }
  }

  #handleTouchStartPan(event: TouchPoint): void {
    if (this.#pointers.length === 1) {
      this.#panStart.set(event.pageX, event.pageY);
    } else {
      const position = this.#secondPointerPosition(event);
      this.#panStart.set(
        0.5 * (event.pageX + position.x),
        0.5 * (event.pageY + position.y),
      );
    }
  }

  #handleTouchStartDolly(event: TouchPoint): void {
    const position = this.#secondPointerPosition(event);

    const dx = event.pageX - position.x;
    const dy = event.pageY - position.y;

    this.#dollyStart.set(0, Math.sqrt(dx * dx + dy * dy));
  }

  #handleTouchMoveRotate(event: TouchPoint): void {
    if (this.#pointers.length === 1) {
      this.#rotateEnd.set(event.pageX, event.pageY);
    } else {
      const position = this.#secondPointerPosition(event);
      this.#rotateEnd.set(
        0.5 * (event.pageX + position.x),
        0.5 * (event.pageY + position.y),
      );
    }

    this.#rotateDelta
      .subVectors(this.#rotateEnd, this.#rotateStart)
      .multiplyScalar(this.rotateSpeed);

    const height = this.#clientHeight();

    this.#rotateLeft((_twoPI * this.#rotateDelta.x) / height); // yes, height

    this.#rotateUp((_twoPI * this.#rotateDelta.y) / height);

    this.#rotateStart.copy(this.#rotateEnd);
  }

  #handleTouchMovePan(event: TouchPoint): void {
    if (this.#pointers.length === 1) {
      this.#panEnd.set(event.pageX, event.pageY);
    } else {
      const position = this.#secondPointerPosition(event);
      this.#panEnd.set(
        0.5 * (event.pageX + position.x),
        0.5 * (event.pageY + position.y),
      );
    }

    this.#panDelta
      .subVectors(this.#panEnd, this.#panStart)
      .multiplyScalar(this.panSpeed);

    this.#pan(this.#panDelta.x, this.#panDelta.y);

    this.#panStart.copy(this.#panEnd);
  }

  #handleTouchMoveDolly(event: TouchPoint): void {
    const position = this.#secondPointerPosition(event);

    const dx = event.pageX - position.x;
    const dy = event.pageY - position.y;

    this.#dollyEnd.set(0, Math.sqrt(dx * dx + dy * dy));

    this.#dollyDelta.set(
      0,
      (this.#dollyEnd.y / this.#dollyStart.y) ** this.zoomSpeed,
    );

    this.#dollyOut(this.#dollyDelta.y);

    this.#dollyStart.copy(this.#dollyEnd);

    const centerX = (event.pageX + position.x) * 0.5;
    const centerY = (event.pageY + position.y) * 0.5;

    this.#updateZoomParameters(centerX, centerY);
  }

  // pointers

  #removePointer(pointerId: number): void {
    const position = this.#pointerPositions.get(pointerId);
    if (position !== undefined) {
      this.#pointerPositions.delete(pointerId);
      this.#freePointerPositions.push(position);
    }

    const index = this.#pointers.indexOf(pointerId);
    if (index !== -1) this.#pointers.splice(index, 1);
  }

  #trackPointer(event: TouchPoint): void {
    let position = this.#pointerPositions.get(event.pointerId);

    if (position === undefined) {
      position = this.#freePointerPositions.pop() ?? new Vector2();
      this.#pointerPositions.set(event.pointerId, position);
    }

    position.set(event.pageX, event.pageY);
  }

  #secondPointerPosition(event: TouchPoint): Vector2 {
    const pointerId =
      event.pointerId === this.#pointers[0]
        ? this.#pointers[1]
        : this.#pointers[0];

    const position = this.#pointerPositions.get(pointerId ?? -1);
    if (position !== undefined) return position;
    // A mouse pointer shares the gesture but has no tracked touch position.
    return this.#untrackedPosition.set(event.pageX, event.pageY);
  }

  // Wheel deltas normalized as three.js `_customWheelEvent`, without allocating.
  #wheelDeltaY(event: WheelEvent): number {
    let deltaY = event.deltaY;

    switch (event.deltaMode) {
      case 1: // LINE_MODE
        deltaY *= 16;
        break;

      case 2: // PAGE_MODE
        deltaY *= 100;
        break;
    }

    // detect if event was triggered by pinching
    if (event.ctrlKey && !this.#controlActive) {
      deltaY *= 10;
    }

    return deltaY;
  }

  #handlePointerDown(event: PointerEvent): void {
    if (this.enabled === false) return;
    const element = this.domElement;
    if (element === undefined) return;

    if (this.#pointers.length === 0) {
      element.setPointerCapture?.(event.pointerId);

      const pointerTarget = this.#pointerTarget(element);
      pointerTarget.addEventListener("pointermove", this.#onPointerMove);
      pointerTarget.addEventListener("pointerup", this.#onPointerUp);
    }

    if (this.#pointers.includes(event.pointerId)) return;

    this.#pointers.push(event.pointerId);

    if (event.pointerType === "touch") {
      this.#onTouchStart(event);
    } else {
      this.#onMouseDown(event);
    }

    if (this.#cursorStyle === "grab" && element.style) {
      element.style.cursor = "grabbing";
    }
  }

  #handlePointerMove(event: PointerEvent): void {
    if (this.enabled === false) return;

    if (event.pointerType === "touch") {
      this.#onTouchMove(event);
    } else {
      this.#onMouseMove(event);
    }
  }

  #handlePointerUp(event: PointerEvent): void {
    this.#removePointer(event.pointerId);
    const element = this.domElement;

    switch (this.#pointers.length) {
      case 0: {
        if (element === undefined) break;
        element.releasePointerCapture?.(event.pointerId);

        const pointerTarget = this.#pointerTarget(element);
        pointerTarget.removeEventListener("pointermove", this.#onPointerMove);
        pointerTarget.removeEventListener("pointerup", this.#onPointerUp);

        this.dispatchEvent(_endEvent);

        this.state = STATE.NONE;

        if (this.#cursorStyle === "grab" && element.style) {
          element.style.cursor = "grab";
        }

        break;
      }

      case 1: {
        const pointerId = this.#pointers[0] ?? -1;
        const position = this.#pointerPositions.get(pointerId);
        if (position === undefined) break;

        // minimal placeholder event - allows state correction on pointer-up
        const placeholder = this.#touchPlaceholder;
        placeholder.pointerId = pointerId;
        placeholder.pageX = position.x;
        placeholder.pageY = position.y;
        this.#onTouchStart(placeholder);

        break;
      }
    }
  }

  #onMouseDown(event: PointerEvent): void {
    let mouseAction: number | undefined;

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
        mouseAction = -1;
    }

    const modified = event.ctrlKey || event.metaKey || event.shiftKey;

    switch (mouseAction) {
      case MOUSE.DOLLY:
        if (this.enableZoom === false) return;

        this.#handleMouseDownDolly(event);

        this.state = STATE.DOLLY;

        break;

      case MOUSE.ROTATE:
        if (modified) {
          if (this.enablePan === false) return;

          this.handleMouseDownPan(event);

          this.state = STATE.PAN;
        } else {
          if (this.enableRotate === false) return;

          this.#handleMouseDownRotate(event);

          this.state = STATE.ROTATE;
        }

        break;

      case MOUSE.PAN:
        if (modified) {
          if (this.enableRotate === false) return;

          this.#handleMouseDownRotate(event);

          this.state = STATE.ROTATE;
        } else {
          if (this.enablePan === false) return;

          this.handleMouseDownPan(event);

          this.state = STATE.PAN;
        }

        break;

      default:
        this.state = STATE.NONE;
    }

    if (this.state !== STATE.NONE) {
      this.dispatchEvent(_startEvent);
    }
  }

  #onMouseMove(event: PointerEvent): void {
    switch (this.state) {
      case STATE.ROTATE:
        if (this.enableRotate === false) return;

        this.#handleMouseMoveRotate(event);

        break;

      case STATE.DOLLY:
        if (this.enableZoom === false) return;

        this.#handleMouseMoveDolly(event);

        break;

      case STATE.PAN:
        if (this.enablePan === false) return;

        this.handleMouseMovePan(event);

        break;
    }
  }

  #handleWheel(event: WheelEvent): void {
    if (
      this.enabled === false ||
      this.enableZoom === false ||
      this.state !== STATE.NONE
    )
      return;

    event.preventDefault();

    this.dispatchEvent(_startEvent);

    this.#handleMouseWheel(
      event.clientX,
      event.clientY,
      this.#wheelDeltaY(event),
    );

    this.dispatchEvent(_endEvent);
  }

  #onTouchStart(event: TouchPoint): void {
    this.#trackPointer(event);

    switch (this.#pointers.length) {
      case 1:
        switch (this.touches.ONE) {
          case TOUCH.ROTATE:
            if (this.enableRotate === false) return;

            this.#handleTouchStartRotate(event);

            this.state = STATE.TOUCH_ROTATE;

            break;

          case TOUCH.PAN:
            if (this.enablePan === false) return;

            this.#handleTouchStartPan(event);

            this.state = STATE.TOUCH_PAN;

            break;

          default:
            this.state = STATE.NONE;
        }

        break;

      case 2:
        switch (this.touches.TWO) {
          case TOUCH.DOLLY_PAN:
            if (this.enableZoom === false && this.enablePan === false) return;

            if (this.enableZoom) this.#handleTouchStartDolly(event);
            if (this.enablePan) this.#handleTouchStartPan(event);

            this.state = STATE.TOUCH_DOLLY_PAN;

            break;

          case TOUCH.DOLLY_ROTATE:
            if (this.enableZoom === false && this.enableRotate === false)
              return;

            if (this.enableZoom) this.#handleTouchStartDolly(event);
            if (this.enableRotate) this.#handleTouchStartRotate(event);

            this.state = STATE.TOUCH_DOLLY_ROTATE;

            break;

          default:
            this.state = STATE.NONE;
        }

        break;

      default:
        this.state = STATE.NONE;
    }

    if (this.state !== STATE.NONE) {
      this.dispatchEvent(_startEvent);
    }
  }

  #onTouchMove(event: TouchPoint): void {
    this.#trackPointer(event);

    switch (this.state) {
      case STATE.TOUCH_ROTATE:
        if (this.enableRotate === false) return;

        this.#handleTouchMoveRotate(event);

        this.update();

        break;

      case STATE.TOUCH_PAN:
        if (this.enablePan === false) return;

        this.#handleTouchMovePan(event);

        this.update();

        break;

      case STATE.TOUCH_DOLLY_PAN:
        if (this.enableZoom === false && this.enablePan === false) return;

        if (this.enableZoom) this.#handleTouchMoveDolly(event);
        if (this.enablePan) this.#handleTouchMovePan(event);

        this.update();

        break;

      case STATE.TOUCH_DOLLY_ROTATE:
        if (this.enableZoom === false && this.enableRotate === false) return;

        if (this.enableZoom) this.#handleTouchMoveDolly(event);
        if (this.enableRotate) this.#handleTouchMoveRotate(event);

        this.update();

        break;

      default:
        this.state = STATE.NONE;
    }
  }
}
