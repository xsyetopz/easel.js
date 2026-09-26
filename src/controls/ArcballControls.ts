import { OrthographicCamera } from "../cameras/OrthographicCamera.ts";
import { PerspectiveCamera } from "../cameras/PerspectiveCamera.ts";
import type { Node } from "../core/Node.ts";
import { Raycaster } from "../core/Raycaster.ts";
import { EllipseCurve } from "../curves/curves/EllipseCurve.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { GridHelper } from "../helpers/GridHelper.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import { Box3 } from "../math/Box3.ts";
import { clamp, DEG2RAD, RAD2DEG } from "../math/MathUtils.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Quaternion } from "../math/Quaternion.ts";
import { Vector2 } from "../math/Vector2.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Group } from "../objects/Group.ts";
import { Line } from "../objects/Line.ts";
import {
  type ControlDomElement,
  type ControlEvent,
  controlWindow,
  now,
} from "./ControlDom.ts";
import { Controls } from "./Controls.ts";

/** Camera types that {@link ArcballControls} can drive. */
export type ArcballCamera = PerspectiveCamera | OrthographicCamera;

/** Operations that a mouse button or the wheel can trigger. */
export type ArcballOperation = "PAN" | "ROTATE" | "ZOOM" | "FOV";

/** Mouse inputs: a button index (0, 1, 2) or `"WHEEL"` for wheel notches. */
export type ArcballMouseInput = 0 | 1 | 2 | "WHEEL";

/** Keyboard modifiers that can qualify a mouse action. */
export type ArcballModifierKey = "CTRL" | "SHIFT";

/** One entry of {@link ArcballControls.mouseActions}. */
export interface MouseAction {
  /** Operation performed by this binding. */
  operation: ArcballOperation;
  /** Mouse button index or `"WHEEL"`. */
  mouse: ArcballMouseInput;
  /** Required keyboard modifier, or `undefined` when none is needed. */
  key: ArcballModifierKey | undefined;
  /** Internal interaction state entered by this binding. */
  state: number;
}

/** Camera and gizmo transformations produced by one operation. */
interface Transformation {
  camera: Matrix4 | undefined;
  gizmos: Matrix4 | undefined;
}

/** Pointer and wheel fields read by the arcball handlers. */
type ArcballEvent = ControlEvent;

/** Window fields read by the arcball controls. */
type ArcballWindow = EventTarget & { devicePixelRatio?: number };

/** Animation-frame scheduler surface, as browsers expose on `window`. */
type FrameHost = {
  requestAnimationFrame?: (callback: (time: number) => void) => number;
  cancelAnimationFrame?: (handle: number) => void;
};

// trackball state
const STATE = {
  IDLE: 0,
  ROTATE: 1,
  PAN: 2,
  SCALE: 3,
  FOV: 4,
  FOCUS: 5,
  ZROTATE: 6,
  TOUCH_MULTI: 7,
  ANIMATION_FOCUS: 8,
  ANIMATION_ROTATE: 9,
} as const;

const INPUT = {
  NONE: 0,
  ONE_FINGER: 1,
  ONE_FINGER_SWITCHED: 2,
  TWO_FINGER: 3,
  MULT_FINGER: 4,
  CURSOR: 5,
} as const;

const OPERATION_STATE: Record<ArcballOperation, number> = {
  PAN: STATE.PAN,
  ROTATE: STATE.ROTATE,
  ZOOM: STATE.SCALE,
  FOV: STATE.FOV,
};

const _changeEvent = { type: "change" };
const _startEvent = { type: "start" };
const _endEvent = { type: "end" };

const _raycaster = new Raycaster();
const _offset = new Vector3();

const _gizmoMatrixStateTemp = new Matrix4();
const _cameraMatrixStateTemp = new Matrix4();
const _scalePointTemp = new Vector3();
const _scaleAmount = new Vector3();
const _movement = new Vector3();
const _gizmoBox = new Box3();
const _childBox = new Box3();
const _sphereCenter = new Vector3();
const _sphereSize = new Vector3();
const _gizmoMatrixTemp = new Matrix4();

const _EPS = 0.000001;

/** Line segments per gizmo circle; kept low so the CPU line pass stays cheap. */
const _CURVE_POINTS = 32;

/** Discrete transparency for idle gizmos (three.js opacity 0.6). */
const _GIZMO_IDLE_TRANSPARENCY = 3;

const _activeOptions = { passive: false };

function frameHost(): FrameHost {
  return globalThis as unknown as FrameHost;
}

/**
 * Arcball controls move the camera with a virtual trackball, with full touch
 * support and advanced navigation.
 *
 * Mirrors three.js r186 `ArcballControls`. Cursor and finger movements map
 * onto a virtual trackball surface, shown by the gizmos, so dragging orbits
 * the camera around the trackball center in a conservative way: returning to
 * the starting point restores the starting orientation.
 *
 * With the default {@link ArcballControls.mouseActions}:
 * - Rotate: left mouse; one-finger drag; two-finger twist rotates about the
 *   view direction.
 * - Pan: right mouse or ctrl/meta + left mouse; two-finger drag.
 * - Zoom: middle mouse drag or wheel; two-finger pinch.
 * - FOV (perspective only): shift + middle mouse drag or shift + wheel;
 *   three-finger vertical drag.
 * - Focus: double click or double tap on a mesh in `scene`.
 *
 * Unlike orbit controls, `update()` does not need to run every frame: focus
 * and rotation inertia animate through `requestAnimationFrame`. Without
 * `requestAnimationFrame`, those operations complete immediately instead.
 *
 * Dispatches `change` when the camera or gizmos change, `start` when an
 * interaction begins, and `end` when it ends.
 */
export class ArcballControls extends Controls<ArcballCamera> {
  /** Scene rendered by the camera; without one, gizmos, the grid, and focus are unavailable. */
  scene: Node | undefined;

  /** The controls' focus point, and the trackball center after `update()`. */
  target: Vector3 = new Vector3();

  /** Gizmo size relative to the smaller half of the view frustum. */
  radiusFactor = 0.67;

  /**
   * Mouse bindings, maintained by {@link ArcballControls.setMouseAction} and
   * {@link ArcballControls.unsetMouseAction}.
   */
  mouseActions: MouseAction[] = [];

  /** Duration of focus animations in milliseconds. */
  focusAnimationTime = 500;

  /**
   * Adjusts perspective near and far on zoom so the initially visible depth
   * range is kept. Configure the camera before constructing the controls, or
   * call {@link ArcballControls.setCamera} afterward.
   */
  adjustNearFar = false;

  /** Scaling factor for one zoom step. */
  scaleFactor = 1.1;

  /** Angular deceleration of the rotation inertia when `enableAnimations` is true. */
  dampingFactor = 25;

  /** Maximum angular velocity when rotation inertia starts. */
  wMax = 20;

  /** Enables rotation inertia and the focus animation. */
  enableAnimations = true;

  /** Shows a grid while panning with a mouse. */
  enableGrid = false;

  /** Zooms toward the cursor instead of the trackball center. */
  cursorZoom = false;

  /** Minimum field of view in degrees. */
  minFov = 5;

  /** Maximum field of view in degrees. */
  maxFov = 90;

  /** Rotation speed multiplier. */
  rotateSpeed = 1;

  /** Enables panning. */
  enablePan = true;

  /** Enables rotation. */
  enableRotate = true;

  /** Enables zoom and FOV changes. */
  enableZoom = true;

  /** Enables gizmos; declared for three.js parity, which never reads it. */
  enableGizmos = true;

  /** Enables focusing on double click or double tap. */
  enableFocus = true;

  /** Minimum camera distance from the trackball center; perspective only. */
  minDistance = 0;

  /** Maximum camera distance from the trackball center; perspective only. */
  maxDistance = Number.POSITIVE_INFINITY;

  /** Minimum zoom; orthographic only. */
  minZoom = 0;

  /** Maximum zoom; orthographic only. */
  maxZoom = Number.POSITIVE_INFINITY;

  readonly #currentTarget = new Vector3();
  #mouseOp: ArcballOperation | undefined = undefined;

  // scratch objects reused by every operation
  readonly #v2_1 = new Vector2();
  readonly #v3_1 = new Vector3();
  readonly #v3_2 = new Vector3();
  readonly #m4_1 = new Matrix4();
  readonly #m4_2 = new Matrix4();
  readonly #quat = new Quaternion();
  readonly #surfacePoint = new Vector3();
  readonly #planePoint = new Vector3();
  readonly #rotationPoint = new Vector3();

  // transformation matrices
  readonly #translationMatrix = new Matrix4();
  readonly #rotationMatrix = new Matrix4();
  readonly #scaleMatrix = new Matrix4();
  readonly #rotationAxis = new Vector3();

  // transformations produced by an operation for the camera and gizmos
  readonly #cameraTransform = new Matrix4();
  readonly #gizmoTransform = new Matrix4();
  readonly #transformation: Transformation = {
    camera: undefined,
    gizmos: undefined,
  };

  // camera state
  readonly #cameraMatrixState = new Matrix4();
  #fovState = 1;
  readonly #upState = new Vector3();
  #zoomState = 1;
  #nearPos = 0;
  #farPos = 0;
  readonly #gizmoMatrixState = new Matrix4();

  // initial values
  readonly #up0 = new Vector3();
  #zoom0 = 1;
  #fov0 = 0;
  #initialNear = 0;
  #nearPos0 = 0;
  #initialFar = 0;
  #farPos0 = 0;
  readonly #cameraMatrixState0 = new Matrix4();
  readonly #gizmoMatrixState0 = new Matrix4();
  readonly #target0 = new Vector3();

  // pointers
  #button = -1;
  readonly #touchStart: ArcballEvent[] = [];
  readonly #touchCurrent: ArcballEvent[] = [];
  #input: number = INPUT.NONE;

  // two-finger interaction
  readonly #switchSensibility = 32;
  #startFingerDistance = 0;
  #currentFingerDistance = 0;
  #startFingerRotation = 0;
  #currentFingerRotation = 0;

  // double tap
  #devPxRatio = 0;
  #downValid = true;
  #nclicks = 0;
  readonly #downEvents: ArcballEvent[] = [];
  #clickStart = 0;
  readonly #maxDownTime = 250;
  readonly #maxInterval = 300;
  readonly #posThreshold = 24;
  readonly #movementThreshold = 24;

  // cursor
  readonly #center = { x: 0, y: 0 };
  readonly #currentCursorPosition = new Vector3();
  readonly #startCursorPosition = new Vector3();

  // grid
  #grid: GridHelper | undefined = undefined;
  readonly #gridPosition = new Vector3();

  // gizmos
  readonly #gizmos = new Group();

  // animations
  #timeStart = -1;
  #animationId = -1;
  readonly #focusPoint = new Vector3();
  readonly #focusGizmoMatrix = new Matrix4();
  readonly #animationAxis = new Vector3();
  #animationW = 0;

  // rotate animation
  #timePrev = 0;
  #timeCurrent = 0;
  #anglePrev = 0;
  #angleCurrent = 0;
  readonly #cursorPosPrev = new Vector3();
  readonly #cursorPosCurr = new Vector3();
  #wPrev = 0;
  #wCurr = 0;

  #tbRadius = 1;
  #state: number = STATE.IDLE;
  #window: ArcballWindow | undefined = undefined;

  /**
   * Creates arcball controls for `camera`.
   *
   * @param camera The camera to control. It must not be a child of another
   *   object, unless that object is the scene itself.
   * @param domElement Element that receives pointer and wheel listeners.
   * @param scene Scene rendered by the camera; without it, gizmos cannot be shown.
   */
  constructor(
    camera: ArcballCamera,
    domElement?: ControlDomElement,
    scene?: Node,
  ) {
    super(camera, domElement);
    this.scene = scene;

    this.setCamera(camera);
    this.scene?.add(this.#gizmos);

    this.#initializeMouseActions();

    if (domElement !== undefined) this.connect(domElement);
  }

  /** Raycaster used for focus picking; shared by all arcball controls. */
  get raycaster(): Raycaster {
    return _raycaster;
  }

  /** Attaches pointer, wheel, and context-menu listeners to `element` and a resize listener to the window. */
  override connect(element: ControlDomElement): void {
    super.connect(element);
    const view = controlWindow() as ArcballWindow | undefined;
    this.#window = view;
    this.#devPxRatio = view?.devicePixelRatio ?? 1;

    element.addEventListener("contextmenu", this.#onContextMenu);
    element.addEventListener("wheel", this.#onWheel, _activeOptions);
    element.addEventListener("pointerdown", this.#onPointerDown);
    element.addEventListener("pointercancel", this.#onPointerCancel);

    view?.addEventListener("resize", this.#onWindowResize);

    if (element.style) element.style.touchAction = "none"; // Disable touch scroll
  }

  /** Removes every listener installed by `connect()`. */
  override disconnect(): void {
    const element = this.domElement;
    if (element !== undefined) {
      element.removeEventListener("pointerdown", this.#onPointerDown);
      element.removeEventListener("pointercancel", this.#onPointerCancel);
      element.removeEventListener("wheel", this.#onWheel);
      element.removeEventListener("contextmenu", this.#onContextMenu);
    }

    const pointerTarget = this.#pointerTarget();
    pointerTarget?.removeEventListener("pointermove", this.#onPointerMove);
    pointerTarget?.removeEventListener("pointerup", this.#onPointerUp);

    this.#window?.removeEventListener("resize", this.#onWindowResize);

    if (element?.style) element.style.touchAction = ""; // Restore touch scroll
  }

  /**
   * Adds a mouse binding, replacing any binding with the same mouse input and
   * modifier.
   *
   * @param operation Operation to perform.
   * @param mouse Mouse button (0, 1, 2) or `"WHEEL"`; the wheel accepts only
   *   `"ZOOM"` and `"FOV"`.
   * @param key Required modifier, or `undefined` for none.
   * @returns `true` when the binding was added, `false` for invalid input.
   */
  setMouseAction(
    operation: ArcballOperation,
    mouse: ArcballMouseInput,
    key?: ArcballModifierKey,
  ): boolean {
    const state = Object.hasOwn(OPERATION_STATE, operation)
      ? OPERATION_STATE[operation]
      : undefined;
    if (
      state === undefined ||
      !(mouse === 0 || mouse === 1 || mouse === 2 || mouse === "WHEEL") ||
      !(key === undefined || key === "CTRL" || key === "SHIFT")
    ) {
      // invalid parameters
      return false;
    }

    if (mouse === "WHEEL" && operation !== "ZOOM" && operation !== "FOV") {
      // cannot associate 2D operation to 1D input
      return false;
    }

    const action: MouseAction = { operation, mouse, key, state };

    for (let i = 0; i < this.mouseActions.length; i++) {
      const existing = this.mouseActions[i];
      if (existing.mouse === action.mouse && existing.key === action.key) {
        this.mouseActions.splice(i, 1, action);
        return true;
      }
    }

    this.mouseActions.push(action);
    return true;
  }

  /**
   * Removes the mouse binding for a mouse input and modifier.
   *
   * @param mouse Mouse button (0, 1, 2) or `"WHEEL"`.
   * @param key Modifier of the binding, or `undefined` for none.
   * @returns `true` when a binding was removed.
   */
  unsetMouseAction(
    mouse: ArcballMouseInput,
    key?: ArcballModifierKey,
  ): boolean {
    for (let i = 0; i < this.mouseActions.length; i++) {
      const action = this.mouseActions[i];
      if (action.mouse === mouse && action.key === key) {
        this.mouseActions.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  /** Cancels animations, disconnects, and removes the gizmos and grid from the scene. */
  override dispose(): void {
    if (this.#animationId !== -1) this.#cancelFrame(this.#animationId);

    this.disconnect();

    this.scene?.remove(this.#gizmos);
    this.disposeGrid();
  }

  /** Removes the pan grid from the scene. */
  disposeGrid(): void {
    if (this.#grid !== undefined && this.scene !== undefined) {
      this.scene.remove(this.#grid);
      this.#grid = undefined;
    }
  }

  /**
   * Makes the rotation gizmos more or less visible.
   *
   * @param isActive When true, the gizmos are drawn opaque.
   */
  activateGizmos(isActive: boolean): void {
    const transparency = isActive ? 0 : _GIZMO_IDLE_TRANSPARENCY;
    for (let i = 0; i < 3; i++) {
      const material = (this.#gizmos.children[i] as Line | undefined)?.material;
      if (material !== undefined) material.opacity = transparency;
    }
  }

  /**
   * Sets the camera to control. Call it whenever the camera changes, or after
   * reconfiguring the camera's initial position, near, or far.
   *
   * @param camera The camera to control.
   */
  setCamera(camera: ArcballCamera): void {
    camera.updateMatrixWorld(true, false);
    camera.lookAt(this.target);
    camera.updateMatrix();

    // setting state
    if (camera instanceof PerspectiveCamera) {
      this.#fov0 = camera.fov;
      this.#fovState = camera.fov;
    }

    this.#cameraMatrixState0.copy(camera.matrix);
    this.#cameraMatrixState.copy(this.#cameraMatrixState0);
    this.#zoom0 = camera.zoom;
    this.#zoomState = this.#zoom0;

    this.#initialNear = camera.near;
    this.#nearPos0 = camera.position.distanceTo(this.target) - camera.near;
    this.#nearPos = this.#initialNear;

    this.#initialFar = camera.far;
    this.#farPos0 = camera.position.distanceTo(this.target) - camera.far;
    this.#farPos = this.#initialFar;

    this.#up0.copy(camera.up);
    this.#upState.copy(camera.up);

    this.object = camera;
    this.object.updateProjectionMatrix();

    // making gizmos
    this.#tbRadius = this.#calculateTbRadius(camera);
    this.#makeGizmos(this.target, this.#tbRadius);
  }

  /**
   * Shows or hides the gizmos.
   *
   * @param value Gizmo visibility.
   */
  setGizmosVisible(value: boolean): void {
    this.#gizmos.visible = value;
    this.dispatchEvent(_changeEvent);
  }

  /**
   * Sets {@link ArcballControls.radiusFactor} and redraws the gizmos.
   *
   * @param value New radius factor.
   */
  setTbRadius(value: number): void {
    this.radiusFactor = value;
    this.#tbRadius = this.#calculateTbRadius(this.object);
    this.#setGizmoGeometry(this.#tbRadius);
    this.dispatchEvent(_changeEvent);
  }

  /** Restores the state stored by `saveState()`, or the initial state. */
  reset(): void {
    const camera = this.object;
    this.target.copy(this.#target0);
    camera.zoom = this.#zoom0;

    if (camera instanceof PerspectiveCamera) camera.fov = this.#fov0;

    camera.near = this.#nearPos;
    camera.far = this.#farPos;
    this.#cameraMatrixState.copy(this.#cameraMatrixState0);
    this.#cameraMatrixState.decompose(
      camera.position,
      camera.quaternion,
      camera.scale,
    );
    camera.up.copy(this.#up0);

    camera.updateMatrix();
    camera.updateProjectionMatrix();

    this.#gizmoMatrixState.copy(this.#gizmoMatrixState0);
    this.#gizmoMatrixState0.decompose(
      this.#gizmos.position,
      this.#gizmos.quaternion,
      this.#gizmos.scale,
    );
    this.#gizmos.updateMatrix();

    this.#tbRadius = this.#calculateTbRadius(camera);
    this.#makeGizmos(this.#gizmos.position, this.#tbRadius);

    this.#lookAtGizmos();

    this.#updateTbState(STATE.IDLE, false);

    this.dispatchEvent(_changeEvent);
  }

  /**
   * Serializes the current state in the `copyState()` JSON format.
   *
   * `target` is written as an `[x, y, z]` array, the form that
   * {@link ArcballControls.setStateFromJSON} and three.js read back.
   */
  #stateJSON(): string {
    const camera = this.object;
    const up = camera.up;
    const state: Record<string, unknown> = { cameraFar: camera.far };
    if (camera instanceof PerspectiveCamera) state["cameraFov"] = camera.fov;
    state["cameraMatrix"] = { elements: Array.from(camera.matrix.elements) };
    state["cameraNear"] = camera.near;
    state["cameraUp"] = { x: up.x, y: up.y, z: up.z };
    state["cameraZoom"] = camera.zoom;
    state["gizmoMatrix"] = {
      elements: Array.from(this.#gizmos.matrix.elements),
    };
    state["target"] = [this.target.x, this.target.y, this.target.z];
    return JSON.stringify({ arcballState: state });
  }

  /**
   * Copies the current state to the clipboard as JSON text.
   *
   * @returns The clipboard write; rejects when no clipboard is available.
   */
  copyState(): Promise<void> {
    const clipboard = globalThis.navigator?.clipboard;
    if (clipboard === undefined) {
      return Promise.reject(
        new Error("ArcballControls.copyState requires navigator.clipboard."),
      );
    }
    return clipboard.writeText(this.#stateJSON());
  }

  /**
   * Restores the state from clipboard JSON written by `copyState()`.
   *
   * @returns Resolves once the state is applied; rejects when no clipboard is available.
   */
  pasteState(): Promise<void> {
    const clipboard = globalThis.navigator?.clipboard;
    if (clipboard === undefined) {
      return Promise.reject(
        new Error("ArcballControls.pasteState requires navigator.clipboard."),
      );
    }
    return clipboard.readText().then((value) => this.setStateFromJSON(value));
  }

  /** Saves the current state; `reset()` restores it. */
  saveState(): void {
    const camera = this.object;
    camera.updateMatrix();
    this.#gizmos.updateMatrix();

    this.#target0.copy(this.target);
    this.#cameraMatrixState0.copy(camera.matrix);
    this.#gizmoMatrixState0.copy(this.#gizmos.matrix);
    this.#nearPos = camera.near;
    this.#farPos = camera.far;
    this.#zoom0 = camera.zoom;
    this.#up0.copy(camera.up);

    if (camera instanceof PerspectiveCamera) this.#fov0 = camera.fov;
  }

  /**
   * Moves the trackball to a changed `target`, applies the distance, zoom, and
   * FOV limits, resizes the gizmos, and aims the camera at the trackball center.
   */
  override update(): void {
    const camera = this.object;
    if (!this.target.equals(this.#currentTarget)) {
      this.#gizmos.position.copy(this.target); // for correct radius calculation
      this.#tbRadius = this.#calculateTbRadius(camera);
      this.#makeGizmos(this.target, this.#tbRadius);
      this.#currentTarget.copy(this.target);
    }

    // check min/max parameters
    if (camera instanceof OrthographicCamera) {
      // check zoom
      if (camera.zoom > this.maxZoom || camera.zoom < this.minZoom) {
        const newZoom = clamp(camera.zoom, this.minZoom, this.maxZoom);
        this.#applyTransformMatrix(
          this.#scale(newZoom / camera.zoom, this.#gizmos.position, true),
        );
      }
    } else {
      // check distance
      const distance = camera.position.distanceTo(this.#gizmos.position);

      if (
        distance > this.maxDistance + _EPS ||
        distance < this.minDistance - _EPS
      ) {
        const newDistance = clamp(distance, this.minDistance, this.maxDistance);
        this.#applyTransformMatrix(
          this.#scale(newDistance / distance, this.#gizmos.position),
        );
        this.#updateMatrixState();
      }

      // check fov
      if (camera.fov < this.minFov || camera.fov > this.maxFov) {
        camera.fov = clamp(camera.fov, this.minFov, this.maxFov);
        camera.updateProjectionMatrix();
      }

      const oldRadius = this.#tbRadius;
      this.#tbRadius = this.#calculateTbRadius(camera);

      if (
        oldRadius < this.#tbRadius - _EPS ||
        oldRadius > this.#tbRadius + _EPS
      ) {
        const scale =
          (this.#gizmos.scale.x + this.#gizmos.scale.y + this.#gizmos.scale.z) /
          3;
        this.#setGizmoGeometry(this.#tbRadius / scale);
      }
    }

    this.#lookAtGizmos();
  }

  /**
   * Restores a state serialized by `copyState()`.
   *
   * @param json JSON text with an `arcballState` object. `target` may be an
   *   `[x, y, z]` array or an `{ x, y, z }` object.
   */
  setStateFromJSON(json: string): void {
    const state = JSON.parse(json) as {
      arcballState?: {
        target: number[] | { x: number; y: number; z: number };
        cameraMatrix: { elements: number[] };
        cameraUp: { x: number; y: number; z: number };
        cameraNear: number;
        cameraFar: number;
        cameraZoom: number;
        cameraFov?: number;
        gizmoMatrix: { elements: number[] };
      };
    };
    const arcball = state.arcballState;
    if (arcball === undefined) return;

    const camera = this.object;
    const target = arcball.target;
    if (Array.isArray(target)) this.target.fromArray(target);
    else this.target.set(target.x, target.y, target.z);

    this.#cameraMatrixState.fromArray(arcball.cameraMatrix.elements);
    this.#cameraMatrixState.decompose(
      camera.position,
      camera.quaternion,
      camera.scale,
    );

    camera.up.set(arcball.cameraUp.x, arcball.cameraUp.y, arcball.cameraUp.z);
    camera.near = arcball.cameraNear;
    camera.far = arcball.cameraFar;

    camera.zoom = arcball.cameraZoom;

    if (camera instanceof PerspectiveCamera && arcball.cameraFov !== undefined)
      camera.fov = arcball.cameraFov;

    this.#gizmoMatrixState.fromArray(arcball.gizmoMatrix.elements);
    this.#gizmoMatrixState.decompose(
      this.#gizmos.position,
      this.#gizmos.quaternion,
      this.#gizmos.scale,
    );

    camera.updateMatrix();
    camera.updateProjectionMatrix();

    this.#gizmos.updateMatrix();

    this.#tbRadius = this.#calculateTbRadius(camera);
    _gizmoMatrixTemp.copy(this.#gizmoMatrixState0);
    this.#makeGizmos(this.#gizmos.position, this.#tbRadius);
    this.#gizmoMatrixState0.copy(_gizmoMatrixTemp);

    this.#lookAtGizmos();
    this.#updateTbState(STATE.IDLE, false);

    this.dispatchEvent(_changeEvent);
  }

  // gestures

  #onSinglePanStart(event: ArcballEvent, operation: ArcballOperation): void {
    if (!this.enabled) return;

    this.dispatchEvent(_startEvent);

    this.#setCenter(event.clientX ?? 0, event.clientY ?? 0);

    switch (operation) {
      case "PAN":
        if (!this.enablePan) return;

        if (this.#animationId !== -1) {
          this.#stopAnimation();
          this.activateGizmos(false);
          this.dispatchEvent(_changeEvent);
        }

        this.#updateTbState(STATE.PAN, true);
        this.#startCursorPosition.copy(
          this.#unprojectOnTbPlane(this.#center.x, this.#center.y),
        );
        if (this.enableGrid) {
          this.#drawGrid();
          this.dispatchEvent(_changeEvent);
        }
        break;

      case "ROTATE":
        if (!this.enableRotate) return;

        if (this.#animationId !== -1) this.#stopAnimation();

        this.#updateTbState(STATE.ROTATE, true);
        this.#startCursorPosition.copy(
          this.#unprojectOnTbSurface(
            this.#center.x,
            this.#center.y,
            this.#tbRadius,
          ),
        );
        this.activateGizmos(true);
        if (this.enableAnimations) {
          this.#timePrev = this.#timeCurrent = now();
          this.#angleCurrent = this.#anglePrev = 0;
          this.#cursorPosPrev.copy(this.#startCursorPosition);
          this.#cursorPosCurr.copy(this.#cursorPosPrev);
          this.#wCurr = 0;
          this.#wPrev = this.#wCurr;
        }

        this.dispatchEvent(_changeEvent);
        break;

      case "FOV":
        if (!(this.object instanceof PerspectiveCamera) || !this.enableZoom)
          return;

        if (this.#animationId !== -1) {
          this.#stopAnimation();
          this.activateGizmos(false);
          this.dispatchEvent(_changeEvent);
        }

        this.#updateTbState(STATE.FOV, true);
        this.#startCursorPosition.y =
          this.#cursorNDC(this.#center.x, this.#center.y).y * 0.5;
        this.#currentCursorPosition.copy(this.#startCursorPosition);
        break;

      case "ZOOM":
        if (!this.enableZoom) return;

        if (this.#animationId !== -1) {
          this.#stopAnimation();
          this.activateGizmos(false);
          this.dispatchEvent(_changeEvent);
        }

        this.#updateTbState(STATE.SCALE, true);
        this.#startCursorPosition.y =
          this.#cursorNDC(this.#center.x, this.#center.y).y * 0.5;
        this.#currentCursorPosition.copy(this.#startCursorPosition);
        break;
    }
  }

  #onSinglePanMove(event: ArcballEvent, opState: number): void {
    if (!this.enabled) return;

    const restart = opState !== this.#state;
    this.#setCenter(event.clientX ?? 0, event.clientY ?? 0);

    switch (opState) {
      case STATE.PAN:
        if (this.enablePan) {
          if (restart) {
            // switch to pan operation
            this.dispatchEvent(_endEvent);
            this.dispatchEvent(_startEvent);

            this.#updateTbState(opState, true);
            this.#startCursorPosition.copy(
              this.#unprojectOnTbPlane(this.#center.x, this.#center.y),
            );
            if (this.enableGrid) this.#drawGrid();

            this.activateGizmos(false);
          } else {
            // continue with pan operation
            this.#currentCursorPosition.copy(
              this.#unprojectOnTbPlane(this.#center.x, this.#center.y),
            );
            this.#applyTransformMatrix(
              this.#pan(this.#startCursorPosition, this.#currentCursorPosition),
            );
          }
        }
        break;

      case STATE.ROTATE:
        if (this.enableRotate) {
          if (restart) {
            // switch to rotate operation
            this.dispatchEvent(_endEvent);
            this.dispatchEvent(_startEvent);

            this.#updateTbState(opState, true);
            this.#startCursorPosition.copy(
              this.#unprojectOnTbSurface(
                this.#center.x,
                this.#center.y,
                this.#tbRadius,
              ),
            );

            if (this.enableGrid) this.disposeGrid();

            this.activateGizmos(true);
          } else {
            // continue with rotate operation
            this.#currentCursorPosition.copy(
              this.#unprojectOnTbSurface(
                this.#center.x,
                this.#center.y,
                this.#tbRadius,
              ),
            );

            const distance = this.#startCursorPosition.distanceTo(
              this.#currentCursorPosition,
            );
            const angle = this.#startCursorPosition.angleTo(
              this.#currentCursorPosition,
            );
            const amount =
              Math.max(distance / this.#tbRadius, angle) * this.rotateSpeed; // effective rotation angle

            this.#applyTransformMatrix(
              this.#rotate(
                this.#calculateRotationAxis(
                  this.#startCursorPosition,
                  this.#currentCursorPosition,
                ),
                amount,
              ),
            );

            if (this.enableAnimations) {
              this.#timePrev = this.#timeCurrent;
              this.#timeCurrent = now();
              this.#anglePrev = this.#angleCurrent;
              this.#angleCurrent = amount;
              this.#cursorPosPrev.copy(this.#cursorPosCurr);
              this.#cursorPosCurr.copy(this.#currentCursorPosition);
              this.#wPrev = this.#wCurr;
              this.#wCurr = this.#calculateAngularSpeed(
                this.#anglePrev,
                this.#angleCurrent,
                this.#timePrev,
                this.#timeCurrent,
              );
            }
          }
        }
        break;

      case STATE.SCALE:
        if (this.enableZoom) {
          if (restart) {
            // switch to zoom operation
            this.dispatchEvent(_endEvent);
            this.dispatchEvent(_startEvent);

            this.#updateTbState(opState, true);
            this.#startCursorPosition.y =
              this.#cursorNDC(this.#center.x, this.#center.y).y * 0.5;
            this.#currentCursorPosition.copy(this.#startCursorPosition);

            if (this.enableGrid) this.disposeGrid();

            this.activateGizmos(false);
          } else {
            // continue with zoom operation
            this.#currentCursorPosition.y =
              this.#cursorNDC(this.#center.x, this.#center.y).y * 0.5;
            const size = this.#dragScale();

            this.#v3_1.setFromMatrixPosition(this.#gizmoMatrixState);

            this.#applyTransformMatrix(this.#scale(size, this.#v3_1));
          }
        }
        break;

      case STATE.FOV:
        if (this.enableZoom && this.object instanceof PerspectiveCamera) {
          if (restart) {
            // switch to fov operation
            this.dispatchEvent(_endEvent);
            this.dispatchEvent(_startEvent);

            this.#updateTbState(opState, true);
            this.#startCursorPosition.y =
              this.#cursorNDC(this.#center.x, this.#center.y).y * 0.5;
            this.#currentCursorPosition.copy(this.#startCursorPosition);

            if (this.enableGrid) this.disposeGrid();

            this.activateGizmos(false);
          } else {
            // continue with fov operation
            this.#currentCursorPosition.y =
              this.#cursorNDC(this.#center.x, this.#center.y).y * 0.5;
            this.#applyDragFov(this.#dragScale());
          }
        }
        break;
    }

    this.dispatchEvent(_changeEvent);
  }

  #onSinglePanEnd(): void {
    if (this.#state === STATE.ROTATE) {
      if (!this.enableRotate) return;

      if (this.enableAnimations && this.#canAnimate()) {
        // perform rotation animation
        const deltaTime = now() - this.#timeCurrent;
        if (deltaTime < 120) {
          this.#animationW = Math.abs((this.#wPrev + this.#wCurr) / 2);
          this.#animationId = this.#requestFrame(this.#onRotationAnimStart);
        } else {
          // cursor has been standing still for over 120 ms since last movement
          this.#updateTbState(STATE.IDLE, false);
          this.activateGizmos(false);
          this.dispatchEvent(_changeEvent);
        }
      } else {
        this.#updateTbState(STATE.IDLE, false);
        this.activateGizmos(false);
        this.dispatchEvent(_changeEvent);
      }
    } else if (this.#state === STATE.PAN || this.#state === STATE.IDLE) {
      this.#updateTbState(STATE.IDLE, false);

      if (this.enableGrid) this.disposeGrid();

      this.activateGizmos(false);
      this.dispatchEvent(_changeEvent);
    }

    this.dispatchEvent(_endEvent);
  }

  #onDoubleTap(event: ArcballEvent): void {
    if (
      this.enabled &&
      this.enablePan &&
      this.enableFocus &&
      this.scene !== undefined
    ) {
      this.dispatchEvent(_startEvent);

      this.#setCenter(event.clientX ?? 0, event.clientY ?? 0);
      const hit = this.#unprojectOnObj(
        this.#cursorNDC(this.#center.x, this.#center.y),
      );

      if (hit && this.enableAnimations && this.#canAnimate()) {
        if (this.#animationId !== -1) this.#cancelFrame(this.#animationId);

        this.#timeStart = -1;
        this.#animationId = this.#requestFrame(this.#onFocusAnimStart);
      } else if (hit) {
        this.#updateTbState(STATE.FOCUS, true);
        this.#focus(this.#focusPoint, this.scaleFactor);
        this.#updateTbState(STATE.IDLE, false);
        this.dispatchEvent(_changeEvent);
      }
    }

    this.dispatchEvent(_endEvent);
  }

  #onDoublePanStart(): void {
    if (!(this.enabled && this.enablePan)) return;

    this.dispatchEvent(_startEvent);

    this.#updateTbState(STATE.PAN, true);

    this.#setTouchCenter();
    this.#startCursorPosition.copy(
      this.#unprojectOnTbPlane(this.#center.x, this.#center.y, true),
    );
    this.#currentCursorPosition.copy(this.#startCursorPosition);

    this.activateGizmos(false);
  }

  #onDoublePanMove(): void {
    if (!(this.enabled && this.enablePan)) return;

    this.#setTouchCenter();

    if (this.#state !== STATE.PAN) {
      this.#updateTbState(STATE.PAN, true);
      this.#startCursorPosition.copy(this.#currentCursorPosition);
    }

    this.#currentCursorPosition.copy(
      this.#unprojectOnTbPlane(this.#center.x, this.#center.y, true),
    );
    this.#applyTransformMatrix(
      this.#pan(this.#startCursorPosition, this.#currentCursorPosition, true),
    );
    this.dispatchEvent(_changeEvent);
  }

  #onDoublePanEnd(): void {
    this.#updateTbState(STATE.IDLE, false);
    this.dispatchEvent(_endEvent);
  }

  #onRotateStart(): void {
    if (!(this.enabled && this.enableRotate)) return;

    this.dispatchEvent(_startEvent);

    this.#updateTbState(STATE.ZROTATE, true);

    this.#startFingerRotation =
      this.#getAngle(this.#touchCurrent[1], this.#touchCurrent[0]) +
      this.#getAngle(this.#touchStart[1], this.#touchStart[0]);
    this.#currentFingerRotation = this.#startFingerRotation;

    this.object.updateMatrixWorld(true, false);
    this.object.getWorldDirection(this.#rotationAxis); // rotation axis

    if (!this.enablePan && !this.enableZoom) this.activateGizmos(true);
  }

  #onRotateMove(): void {
    if (!(this.enabled && this.enableRotate)) return;

    this.#setTouchCenter();
    let rotationPoint: Vector3;

    if (this.#state !== STATE.ZROTATE) {
      this.#updateTbState(STATE.ZROTATE, true);
      this.#startFingerRotation = this.#currentFingerRotation;
    }

    this.#currentFingerRotation =
      this.#getAngle(this.#touchCurrent[1], this.#touchCurrent[0]) +
      this.#getAngle(this.#touchStart[1], this.#touchStart[0]);

    if (!this.enablePan) {
      rotationPoint = this.#rotationPoint.setFromMatrixPosition(
        this.#gizmoMatrixState,
      );
    } else {
      this.#v3_2.setFromMatrixPosition(this.#gizmoMatrixState);
      rotationPoint = this.#rotationPoint
        .copy(this.#unprojectOnTbPlane(this.#center.x, this.#center.y))
        .applyQuaternion(this.object.quaternion)
        .multiplyScalar(1 / this.object.zoom)
        .add(this.#v3_2);
    }

    const amount =
      DEG2RAD * (this.#startFingerRotation - this.#currentFingerRotation);

    this.#applyTransformMatrix(this.#zRotate(rotationPoint, amount));
    this.dispatchEvent(_changeEvent);
  }

  #onRotateEnd(): void {
    this.#updateTbState(STATE.IDLE, false);
    this.activateGizmos(false);
    this.dispatchEvent(_endEvent);
  }

  #onPinchStart(): void {
    if (!(this.enabled && this.enableZoom)) return;

    this.dispatchEvent(_startEvent);
    this.#updateTbState(STATE.SCALE, true);

    this.#startFingerDistance = this.#calculatePointersDistance(
      this.#touchCurrent[0],
      this.#touchCurrent[1],
    );
    this.#currentFingerDistance = this.#startFingerDistance;

    this.activateGizmos(false);
  }

  #onPinchMove(): void {
    if (!(this.enabled && this.enableZoom)) return;

    this.#setTouchCenter();
    const minDistance = 12; // minimum distance between fingers (in css pixels)

    if (this.#state !== STATE.SCALE) {
      this.#startFingerDistance = this.#currentFingerDistance;
      this.#updateTbState(STATE.SCALE, true);
    }

    this.#currentFingerDistance = Math.max(
      this.#calculatePointersDistance(
        this.#touchCurrent[0],
        this.#touchCurrent[1],
      ),
      minDistance * this.#devPxRatio,
    );
    const amount = this.#currentFingerDistance / this.#startFingerDistance;

    let scalePoint: Vector3;

    if (!this.enablePan) {
      scalePoint = this.#gizmos.position;
    } else {
      scalePoint = this.#cursorScalePoint(this.#center.x, this.#center.y);
    }

    this.#applyTransformMatrix(this.#scale(amount, scalePoint));
    this.dispatchEvent(_changeEvent);
  }

  #onPinchEnd(): void {
    this.#updateTbState(STATE.IDLE, false);
    this.dispatchEvent(_endEvent);
  }

  #onTriplePanStart(): void {
    if (!(this.enabled && this.enableZoom)) return;

    this.dispatchEvent(_startEvent);

    this.#updateTbState(STATE.SCALE, true);

    this.#setFingersCenter();

    this.#startCursorPosition.y =
      this.#cursorNDC(this.#center.x, this.#center.y).y * 0.5;
    this.#currentCursorPosition.copy(this.#startCursorPosition);
  }

  #onTriplePanMove(): void {
    if (!(this.enabled && this.enableZoom)) return;

    this.#setFingersCenter();

    this.#currentCursorPosition.y =
      this.#cursorNDC(this.#center.x, this.#center.y).y * 0.5;
    this.#applyDragFov(this.#dragScale());

    this.dispatchEvent(_changeEvent);
  }

  #onTriplePanEnd(): void {
    this.#updateTbState(STATE.IDLE, false);
    this.dispatchEvent(_endEvent);
  }

  /** Zoom size for a vertical drag; 8 wheel notches span the full screen. */
  #dragScale(): number {
    const screenNotches = 8;
    const movement =
      this.#currentCursorPosition.y - this.#startCursorPosition.y;

    if (movement < 0)
      return 1 / this.scaleFactor ** (-movement * screenNotches);
    if (movement > 0) return this.scaleFactor ** (movement * screenNotches);
    return 1;
  }

  /** Vertigo effect: changes the FOV while dollying so the target keeps its size. */
  #applyDragFov(dragSize: number): void {
    //   fov / 2
    //     |\
    //     | \
    //   x |  \
    //     |   \
    //     |____\
    //        y
    this.#v3_1.setFromMatrixPosition(this.#cameraMatrixState);
    const x = this.#v3_1.distanceTo(this.#gizmos.position);
    let xNew = x / dragSize; // distance between camera and gizmos if scale(size, scalepoint) would be performed

    // check min and max distance
    xNew = clamp(xNew, this.minDistance, this.maxDistance);

    const y = x * Math.tan(DEG2RAD * this.#fovState * 0.5);

    // calculate new fov
    let newFov = RAD2DEG * (Math.atan(y / xNew) * 2);

    // check min and max fov
    newFov = clamp(newFov, this.minFov, this.maxFov);

    const newDistance = y / Math.tan(DEG2RAD * (newFov / 2));
    const size = x / newDistance;
    this.#v3_2.setFromMatrixPosition(this.#gizmoMatrixState);

    this.#setFov(newFov);
    this.#applyTransformMatrix(this.#scale(size, this.#v3_2, false));
  }

  #setCenter(clientX: number, clientY: number): void {
    this.#center.x = clientX;
    this.#center.y = clientY;
  }

  #setTouchCenter(): void {
    const a = this.#touchCurrent[0];
    const b = this.#touchCurrent[1];
    this.#setCenter(
      ((a.clientX ?? 0) + (b.clientX ?? 0)) / 2,
      ((a.clientY ?? 0) + (b.clientY ?? 0)) / 2,
    );
  }

  #setFingersCenter(): void {
    let clientX = 0;
    let clientY = 0;
    const nFingers = this.#touchCurrent.length;

    for (let i = 0; i < nFingers; i++) {
      clientX += this.#touchCurrent[i].clientX ?? 0;
      clientY += this.#touchCurrent[i].clientY ?? 0;
    }

    this.#setCenter(clientX / nFingers, clientY / nFingers);
  }

  /** Point under the cursor on the trackball plane, in world space. */
  #cursorScalePoint(cursorX: number, cursorY: number): Vector3 {
    const point = this.#unprojectOnTbPlane(cursorX, cursorY).applyQuaternion(
      this.object.quaternion,
    );
    if (this.object instanceof OrthographicCamera)
      point.multiplyScalar(1 / this.object.zoom);
    return point.add(this.#gizmos.position);
  }

  #initializeMouseActions(): void {
    this.setMouseAction("PAN", 0, "CTRL");
    this.setMouseAction("PAN", 2);

    this.setMouseAction("ROTATE", 0);

    this.setMouseAction("ZOOM", "WHEEL");
    this.setMouseAction("ZOOM", 1);

    this.setMouseAction("FOV", "WHEEL", "SHIFT");
    this.setMouseAction("FOV", 1, "SHIFT");
  }

  /** Returns the binding for a mouse input and modifier, falling back to the unmodified binding. */
  #getAction(
    mouse: number | "WHEEL",
    key: ArcballModifierKey | undefined,
  ): MouseAction | undefined {
    for (const action of this.mouseActions) {
      if (action.mouse === mouse && action.key === key) return action;
    }

    if (key !== undefined) {
      for (const action of this.mouseActions) {
        if (action.mouse === mouse && action.key === undefined) return action;
      }
    }

    return undefined;
  }

  #getAngle(p1: ArcballEvent, p2: ArcballEvent): number {
    return (
      (Math.atan2(
        (p2.clientY ?? 0) - (p1.clientY ?? 0),
        (p2.clientX ?? 0) - (p1.clientX ?? 0),
      ) *
        180) /
      Math.PI
    );
  }

  #updateTouchEvent(event: ArcballEvent): void {
    for (let i = 0; i < this.#touchCurrent.length; i++) {
      if (this.#touchCurrent[i].pointerId === event.pointerId) {
        this.#touchCurrent.splice(i, 1, event);
        break;
      }
    }
  }

  #setTransformationMatrices(
    camera?: Matrix4,
    gizmos?: Matrix4,
  ): Transformation {
    this.#transformation.camera =
      camera === undefined ? undefined : this.#cameraTransform.copy(camera);
    this.#transformation.gizmos =
      gizmos === undefined ? undefined : this.#gizmoTransform.copy(gizmos);
    return this.#transformation;
  }

  /** Applies an operation's transformations to the camera and gizmo states. */
  #applyTransformMatrix(transformation: Transformation): void {
    const camera = this.object;
    if (transformation.camera !== undefined) {
      this.#m4_1
        .copy(this.#cameraMatrixState)
        .premultiply(transformation.camera);
      this.#m4_1.decompose(camera.position, camera.quaternion, camera.scale);
      camera.updateMatrix();

      // update camera up vector
      if (
        this.#state === STATE.ROTATE ||
        this.#state === STATE.ZROTATE ||
        this.#state === STATE.ANIMATION_ROTATE
      ) {
        camera.up.copy(this.#upState).applyQuaternion(camera.quaternion);
      }
    }

    if (transformation.gizmos !== undefined) {
      this.#m4_1
        .copy(this.#gizmoMatrixState)
        .premultiply(transformation.gizmos);
      this.#m4_1.decompose(
        this.#gizmos.position,
        this.#gizmos.quaternion,
        this.#gizmos.scale,
      );
      this.#gizmos.updateMatrix();
    }

    if (
      this.#state === STATE.SCALE ||
      this.#state === STATE.FOCUS ||
      this.#state === STATE.ANIMATION_FOCUS
    ) {
      this.#tbRadius = this.#calculateTbRadius(camera);

      if (this.adjustNearFar) {
        const cameraDistance = camera.position.distanceTo(
          this.#gizmos.position,
        );

        this.#gizmoBoundingSphere();
        const radius = _sphereSize.length * 0.5;
        const centerLength = _sphereCenter.length;

        const adjustedNearPosition = Math.max(
          this.#nearPos0,
          radius + centerLength,
        );
        const regularNearPosition = cameraDistance - this.#initialNear;

        const minNearPos = Math.min(adjustedNearPosition, regularNearPosition);
        camera.near = cameraDistance - minNearPos;

        const adjustedFarPosition = Math.min(
          this.#farPos0,
          -radius + centerLength,
        );
        const regularFarPosition = cameraDistance - this.#initialFar;

        const minFarPos = Math.min(adjustedFarPosition, regularFarPosition);
        camera.far = cameraDistance - minFarPos;

        camera.updateProjectionMatrix();
      } else {
        let update = false;

        if (camera.near !== this.#initialNear) {
          camera.near = this.#initialNear;
          update = true;
        }

        if (camera.far !== this.#initialFar) {
          camera.far = this.#initialFar;
          update = true;
        }

        if (update) camera.updateProjectionMatrix();
      }
    }
  }

  /** Writes the world-space bounding sphere of the gizmo lines to `_sphereCenter` and `_sphereSize`. */
  #gizmoBoundingSphere(): void {
    _gizmoBox.makeEmpty();
    this.#gizmos.updateMatrixWorld(false, true);
    for (const child of this.#gizmos.children) {
      const geometry = (child as Line).geometry;
      if (geometry === undefined) continue;
      if (geometry.boundingBox === undefined) geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      if (box === undefined) continue;
      _gizmoBox.union(_childBox.copy(box).applyMatrix4(child.matrixWorld));
    }
    _gizmoBox.getCenter(_sphereCenter);
    _gizmoBox.getSize(_sphereSize);
  }

  #calculateAngularSpeed(
    p0: number,
    p1: number,
    t0: number,
    t1: number,
  ): number {
    const s = p1 - p0;
    const t = (t1 - t0) / 1000;
    if (t === 0) return 0;
    return s / t;
  }

  #calculatePointersDistance(p0: ArcballEvent, p1: ArcballEvent): number {
    return Math.sqrt(
      ((p1.clientX ?? 0) - (p0.clientX ?? 0)) ** 2 +
        ((p1.clientY ?? 0) - (p0.clientY ?? 0)) ** 2,
    );
  }

  /** Normalized axis perpendicular to both vectors, in world space; written to the shared rotation axis. */
  #calculateRotationAxis(vec1: Vector3, vec2: Vector3): Vector3 {
    this.#rotationMatrix.extractRotation(this.#cameraMatrixState);
    this.#quat.setFromRotationMatrix(this.#rotationMatrix);

    this.#rotationAxis.crossVectors(vec1, vec2).applyQuaternion(this.#quat);
    return this.#rotationAxis.normalize();
  }

  /** Trackball radius: `radiusFactor` of the smaller half-extent of the frustum at the gizmos. */
  #calculateTbRadius(camera: ArcballCamera): number {
    if (camera instanceof PerspectiveCamera) {
      const distance = camera.position.distanceTo(this.#gizmos.position);
      const halfFovV = DEG2RAD * camera.fov * 0.5; // vertical fov/2 in radians
      const halfFovH = Math.atan(camera.aspect * Math.tan(halfFovV)); // horizontal fov/2 in radians
      return (
        Math.tan(Math.min(halfFovV, halfFovH)) * distance * this.radiusFactor
      );
    }
    return Math.min(camera.top, camera.right) * this.radiusFactor;
  }

  /** Moves the point of interest to the trackball center and zooms in slightly. */
  #focus(point: Vector3, size: number, amount = 1): void {
    const camera = this.object;
    // move center of camera (along with gizmos) towards point of interest
    _offset.copy(point).sub(this.#gizmos.position).multiplyScalar(amount);
    this.#translationMatrix.makeTranslation(_offset.x, _offset.y, _offset.z);

    _gizmoMatrixStateTemp.copy(this.#gizmoMatrixState);
    this.#gizmoMatrixState.premultiply(this.#translationMatrix);
    this.#gizmoMatrixState.decompose(
      this.#gizmos.position,
      this.#gizmos.quaternion,
      this.#gizmos.scale,
    );

    _cameraMatrixStateTemp.copy(this.#cameraMatrixState);
    this.#cameraMatrixState.premultiply(this.#translationMatrix);
    this.#cameraMatrixState.decompose(
      camera.position,
      camera.quaternion,
      camera.scale,
    );

    // apply zoom
    if (this.enableZoom) {
      this.#applyTransformMatrix(this.#scale(size, this.#gizmos.position));
    }

    this.#gizmoMatrixState.copy(_gizmoMatrixStateTemp);
    this.#cameraMatrixState.copy(_cameraMatrixStateTemp);
  }

  #drawGrid(): void {
    if (this.scene === undefined) return;

    const color = 0x888888;
    const multiplier = 3;
    const camera = this.object;
    let size: number;
    let divisions: number;

    if (camera instanceof OrthographicCamera) {
      const width = camera.right - camera.left;
      const height = camera.bottom - camera.top;

      const maxLength = Math.max(width, height);
      const tick = maxLength / 20;

      size = (maxLength / camera.zoom) * multiplier;
      divisions = (size / tick) * camera.zoom;
    } else {
      const distance = camera.position.distanceTo(this.#gizmos.position);
      const halfFovV = DEG2RAD * camera.fov * 0.5;
      const halfFovH = Math.atan(camera.aspect * Math.tan(halfFovV));

      const maxLength = Math.tan(Math.max(halfFovV, halfFovH)) * distance * 2;
      const tick = maxLength / 20;

      size = maxLength * multiplier;
      divisions = size / tick;
    }

    if (this.#grid === undefined) {
      // GridHelper needs whole divisions; three.js truncates them in its loop.
      this.#grid = new GridHelper(
        size,
        Math.max(1, Math.round(divisions)),
        color,
        color,
      );
      this.#grid.position.copy(this.#gizmos.position);
      this.#gridPosition.copy(this.#grid.position);
      this.#grid.quaternion.copy(camera.quaternion);
      this.#grid.rotateX(Math.PI * 0.5);

      this.scene.add(this.#grid);
    }
  }

  /** Cursor position in normalized device coordinates; returns a shared scratch vector. */
  #cursorNDC(cursorX: number, cursorY: number): Vector2 {
    const rect = this.#elementRect();
    this.#v2_1.x = ((cursorX - rect.left) / rect.width) * 2 - 1;
    this.#v2_1.y = ((rect.top + rect.height - cursorY) / rect.height) * 2 - 1;
    return this.#v2_1;
  }

  /** Cursor position on the orthographic view plane, origin at the canvas center. */
  #cursorPosition(cursorX: number, cursorY: number): Vector2 {
    const camera = this.object as OrthographicCamera;
    const position = this.#cursorNDC(cursorX, cursorY);
    position.x *= (camera.right - camera.left) * 0.5;
    position.y *= (camera.top - camera.bottom) * 0.5;
    return position;
  }

  #elementRect(): { left: number; top: number; width: number; height: number } {
    const element = this.domElement;
    return (
      element?.getBoundingClientRect?.() ?? {
        left: 0,
        top: 0,
        width: element?.clientWidth ?? 0,
        height: element?.clientHeight ?? 0,
      }
    );
  }

  #makeGizmos(tbCenter: Vector3, tbRadius: number): void {
    const curveGeometry = this.#gizmoGeometry(tbRadius);

    // material
    const curveMaterialX = new LineMaterial({
      color: 0xff8080,
      transparent: true,
      opacity: _GIZMO_IDLE_TRANSPARENCY,
    });
    const curveMaterialY = new LineMaterial({
      color: 0x80ff80,
      transparent: true,
      opacity: _GIZMO_IDLE_TRANSPARENCY,
    });
    const curveMaterialZ = new LineMaterial({
      color: 0x8080ff,
      transparent: true,
      opacity: _GIZMO_IDLE_TRANSPARENCY,
    });

    // line
    const gizmoX = new Line(curveGeometry, curveMaterialX);
    const gizmoY = new Line(curveGeometry, curveMaterialY);
    const gizmoZ = new Line(curveGeometry, curveMaterialZ);

    const rotation = Math.PI * 0.5;
    gizmoX.rotation.y = rotation;
    gizmoY.rotation.x = rotation;

    // setting state
    this.#gizmoMatrixState0.identity().setPosition(tbCenter);
    this.#gizmoMatrixState.copy(this.#gizmoMatrixState0);

    if (this.object.zoom !== 1) {
      // adapt gizmos size to camera zoom
      const size = 1 / this.object.zoom;
      this.#scaleMatrix.makeScale(size, size, size);
      this.#translationMatrix.makeTranslation(
        -tbCenter.x,
        -tbCenter.y,
        -tbCenter.z,
      );

      this.#gizmoMatrixState
        .premultiply(this.#translationMatrix)
        .premultiply(this.#scaleMatrix);
      this.#translationMatrix.makeTranslation(
        tbCenter.x,
        tbCenter.y,
        tbCenter.z,
      );
      this.#gizmoMatrixState.premultiply(this.#translationMatrix);
    }

    this.#gizmoMatrixState.decompose(
      this.#gizmos.position,
      this.#gizmos.quaternion,
      this.#gizmos.scale,
    );

    this.#gizmos.traverse((object) => {
      if (object instanceof Line) {
        object.geometry?.dispose();
        object.material?.dispose();
      }
    });

    this.#gizmos.clear();

    this.#gizmos.add(gizmoX);
    this.#gizmos.add(gizmoY);
    this.#gizmos.add(gizmoZ);
  }

  /** Circle of `radius` in the XY plane, shared by the three gizmo lines. */
  #gizmoGeometry(radius: number): Geometry {
    const curve = new EllipseCurve(0, 0, radius, radius);
    const points = curve.getPoints(_CURVE_POINTS);
    return new Geometry().setFromPoints(
      points.filter((point) => point !== undefined),
    );
  }

  #setGizmoGeometry(radius: number): void {
    const curveGeometry = this.#gizmoGeometry(radius);
    for (const gizmo of this.#gizmos.children) {
      (gizmo as Line).geometry = curveGeometry;
    }
  }

  readonly #onFocusAnimStart = (time: number): void => {
    this.#updateTbState(STATE.ANIMATION_FOCUS, true);
    this.#onFocusAnim(time, true);
  };

  readonly #onFocusAnimFrame = (time: number): void => {
    this.#onFocusAnim(time, false);
  };

  /** One focus animation frame; the first frame reads the live gizmo state, later ones a snapshot of it. */
  #onFocusAnim(time: number, first: boolean): void {
    if (this.#timeStart === -1) {
      // animation start
      this.#timeStart = time;
    }

    if (this.#state === STATE.ANIMATION_FOCUS) {
      const deltaTime = time - this.#timeStart;
      const animTime = deltaTime / this.focusAnimationTime;

      if (!first) this.#gizmoMatrixState.copy(this.#focusGizmoMatrix);

      if (animTime >= 1) {
        // animation end
        this.#gizmoMatrixState.decompose(
          this.#gizmos.position,
          this.#gizmos.quaternion,
          this.#gizmos.scale,
        );

        this.#focus(this.#focusPoint, this.scaleFactor);

        this.#timeStart = -1;
        this.#updateTbState(STATE.IDLE, false);
        this.activateGizmos(false);

        this.dispatchEvent(_changeEvent);
      } else {
        const amount = this.#easeOutCubic(animTime);
        const size = 1 - amount + this.scaleFactor * amount;

        this.#gizmoMatrixState.decompose(
          this.#gizmos.position,
          this.#gizmos.quaternion,
          this.#gizmos.scale,
        );
        this.#focus(this.#focusPoint, size, amount);

        this.dispatchEvent(_changeEvent);
        if (first) this.#focusGizmoMatrix.copy(this.#gizmoMatrixState);
        this.#animationId = this.#requestFrame(this.#onFocusAnimFrame);
      }
    } else {
      // interrupt animation
      this.#animationId = -1;
      this.#timeStart = -1;
    }
  }

  readonly #onRotationAnimStart = (time: number): void => {
    this.#updateTbState(STATE.ANIMATION_ROTATE, true);
    this.#animationAxis.copy(
      this.#calculateRotationAxis(this.#cursorPosPrev, this.#cursorPosCurr),
    );
    this.#animationW = Math.min(this.#animationW, this.wMax);
    this.#onRotationAnim(time);
  };

  readonly #onRotationAnimFrame = (time: number): void => {
    this.#onRotationAnim(time);
  };

  #onRotationAnim(time: number): void {
    const w0 = this.#animationW;
    if (this.#timeStart === -1) {
      // animation start
      this.#anglePrev = 0;
      this.#angleCurrent = 0;
      this.#timeStart = time;
    }

    if (this.#state === STATE.ANIMATION_ROTATE) {
      // w = w0 + alpha * t
      const deltaTime = (time - this.#timeStart) / 1000;
      const w = w0 + -this.dampingFactor * deltaTime;

      if (w > 0) {
        // theta = 0.5 * alpha * t^2 + w0 * t + theta0
        this.#angleCurrent =
          0.5 * -this.dampingFactor * deltaTime ** 2 + w0 * deltaTime + 0;
        this.#applyTransformMatrix(
          this.#rotate(this.#animationAxis, this.#angleCurrent),
        );
        this.dispatchEvent(_changeEvent);
        this.#animationId = this.#requestFrame(this.#onRotationAnimFrame);
      } else {
        this.#animationId = -1;
        this.#timeStart = -1;

        this.#updateTbState(STATE.IDLE, false);
        this.activateGizmos(false);

        this.dispatchEvent(_changeEvent);
      }
    } else {
      // interrupt animation
      this.#animationId = -1;
      this.#timeStart = -1;

      if (this.#state !== STATE.ROTATE) {
        this.activateGizmos(false);
        this.dispatchEvent(_changeEvent);
      }
    }
  }

  #easeOutCubic(t: number): number {
    return 1 - (1 - t) ** 3;
  }

  /** Pan transformation moving the camera and gizmos between two trackball-plane points. */
  #pan(p0: Vector3, p1: Vector3, adjust = false): Transformation {
    const camera = this.object;
    const movement = _movement.copy(p0).sub(p1);

    if (camera instanceof OrthographicCamera) {
      // adjust movement amount
      movement.multiplyScalar(1 / camera.zoom);
    } else if (adjust) {
      // adjust movement amount
      this.#v3_1.setFromMatrixPosition(this.#cameraMatrixState0); // camera's initial position
      this.#v3_2.setFromMatrixPosition(this.#gizmoMatrixState0); // gizmo's initial position
      const distanceFactor =
        this.#v3_1.distanceTo(this.#v3_2) /
        camera.position.distanceTo(this.#gizmos.position);
      movement.multiplyScalar(1 / distanceFactor);
    }

    this.#v3_1
      .set(movement.x, movement.y, 0)
      .applyQuaternion(camera.quaternion);

    this.#m4_1.makeTranslation(this.#v3_1.x, this.#v3_1.y, this.#v3_1.z);

    return this.#setTransformationMatrices(this.#m4_1, this.#m4_1);
  }

  /** Rotation of the camera around an axis through the trackball center. */
  #rotate(axis: Vector3, angle: number): Transformation {
    const point = this.#gizmos.position; // rotation center
    this.#translationMatrix.makeTranslation(-point.x, -point.y, -point.z);
    this.#rotationMatrix.makeRotationAxis(axis, -angle);

    // rotate camera
    this.#m4_1.makeTranslation(point.x, point.y, point.z);
    this.#m4_1.multiply(this.#rotationMatrix);
    this.#m4_1.multiply(this.#translationMatrix);

    return this.#setTransformationMatrices(this.#m4_1);
  }

  /** Uniform scale around `point`, clamped to the zoom or distance limits. */
  #scale(size: number, point: Vector3, scaleGizmos = true): Transformation {
    const camera = this.object;
    _scalePointTemp.copy(point);
    let sizeInverse = 1 / size;

    if (camera instanceof OrthographicCamera) {
      // camera zoom
      camera.zoom = this.#zoomState;
      camera.zoom *= size;

      // check min and max zoom
      if (camera.zoom > this.maxZoom) {
        camera.zoom = this.maxZoom;
        sizeInverse = this.#zoomState / this.maxZoom;
      } else if (camera.zoom < this.minZoom) {
        camera.zoom = this.minZoom;
        sizeInverse = this.#zoomState / this.minZoom;
      }

      camera.updateProjectionMatrix();

      this.#v3_1.setFromMatrixPosition(this.#gizmoMatrixState); // gizmos position

      // scale gizmos so they appear in the same spot having the same dimension
      this.#scaleMatrix.makeScale(sizeInverse, sizeInverse, sizeInverse);
      this.#translationMatrix.makeTranslation(
        -this.#v3_1.x,
        -this.#v3_1.y,
        -this.#v3_1.z,
      );

      this.#m4_2
        .makeTranslation(this.#v3_1.x, this.#v3_1.y, this.#v3_1.z)
        .multiply(this.#scaleMatrix);
      this.#m4_2.multiply(this.#translationMatrix);

      // move camera and gizmos to obtain pinch effect
      _scalePointTemp.sub(this.#v3_1);

      const amount = _scaleAmount
        .copy(_scalePointTemp)
        .multiplyScalar(sizeInverse);
      _scalePointTemp.sub(amount);

      this.#m4_1.makeTranslation(
        _scalePointTemp.x,
        _scalePointTemp.y,
        _scalePointTemp.z,
      );
      this.#m4_2.premultiply(this.#m4_1);

      return this.#setTransformationMatrices(this.#m4_1, this.#m4_2);
    }

    this.#v3_1.setFromMatrixPosition(this.#cameraMatrixState);
    this.#v3_2.setFromMatrixPosition(this.#gizmoMatrixState);

    // move camera
    let distance = this.#v3_1.distanceTo(_scalePointTemp);
    let amount = distance - distance * sizeInverse;

    // check min and max distance
    const newDistance = distance - amount;
    if (newDistance < this.minDistance) {
      sizeInverse = this.minDistance / distance;
      amount = distance - distance * sizeInverse;
    } else if (newDistance > this.maxDistance) {
      sizeInverse = this.maxDistance / distance;
      amount = distance - distance * sizeInverse;
    }

    _offset
      .copy(_scalePointTemp)
      .sub(this.#v3_1)
      .normalize()
      .multiplyScalar(amount);

    this.#m4_1.makeTranslation(_offset.x, _offset.y, _offset.z);

    if (scaleGizmos) {
      // scale gizmos so they appear in the same spot having the same dimension
      const pos = this.#v3_2;

      distance = pos.distanceTo(_scalePointTemp);
      amount = distance - distance * sizeInverse;
      _offset
        .copy(_scalePointTemp)
        .sub(this.#v3_2)
        .normalize()
        .multiplyScalar(amount);

      this.#translationMatrix.makeTranslation(pos.x, pos.y, pos.z);
      this.#scaleMatrix.makeScale(sizeInverse, sizeInverse, sizeInverse);

      this.#m4_2
        .makeTranslation(_offset.x, _offset.y, _offset.z)
        .multiply(this.#translationMatrix);
      this.#m4_2.multiply(this.#scaleMatrix);

      this.#translationMatrix.makeTranslation(-pos.x, -pos.y, -pos.z);

      this.#m4_2.multiply(this.#translationMatrix);
      return this.#setTransformationMatrices(this.#m4_1, this.#m4_2);
    }
    return this.#setTransformationMatrices(this.#m4_1);
  }

  #setFov(value: number): void {
    const camera = this.object;
    if (camera instanceof PerspectiveCamera) {
      camera.fov = clamp(value, this.minFov, this.maxFov);
      camera.updateProjectionMatrix();
    }
  }

  /** Rotation around the camera's view direction through `point`. */
  #zRotate(point: Vector3, angle: number): Transformation {
    this.#rotationMatrix.makeRotationAxis(this.#rotationAxis, angle);
    this.#translationMatrix.makeTranslation(-point.x, -point.y, -point.z);

    this.#m4_1.makeTranslation(point.x, point.y, point.z);
    this.#m4_1.multiply(this.#rotationMatrix);
    this.#m4_1.multiply(this.#translationMatrix);

    this.#v3_1.setFromMatrixPosition(this.#gizmoMatrixState).sub(point); // vector from rotation center to gizmos position
    this.#v3_2.copy(this.#v3_1).applyAxisAngle(this.#rotationAxis, angle); // apply rotation
    this.#v3_2.sub(this.#v3_1);

    this.#m4_2.makeTranslation(this.#v3_2.x, this.#v3_2.y, this.#v3_2.z);

    return this.#setTransformationMatrices(this.#m4_1, this.#m4_2);
  }

  /** Stores the first mesh hit under `cursor` in the focus point and reports whether one was found. */
  #unprojectOnObj(cursor: Vector2): boolean {
    const camera = this.object;
    const raycaster = this.raycaster;
    raycaster.near = camera.near;
    raycaster.far = camera.far;
    raycaster.setFromCamera(cursor, camera);

    const intersect = raycaster.intersectObjects(
      this.scene?.children ?? [],
      true,
    );

    for (const hit of intersect) {
      if (hit.object !== this.#gizmos && hit.face !== undefined) {
        this.#focusPoint.copy(hit.point);
        return true;
      }
    }

    return false;
  }

  /** Cursor projected on the trackball surface in camera space; returns a shared scratch vector. */
  #unprojectOnTbSurface(
    cursorX: number,
    cursorY: number,
    tbRadius: number,
  ): Vector3 {
    const camera = this.object;
    if (camera instanceof OrthographicCamera) {
      const position = this.#cursorPosition(cursorX, cursorY);
      const point = this.#surfacePoint.set(position.x, position.y, 0);

      const x2 = position.x ** 2;
      const y2 = position.y ** 2;
      const r2 = this.#tbRadius ** 2;

      if (x2 + y2 <= r2 * 0.5) {
        // intersection with sphere
        point.z = Math.sqrt(r2 - (x2 + y2));
      } else {
        // intersection with hyperboloid
        point.z = (r2 * 0.5) / Math.sqrt(x2 + y2);
      }

      return point;
    }

    // unproject cursor on the near plane
    const ndc = this.#cursorNDC(cursorX, cursorY);

    this.#v3_1.set(ndc.x, ndc.y, -1);
    this.#v3_1.applyMatrix4(camera.projectionMatrixInverse);

    const rayDir = this.#surfacePoint.copy(this.#v3_1).normalize(); // unprojected ray direction
    const cameraGizmoDistance = camera.position.distanceTo(
      this.#gizmos.position,
    );
    const radius2 = tbRadius ** 2;

    //   camera
    //     |\
    //     | \
    //   h |  \
    //     |   \
    // ____|____\____ near plane
    //         l

    const h = this.#v3_1.z;
    const l = Math.sqrt(this.#v3_1.x ** 2 + this.#v3_1.y ** 2);

    if (l === 0) {
      // ray aligned with camera
      rayDir.set(this.#v3_1.x, this.#v3_1.y, tbRadius);
      return rayDir;
    }

    const m = h / l;
    const q = cameraGizmoDistance;

    /*
     * calculate intersection point between unprojected ray and trackball surface
     *|y = m * x + q
     *|x^2 + y^2 = r^2
     *
     * (m^2 + 1) * x^2 + (2 * m * q) * x + q^2 - r^2 = 0
     */
    let a = m ** 2 + 1;
    let b = 2 * m * q;
    let c = q ** 2 - radius2;
    let delta = b ** 2 - 4 * a * c;

    if (delta >= 0) {
      // intersection with sphere
      this.#v2_1.x = (-b - Math.sqrt(delta)) / (2 * a);
      this.#v2_1.y = m * this.#v2_1.x + q;

      const angle = RAD2DEG * this.#v2_1.angle;

      if (angle >= 45) {
        // if angle between intersection point and X' axis is >= 45°, return that point
        // otherwise, calculate intersection point with hyperboloid
        const rayLength = Math.sqrt(
          this.#v2_1.x ** 2 + (cameraGizmoDistance - this.#v2_1.y) ** 2,
        );
        rayDir.multiplyScalar(rayLength);
        rayDir.z += cameraGizmoDistance;
        return rayDir;
      }
    }

    // intersection with hyperboloid
    /*
     *|y = m * x + q
     *|y = (1 / x) * (r^2 / 2)
     *
     * m * x^2 + q * x - r^2 / 2 = 0
     */

    a = m;
    b = q;
    c = -radius2 * 0.5;
    delta = b ** 2 - 4 * a * c;
    this.#v2_1.x = (-b - Math.sqrt(delta)) / (2 * a);
    this.#v2_1.y = m * this.#v2_1.x + q;

    const rayLength = Math.sqrt(
      this.#v2_1.x ** 2 + (cameraGizmoDistance - this.#v2_1.y) ** 2,
    );

    rayDir.multiplyScalar(rayLength);
    rayDir.z += cameraGizmoDistance;
    return rayDir;
  }

  /**
   * Cursor projected on the plane through the trackball center orthogonal to
   * the camera, in camera space; returns a shared scratch vector.
   *
   * @param initialDistance Uses the initial camera-to-gizmo distance (perspective only).
   */
  #unprojectOnTbPlane(
    cursorX: number,
    cursorY: number,
    initialDistance = false,
  ): Vector3 {
    const camera = this.object;
    if (camera instanceof OrthographicCamera) {
      const position = this.#cursorPosition(cursorX, cursorY);
      return this.#planePoint.set(position.x, position.y, 0);
    }

    const ndc = this.#cursorNDC(cursorX, cursorY);

    // unproject cursor on the near plane
    this.#v3_1.set(ndc.x, ndc.y, -1);
    this.#v3_1.applyMatrix4(camera.projectionMatrixInverse);

    const rayDir = this.#planePoint.copy(this.#v3_1).normalize(); // unprojected ray direction

    const h = this.#v3_1.z;
    const l = Math.sqrt(this.#v3_1.x ** 2 + this.#v3_1.y ** 2);
    let cameraGizmoDistance: number;

    if (initialDistance) {
      cameraGizmoDistance = this.#v3_1
        .setFromMatrixPosition(this.#cameraMatrixState0)
        .distanceTo(this.#v3_2.setFromMatrixPosition(this.#gizmoMatrixState0));
    } else {
      cameraGizmoDistance = camera.position.distanceTo(this.#gizmos.position);
    }

    /*
     * calculate intersection point between unprojected ray and the plane
     *|y = mx + q
     *|y = 0
     *
     * x = -q/m
     */
    if (l === 0) {
      // ray aligned with camera
      rayDir.set(0, 0, 0);
      return rayDir;
    }

    const m = h / l;
    const q = cameraGizmoDistance;
    const x = -q / m;

    const rayLength = Math.sqrt(q ** 2 + x ** 2);
    rayDir.multiplyScalar(rayLength);
    rayDir.z = 0;
    return rayDir;
  }

  #updateMatrixState(): void {
    const camera = this.object;
    // update camera and gizmos state
    this.#cameraMatrixState.copy(camera.matrix);
    this.#gizmoMatrixState.copy(this.#gizmos.matrix);

    if (camera instanceof OrthographicCamera) {
      camera.updateProjectionMatrix();
      this.#zoomState = camera.zoom;
    } else {
      this.#fovState = camera.fov;
    }
  }

  #updateTbState(newState: number, updateMatrices: boolean): void {
    this.#state = newState;
    if (updateMatrices) this.#updateMatrixState();
  }

  /** Aims the camera at the trackball center after refreshing its world matrix, as three.js `lookAt` does. */
  #lookAtGizmos(): void {
    this.object.updateMatrixWorld(true, false);
    this.object.lookAt(this.#gizmos.position);
  }

  #canAnimate(): boolean {
    return typeof frameHost().requestAnimationFrame === "function";
  }

  #requestFrame(callback: (time: number) => void): number {
    return frameHost().requestAnimationFrame?.(callback) ?? -1;
  }

  #cancelFrame(handle: number): void {
    frameHost().cancelAnimationFrame?.(handle);
  }

  #stopAnimation(): void {
    this.#cancelFrame(this.#animationId);
    this.#animationId = -1;
    this.#timeStart = -1;
  }

  #pointerTarget(): EventTarget | undefined {
    return this.#window ?? this.domElement;
  }

  // listeners

  readonly #onWindowResize = (): void => {
    const scale =
      (this.#gizmos.scale.x + this.#gizmos.scale.y + this.#gizmos.scale.z) / 3;
    this.#tbRadius = this.#calculateTbRadius(this.object);

    this.#setGizmoGeometry(this.#tbRadius / scale);

    this.dispatchEvent(_changeEvent);
  };

  readonly #onContextMenu = (event: Event): void => {
    if (!this.enabled) return;

    for (const action of this.mouseActions) {
      if (action.mouse === 2) {
        // prevent only if button 2 is actually used
        event.preventDefault();
        break;
      }
    }
  };

  readonly #onPointerCancel = (): void => {
    this.#touchStart.length = 0;
    this.#touchCurrent.length = 0;
    this.#input = INPUT.NONE;
  };

  readonly #onPointerDown = (raw: Event): void => {
    const event = raw as ArcballEvent;
    if (event.button === 0 && event.isPrimary === true) {
      this.#downValid = true;
      this.#downEvents.push(event);
    } else {
      this.#downValid = false;
    }

    if (event.pointerType === "touch" && this.#input !== INPUT.CURSOR) {
      this.#touchStart.push(event);
      this.#touchCurrent.push(event);

      switch (this.#input) {
        case INPUT.NONE:
          // singleStart
          this.#input = INPUT.ONE_FINGER;
          this.#onSinglePanStart(event, "ROTATE");

          this.#addMoveListeners();
          break;

        case INPUT.ONE_FINGER:
        case INPUT.ONE_FINGER_SWITCHED:
          // doubleStart
          this.#input = INPUT.TWO_FINGER;

          this.#onRotateStart();
          this.#onPinchStart();
          this.#onDoublePanStart();
          break;

        case INPUT.TWO_FINGER:
          // multipleStart
          this.#input = INPUT.MULT_FINGER;
          this.#onTriplePanStart();
          break;
      }
    } else if (event.pointerType !== "touch" && this.#input === INPUT.NONE) {
      this.#mouseOp = this.#getAction(
        event.button ?? -1,
        this.#modifier(event),
      )?.operation;
      if (this.#mouseOp !== undefined) {
        this.#addMoveListeners();

        // singleStart
        this.#input = INPUT.CURSOR;
        this.#button = event.button ?? -1;
        this.#onSinglePanStart(event, this.#mouseOp);
      }
    }
  };

  readonly #onPointerMove = (raw: Event): void => {
    const event = raw as ArcballEvent;
    if (event.pointerType === "touch" && this.#input !== INPUT.CURSOR) {
      switch (this.#input) {
        case INPUT.ONE_FINGER:
          // singleMove
          this.#updateTouchEvent(event);

          this.#onSinglePanMove(event, STATE.ROTATE);
          break;

        case INPUT.ONE_FINGER_SWITCHED: {
          const movement =
            this.#calculatePointersDistance(this.#touchCurrent[0], event) *
            this.#devPxRatio;

          if (movement >= this.#switchSensibility) {
            // singleMove
            this.#input = INPUT.ONE_FINGER;
            this.#updateTouchEvent(event);

            this.#onSinglePanStart(event, "ROTATE");
          }
          break;
        }

        case INPUT.TWO_FINGER:
          // rotate/pan/pinchMove
          this.#updateTouchEvent(event);

          this.#onRotateMove();
          this.#onPinchMove();
          this.#onDoublePanMove();
          break;

        case INPUT.MULT_FINGER:
          // multMove
          this.#updateTouchEvent(event);

          this.#onTriplePanMove();
          break;
      }
    } else if (event.pointerType !== "touch" && this.#input === INPUT.CURSOR) {
      const action = this.#getAction(this.#button, this.#modifier(event));
      if (action !== undefined) this.#onSinglePanMove(event, action.state);
    }

    // checkDistance
    if (this.#downValid) {
      const last = this.#downEvents[this.#downEvents.length - 1];
      const movement =
        this.#calculatePointersDistance(last, event) * this.#devPxRatio;
      if (movement > this.#movementThreshold) this.#downValid = false;
    }
  };

  readonly #onPointerUp = (raw: Event): void => {
    const event = raw as ArcballEvent;
    if (event.pointerType === "touch" && this.#input !== INPUT.CURSOR) {
      const nTouch = this.#touchCurrent.length;

      for (let i = 0; i < nTouch; i++) {
        if (this.#touchCurrent[i].pointerId === event.pointerId) {
          this.#touchCurrent.splice(i, 1);
          this.#touchStart.splice(i, 1);
          break;
        }
      }

      switch (this.#input) {
        case INPUT.ONE_FINGER:
        case INPUT.ONE_FINGER_SWITCHED:
          // singleEnd
          this.#removeMoveListeners();

          this.#input = INPUT.NONE;
          this.#onSinglePanEnd();
          break;

        case INPUT.TWO_FINGER:
          // doubleEnd
          this.#onDoublePanEnd();
          this.#onPinchEnd();
          this.#onRotateEnd();

          // switching to singleStart
          this.#input = INPUT.ONE_FINGER_SWITCHED;
          break;

        case INPUT.MULT_FINGER:
          if (this.#touchCurrent.length === 0) {
            this.#removeMoveListeners();

            // multCancel
            this.#input = INPUT.NONE;
            this.#onTriplePanEnd();
          }
          break;
      }
    } else if (event.pointerType !== "touch" && this.#input === INPUT.CURSOR) {
      this.#removeMoveListeners();

      this.#input = INPUT.NONE;
      this.#onSinglePanEnd();
      this.#button = -1;
    }

    if (event.isPrimary === true) {
      if (this.#downValid) {
        const downTime =
          event.timeStamp -
          this.#downEvents[this.#downEvents.length - 1].timeStamp;

        if (downTime <= this.#maxDownTime) {
          if (this.#nclicks === 0) {
            // first valid click detected
            this.#nclicks = 1;
            this.#clickStart = now();
          } else {
            const clickInterval = event.timeStamp - this.#clickStart;
            const movement =
              this.#calculatePointersDistance(
                this.#downEvents[1],
                this.#downEvents[0],
              ) * this.#devPxRatio;

            if (
              clickInterval <= this.#maxInterval &&
              movement <= this.#posThreshold
            ) {
              // second valid click detected
              // fire double tap and reset values
              this.#nclicks = 0;
              this.#downEvents.length = 0;
              this.#onDoubleTap(event);
            } else {
              // new 'first click'
              this.#nclicks = 1;
              this.#downEvents.shift();
              this.#clickStart = now();
            }
          }
        } else {
          this.#downValid = false;
          this.#nclicks = 0;
          this.#downEvents.length = 0;
        }
      } else {
        this.#nclicks = 0;
        this.#downEvents.length = 0;
      }
    }
  };

  readonly #onWheel = (raw: Event): void => {
    if (!(this.enabled && this.enableZoom)) return;
    const event = raw as ArcballEvent;

    const mouseOp = this.#getAction("WHEEL", this.#modifier(event))?.operation;
    if (mouseOp === undefined) return;

    event.preventDefault();
    this.dispatchEvent(_startEvent);

    const notchDeltaY = 125; // distance of one notch of mouse wheel
    let sgn = (event.deltaY ?? 0) / notchDeltaY;

    let size = 1;

    if (sgn > 0) size = 1 / this.scaleFactor;
    else if (sgn < 0) size = this.scaleFactor;

    const camera = this.object;
    switch (mouseOp) {
      case "ZOOM":
        this.#updateTbState(STATE.SCALE, true);

        if (sgn > 0) size = 1 / this.scaleFactor ** sgn;
        else if (sgn < 0) size = this.scaleFactor ** -sgn;

        if (this.cursorZoom && this.enablePan) {
          this.#applyTransformMatrix(
            this.#scale(
              size,
              this.#cursorScalePoint(event.clientX ?? 0, event.clientY ?? 0),
            ),
          );
        } else {
          this.#applyTransformMatrix(this.#scale(size, this.#gizmos.position));
        }

        if (this.#grid !== undefined) {
          this.disposeGrid();
          this.#drawGrid();
        }

        this.#updateTbState(STATE.IDLE, false);

        this.dispatchEvent(_changeEvent);
        this.dispatchEvent(_endEvent);
        break;

      case "FOV":
        if (camera instanceof PerspectiveCamera) {
          this.#updateTbState(STATE.FOV, true);

          // Vertigo effect

          // check for iOs shift shortcut
          if ((event.deltaX ?? 0) !== 0) {
            sgn = (event.deltaX ?? 0) / notchDeltaY;

            size = 1;

            if (sgn > 0) size = 1 / this.scaleFactor ** sgn;
            else if (sgn < 0) size = this.scaleFactor ** -sgn;
          }

          this.#v3_1.setFromMatrixPosition(this.#cameraMatrixState);
          const x = this.#v3_1.distanceTo(this.#gizmos.position);
          let xNew = x / size; // distance between camera and gizmos if scale(size, scalepoint) would be performed

          // check min and max distance
          xNew = clamp(xNew, this.minDistance, this.maxDistance);

          const y = x * Math.tan(DEG2RAD * camera.fov * 0.5);

          // calculate new fov
          let newFov = RAD2DEG * (Math.atan(y / xNew) * 2);

          // check min and max fov
          if (newFov > this.maxFov) newFov = this.maxFov;
          else if (newFov < this.minFov) newFov = this.minFov;

          const newDistance = y / Math.tan(DEG2RAD * (newFov / 2));
          size = x / newDistance;

          this.#setFov(newFov);
          this.#applyTransformMatrix(
            this.#scale(size, this.#gizmos.position, false),
          );
        }

        if (this.#grid !== undefined) {
          this.disposeGrid();
          this.#drawGrid();
        }

        this.#updateTbState(STATE.IDLE, false);

        this.dispatchEvent(_changeEvent);
        this.dispatchEvent(_endEvent);
        break;
    }
  };

  #modifier(event: ArcballEvent): ArcballModifierKey | undefined {
    if (event.ctrlKey || event.metaKey) return "CTRL";
    if (event.shiftKey) return "SHIFT";
    return undefined;
  }

  #addMoveListeners(): void {
    const target = this.#pointerTarget();
    target?.addEventListener("pointermove", this.#onPointerMove);
    target?.addEventListener("pointerup", this.#onPointerUp);
  }

  #removeMoveListeners(): void {
    const target = this.#pointerTarget();
    target?.removeEventListener("pointermove", this.#onPointerMove);
    target?.removeEventListener("pointerup", this.#onPointerUp);
  }
}
