import { OrthographicCamera } from "../cameras/OrthographicCamera.ts";
import { EventDispatcher } from "../core/EventDispatcher.ts";
import { Node } from "../core/Node.ts";
import { Raycaster } from "../core/Raycaster.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Quaternion } from "../math/Quaternion.ts";
import { Vector3 } from "../math/Vector3.ts";
import { error } from "../utils/ConsoleUtils.ts";
import {
  type TransformAxis,
  type TransformCamera,
  TransformControlsGizmo,
  type TransformMode,
  type TransformSpace,
} from "./_TransformGizmo.ts";

export type {
  TransformAxis,
  TransformCamera,
  TransformMode,
  TransformSpace,
} from "./_TransformGizmo.ts";

/**
 * Pointer passed to the imperative `pointerHover()`, `pointerDown()`,
 * `pointerMove()`, and `pointerUp()` methods, in normalized device
 * coordinates. `button` follows `PointerEvent.button`; moves use `-1`.
 */
export interface TransformPointer {
  /** Horizontal position from -1 (left) to 1 (right). */
  x: number;
  /** Vertical position from -1 (bottom) to 1 (top). */
  y: number;
  /** Pointer button, or -1 for a move without a button change. */
  button: number;
}

/**
 * Sub-region of the element that maps to the camera, in CSS pixels, laid out
 * like a three.js `Vector4`: `x`/`y` offset from the left and bottom edges,
 * `z` width, and `w` height.
 */
export interface TransformViewport {
  /** Left offset in CSS pixels. */
  x: number;
  /** Bottom offset in CSS pixels. */
  y: number;
  /** Width in CSS pixels. */
  z: number;
  /** Height in CSS pixels. */
  w: number;
}

/** Element that receives {@link TransformControls} pointer listeners. */
interface TransformDomElement extends EventTarget {
  /** Inline style used to disable browser touch scrolling. */
  style?: { touchAction: string };
  /** Document consulted for pointer lock. */
  ownerDocument?: { pointerLockElement?: unknown } | null;
  /** Returns the element's client-space bounds. */
  getBoundingClientRect(): {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  /** Captures the pointer for the active gesture. */
  setPointerCapture(pointerId: number): void;
  /** Releases a captured pointer. */
  releasePointerCapture(pointerId: number): void;
}

/** Pointer fields read by {@link TransformControls}. */
type TransformPointerEvent = Event & {
  pointerType?: string;
  pointerId: number;
  button: number;
  clientX: number;
  clientY: number;
};

/** Properties whose assignment dispatches `<name>-changed` and `change`. */
interface TransformProperties {
  camera: TransformCamera;
  object: Node | undefined;
  enabled: boolean;
  axis: TransformAxis | undefined;
  mode: TransformMode;
  translationSnap: number | undefined;
  rotationSnap: number | undefined;
  scaleSnap: number | undefined;
  space: TransformSpace;
  size: number;
  dragging: boolean;
  showX: boolean;
  showY: boolean;
  showZ: boolean;
  showXY: boolean;
  showYZ: boolean;
  showXZ: boolean;
  showXYZE: boolean;
  showE: boolean;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  rotationAngle: number;
}

type PropertyEvent = { type: string; value: unknown };

const _tempVector = new Vector3();
const _tempVector2 = new Vector3();
const _tempQuaternion = new Quaternion();
const _unit = {
  X: new Vector3(1, 0, 0),
  Y: new Vector3(0, 1, 0),
  Z: new Vector3(0, 0, 1),
} as const;
const _v1 = new Vector3();
const _v2 = new Vector3();
const _v3 = new Vector3();
const _alignVector = new Vector3();
const _dirVector = new Vector3();
const _tempMatrix = new Matrix4();
const _identityQuaternion = new Quaternion();
const _unitX = new Vector3(1, 0, 0);
const _unitY = new Vector3(0, 1, 0);
const _unitZ = new Vector3(0, 0, 1);
const _planeNormal = new Vector3();
const _planeOrigin = new Vector3();

const _changeEvent = { type: "change" };
const _mouseDownEvent: { type: string; mode: TransformMode | undefined } = {
  type: "mouseDown",
  mode: undefined,
};
const _mouseUpEvent: { type: string; mode: TransformMode | undefined } = {
  type: "mouseUp",
  mode: undefined,
};
const _objectChangeEvent = { type: "objectChange" };

/**
 * Root of the transform helper. Updating its world matrix refreshes the
 * attached object's world transform, the camera eye vector, and the parent
 * decomposition that pointer gestures read, as the three.js
 * `TransformControlsRoot` does during a render.
 */
class TransformControlsRoot extends Node {
  override type: string = "TransformControlsRoot";
  readonly parentPosition: Vector3 = new Vector3();
  readonly parentQuaternion: Quaternion = new Quaternion();
  readonly parentQuaternionInv: Quaternion = new Quaternion();
  readonly parentScale: Vector3 = new Vector3();
  readonly worldQuaternionInv: Quaternion = new Quaternion();
  readonly worldScale: Vector3 = new Vector3();
  readonly cameraScale: Vector3 = new Vector3();
  readonly #controls: TransformControls;
  gizmo: TransformControlsGizmo | undefined;

  constructor(controls: TransformControls) {
    super();
    this.#controls = controls;
    this.visible = false;
  }

  override updateMatrixWorld(
    updateParents: boolean = false,
    updateChildren: boolean = true,
    force: boolean = false,
  ): void {
    const controls = this.#controls;
    const object = controls.object;
    if (object !== undefined) {
      object.updateMatrixWorld();
      if (object.parent === undefined) {
        error(
          "TransformControls: The attached 3D object must be a part of the scene graph.",
        );
      } else {
        object.parent.matrixWorld.decompose(
          this.parentPosition,
          this.parentQuaternion,
          this.parentScale,
        );
      }
      object.matrixWorld.decompose(
        controls.worldPosition,
        controls.worldQuaternion,
        this.worldScale,
      );
      this.parentQuaternionInv.copy(this.parentQuaternion).invert();
      this.worldQuaternionInv.copy(controls.worldQuaternion).invert();
    }
    const camera = controls.camera;
    camera.updateMatrixWorld();
    camera.matrixWorld.decompose(
      controls.cameraPosition,
      controls.cameraQuaternion,
      this.cameraScale,
    );
    if (camera instanceof OrthographicCamera) {
      camera.getWorldDirection(controls.eye).negate();
    } else {
      controls.eye
        .copy(controls.cameraPosition)
        .sub(controls.worldPosition)
        .normalize();
    }
    // Cancel out the parent's transform so the gizmo stays world-aligned.
    if (this.parent !== undefined) {
      _tempMatrix.copy(this.parent.matrixWorld).invert();
      _tempMatrix.decompose(this.position, this.quaternion, this.scale);
    }
    super.updateMatrixWorld(updateParents, updateChildren, force);
  }

  dispose(): void {
    this.gizmo?.dispose();
  }
}

/**
 * Infinite drag plane of the transform controls. Its orientation follows
 * the three.js `TransformControlsPlane`; intersections are computed
 * analytically instead of against a 100000-unit plane mesh.
 */
class TransformControlsPlane extends Node {
  override type: string = "TransformControlsPlane";
  readonly #controls: TransformControls;

  constructor(controls: TransformControls) {
    super();
    this.#controls = controls;
    this.visible = false;
  }

  override updateMatrixWorld(
    updateParents: boolean = false,
    updateChildren: boolean = true,
    force: boolean = false,
  ): void {
    const controls = this.#controls;
    let space = controls.space;
    this.position.copy(controls.worldPosition);
    // Scale is always oriented to the local rotation.
    if (controls.mode === "scale") space = "local";
    const quaternion =
      space === "local" ? controls.worldQuaternion : _identityQuaternion;
    _v1.copy(_unitX).applyQuaternion(quaternion);
    _v2.copy(_unitY).applyQuaternion(quaternion);
    _v3.copy(_unitZ).applyQuaternion(quaternion);

    // Align the plane for the current mode, axis, and space.
    _alignVector.copy(_v2);
    switch (controls.mode) {
      case "translate":
      case "scale":
        switch (controls.axis) {
          case "X":
            _alignVector.copy(controls.eye).cross(_v1);
            _dirVector.copy(_v1).cross(_alignVector);
            break;
          case "Y":
            _alignVector.copy(controls.eye).cross(_v2);
            _dirVector.copy(_v2).cross(_alignVector);
            break;
          case "Z":
            _alignVector.copy(controls.eye).cross(_v3);
            _dirVector.copy(_v3).cross(_alignVector);
            break;
          case "XY":
            _dirVector.copy(_v3);
            break;
          case "YZ":
            _dirVector.copy(_v1);
            break;
          case "XZ":
            _alignVector.copy(_v3);
            _dirVector.copy(_v2);
            break;
          case "XYZ":
          case "E":
            _dirVector.set(0, 0, 0);
            break;
        }
        break;
      default:
        // Rotation always drags on a camera-facing plane.
        _dirVector.set(0, 0, 0);
    }

    if (_dirVector.length === 0) {
      this.quaternion.copy(controls.cameraQuaternion);
    } else {
      _tempMatrix.lookAt(_tempVector.set(0, 0, 0), _dirVector, _alignVector);
      this.quaternion.setFromRotationMatrix(_tempMatrix);
    }
    super.updateMatrixWorld(updateParents, updateChildren, force);
  }

  /** Intersects the raycaster's ray with this plane from either side. */
  intersect(raycaster: Raycaster, target: Vector3): Vector3 | undefined {
    const elements = this.matrixWorld.elements;
    _planeNormal.set(elements[8], elements[9], elements[10]).normalize();
    _planeOrigin.set(elements[12], elements[13], elements[14]);
    const ray = raycaster.ray;
    const hit = ray.intersectPlane(
      { normal: _planeNormal, constant: -_planeNormal.dot(_planeOrigin) },
      target,
    );
    if (hit === undefined) return undefined;
    const distance = ray.origin.distanceTo(hit);
    return distance >= raycaster.near && distance <= raycaster.far
      ? hit
      : undefined;
  }
}

/**
 * Interactive gizmo that translates, rotates, and scales an attached object.
 *
 * Matches three.js r186 `TransformControls`: hovering a handle selects
 * `axis`, dragging it moves the object on a mode- and axis-aligned plane, and
 * the gizmo keeps a constant screen size. Add {@link TransformControls.helper}
 * to the scene; rendering it (or calling its `updateMatrixWorld()`) refreshes
 * the state that gestures read.
 *
 * Assigning any public property dispatches `<name>-changed` with the new
 * `value`, followed by `change`. Gestures also dispatch `mouseDown` and
 * `mouseUp` with the active `mode`, and `objectChange` whenever the object's
 * transform changes.
 */
export class TransformControls extends EventDispatcher {
  /** Element that receives pointer listeners. */
  domElement: TransformDomElement | undefined;

  /** Sub-region of the element mapped to the camera, or the whole element. */
  viewport: TransformViewport | undefined = undefined;

  /** World position of the attached object at the last helper update. */
  readonly worldPosition: Vector3 = new Vector3();
  /** World position of the attached object when the drag started. */
  readonly worldPositionStart: Vector3 = new Vector3();
  /** World rotation of the attached object at the last helper update. */
  readonly worldQuaternion: Quaternion = new Quaternion();
  /** World rotation of the attached object when the drag started. */
  readonly worldQuaternionStart: Quaternion = new Quaternion();
  /** Camera world position at the last helper update. */
  readonly cameraPosition: Vector3 = new Vector3();
  /** Camera world rotation at the last helper update. */
  readonly cameraQuaternion: Quaternion = new Quaternion();
  /** Drag-plane hit at the drag start, relative to `worldPositionStart`. */
  readonly pointStart: Vector3 = new Vector3();
  /** Latest drag-plane hit, relative to `worldPositionStart`. */
  readonly pointEnd: Vector3 = new Vector3();
  /** Rotation axis of the current rotate gesture. */
  readonly rotationAxis: Vector3 = new Vector3();
  /** Unit vector from the object toward the camera (or the view direction). */
  readonly eye: Vector3 = new Vector3();

  readonly #props: TransformProperties;
  readonly #propertyEvents = new Map<string, PropertyEvent>();
  readonly #root: TransformControlsRoot;
  readonly #gizmo: TransformControlsGizmo;
  readonly #plane: TransformControlsPlane;
  readonly #raycaster = new Raycaster();
  readonly #pointer: TransformPointer = { x: 0, y: 0, button: 0 };

  readonly #offset = new Vector3();
  readonly #startNorm = new Vector3();
  readonly #endNorm = new Vector3();
  readonly #positionStart = new Vector3();
  readonly #quaternionStart = new Quaternion();
  readonly #scaleStart = new Vector3();
  readonly #worldScaleStart = new Vector3();
  readonly #planeHit = new Vector3();

  readonly #onPointerDown = (event: Event): void =>
    this.#handlePointerDown(event as TransformPointerEvent);
  readonly #onPointerHover = (event: Event): void =>
    this.#handlePointerHover(event as TransformPointerEvent);
  readonly #onPointerMove = (event: Event): void =>
    this.#handlePointerMove(event as TransformPointerEvent);
  readonly #onPointerUp = (event: Event): void =>
    this.#handlePointerUp(event as TransformPointerEvent);

  /**
   * Creates transform controls.
   *
   * @param camera Camera used to pick handles and project drags.
   * @param domElement Element for pointer listeners; listeners connect when given.
   */
  constructor(camera: TransformCamera, domElement?: TransformDomElement) {
    super();
    this.domElement = domElement;
    this.#props = {
      camera,
      object: undefined,
      enabled: true,
      axis: undefined,
      mode: "translate",
      translationSnap: undefined,
      rotationSnap: undefined,
      scaleSnap: undefined,
      space: "world",
      size: 1,
      dragging: false,
      showX: true,
      showY: true,
      showZ: true,
      showXY: true,
      showYZ: true,
      showXZ: true,
      showXYZE: true,
      showE: true,
      minX: Number.NEGATIVE_INFINITY,
      maxX: Number.POSITIVE_INFINITY,
      minY: Number.NEGATIVE_INFINITY,
      maxY: Number.POSITIVE_INFINITY,
      minZ: Number.NEGATIVE_INFINITY,
      maxZ: Number.POSITIVE_INFINITY,
      rotationAngle: 0,
    };
    this.#root = new TransformControlsRoot(this);
    this.#gizmo = new TransformControlsGizmo(this);
    this.#root.gizmo = this.#gizmo;
    this.#root.add(this.#gizmo);
    this.#plane = new TransformControlsPlane(this);
    this.#root.add(this.#plane);
    if (domElement !== undefined) this.connect(domElement);
  }

  /** Camera used to pick handles and project drags. */
  get camera(): TransformCamera {
    return this.#props.camera;
  }
  /** Sets `camera`; a new value dispatches `camera-changed` and `change`. */
  set camera(value: TransformCamera) {
    this.#set("camera", value);
  }

  /** Attached object, or `undefined` when detached. */
  get object(): Node | undefined {
    return this.#props.object;
  }
  /** Sets `object`; a new value dispatches `object-changed` and `change`. */
  set object(value: Node | undefined) {
    this.#set("object", value);
  }

  /** Whether the controls respond to pointer input. */
  get enabled(): boolean {
    return this.#props.enabled;
  }
  /** Sets `enabled`; a new value dispatches `enabled-changed` and `change`. */
  set enabled(value: boolean) {
    this.#set("enabled", value);
  }

  /** Hovered or dragged handle, or `undefined`. */
  get axis(): TransformAxis | undefined {
    return this.#props.axis;
  }
  /** Sets `axis`; a new value dispatches `axis-changed` and `change`. */
  set axis(value: TransformAxis | undefined) {
    this.#set("axis", value);
  }

  /** Active transformation: `translate`, `rotate`, or `scale`. */
  get mode(): TransformMode {
    return this.#props.mode;
  }
  /** Sets `mode`; a new value dispatches `mode-changed` and `change`. */
  set mode(value: TransformMode) {
    this.#set("mode", value);
  }

  /** Translation increment in world units, or `undefined` for no snapping. */
  get translationSnap(): number | undefined {
    return this.#props.translationSnap;
  }
  /** Sets `translationSnap`; a new value dispatches `translationSnap-changed` and `change`. */
  set translationSnap(value: number | undefined) {
    this.#set("translationSnap", value);
  }

  /** Rotation increment in radians, or `undefined` for no snapping. */
  get rotationSnap(): number | undefined {
    return this.#props.rotationSnap;
  }
  /** Sets `rotationSnap`; a new value dispatches `rotationSnap-changed` and `change`. */
  set rotationSnap(value: number | undefined) {
    this.#set("rotationSnap", value);
  }

  /** Scale increment, or `undefined` for no snapping. */
  get scaleSnap(): number | undefined {
    return this.#props.scaleSnap;
  }
  /** Sets `scaleSnap`; a new value dispatches `scaleSnap-changed` and `change`. */
  set scaleSnap(value: number | undefined) {
    this.#set("scaleSnap", value);
  }

  /** Handle orientation: `world` axes or the object's `local` axes. Scale always uses local. */
  get space(): TransformSpace {
    return this.#props.space;
  }
  /** Sets `space`; a new value dispatches `space-changed` and `change`. */
  set space(value: TransformSpace) {
    this.#set("space", value);
  }

  /** Gizmo size multiplier relative to its constant screen size. */
  get size(): number {
    return this.#props.size;
  }
  /** Sets `size`; a new value dispatches `size-changed` and `change`. */
  set size(value: number) {
    this.#set("size", value);
  }

  /** Whether a handle is being dragged. */
  get dragging(): boolean {
    return this.#props.dragging;
  }
  /** Sets `dragging`; a new value dispatches `dragging-changed` and `change`. */
  set dragging(value: boolean) {
    this.#set("dragging", value);
  }

  /** Whether the X handles are shown. */
  get showX(): boolean {
    return this.#props.showX;
  }
  /** Sets `showX`; a new value dispatches `showX-changed` and `change`. */
  set showX(value: boolean) {
    this.#set("showX", value);
  }

  /** Whether the Y handles are shown. */
  get showY(): boolean {
    return this.#props.showY;
  }
  /** Sets `showY`; a new value dispatches `showY-changed` and `change`. */
  set showY(value: boolean) {
    this.#set("showY", value);
  }

  /** Whether the Z handles are shown. */
  get showZ(): boolean {
    return this.#props.showZ;
  }
  /** Sets `showZ`; a new value dispatches `showZ-changed` and `change`. */
  set showZ(value: boolean) {
    this.#set("showZ", value);
  }

  /** Whether the XY plane handle is shown. */
  get showXY(): boolean {
    return this.#props.showXY;
  }
  /** Sets `showXY`; a new value dispatches `showXY-changed` and `change`. */
  set showXY(value: boolean) {
    this.#set("showXY", value);
  }

  /** Whether the YZ plane handle is shown. */
  get showYZ(): boolean {
    return this.#props.showYZ;
  }
  /** Sets `showYZ`; a new value dispatches `showYZ-changed` and `change`. */
  set showYZ(value: boolean) {
    this.#set("showYZ", value);
  }

  /** Whether the XZ plane handle is shown. */
  get showXZ(): boolean {
    return this.#props.showXZ;
  }
  /** Sets `showXZ`; a new value dispatches `showXZ-changed` and `change`. */
  set showXZ(value: boolean) {
    this.#set("showXZ", value);
  }

  /** Whether the free-rotation (XYZE) handle is shown. */
  get showXYZE(): boolean {
    return this.#props.showXYZE;
  }
  /** Sets `showXYZE`; a new value dispatches `showXYZE-changed` and `change`. */
  set showXYZE(value: boolean) {
    this.#set("showXYZE", value);
  }

  /** Whether the view-aligned rotation (E) ring is shown. */
  get showE(): boolean {
    return this.#props.showE;
  }
  /** Sets `showE`; a new value dispatches `showE-changed` and `change`. */
  set showE(value: boolean) {
    this.#set("showE", value);
  }

  /** Lower bound of the translated local x position. */
  get minX(): number {
    return this.#props.minX;
  }
  /** Sets `minX`; a new value dispatches `minX-changed` and `change`. */
  set minX(value: number) {
    this.#set("minX", value);
  }

  /** Upper bound of the translated local x position. */
  get maxX(): number {
    return this.#props.maxX;
  }
  /** Sets `maxX`; a new value dispatches `maxX-changed` and `change`. */
  set maxX(value: number) {
    this.#set("maxX", value);
  }

  /** Lower bound of the translated local y position. */
  get minY(): number {
    return this.#props.minY;
  }
  /** Sets `minY`; a new value dispatches `minY-changed` and `change`. */
  set minY(value: number) {
    this.#set("minY", value);
  }

  /** Upper bound of the translated local y position. */
  get maxY(): number {
    return this.#props.maxY;
  }
  /** Sets `maxY`; a new value dispatches `maxY-changed` and `change`. */
  set maxY(value: number) {
    this.#set("maxY", value);
  }

  /** Lower bound of the translated local z position. */
  get minZ(): number {
    return this.#props.minZ;
  }
  /** Sets `minZ`; a new value dispatches `minZ-changed` and `change`. */
  set minZ(value: number) {
    this.#set("minZ", value);
  }

  /** Upper bound of the translated local z position. */
  get maxZ(): number {
    return this.#props.maxZ;
  }
  /** Sets `maxZ`; a new value dispatches `maxZ-changed` and `change`. */
  set maxZ(value: number) {
    this.#set("maxZ", value);
  }

  /** Angle of the current rotate gesture, in radians. */
  get rotationAngle(): number {
    return this.#props.rotationAngle;
  }
  /** Sets `rotationAngle`; a new value dispatches `rotationAngle-changed` and `change`. */
  set rotationAngle(value: number) {
    this.#set("rotationAngle", value);
  }

  /** Scene node holding the gizmo; add it to the scene to show the controls. */
  get helper(): Node {
    return this.#root;
  }

  /** Raycaster used for handle picking and drag-plane intersection. */
  get raycaster(): Raycaster {
    return this.#raycaster;
  }

  /** Adds pointer listeners and disables browser touch scrolling. */
  connect(element: TransformDomElement): void {
    if (this.domElement !== undefined && this.domElement !== element)
      this.disconnect();
    this.domElement = element;
    element.addEventListener("pointerdown", this.#onPointerDown);
    element.addEventListener("pointermove", this.#onPointerHover);
    element.addEventListener("pointerup", this.#onPointerUp);
    if (element.style) element.style.touchAction = "none";
  }

  /** Removes pointer listeners and restores touch scrolling. */
  disconnect(): void {
    const element = this.domElement;
    if (element === undefined) return;
    element.removeEventListener("pointerdown", this.#onPointerDown);
    element.removeEventListener("pointermove", this.#onPointerHover);
    element.removeEventListener("pointermove", this.#onPointerMove);
    element.removeEventListener("pointerup", this.#onPointerUp);
    if (element.style) element.style.touchAction = "";
  }

  /** Removes listeners and disposes the gizmo geometry and materials. */
  dispose(): void {
    this.disconnect();
    this.#root.dispose();
  }

  /** No per-frame work; present for parity with the `Controls` contract. */
  update(_delta?: number): void {
    /* the helper refreshes its state in updateMatrixWorld() */
  }

  /** Attaches `object` and shows the helper. */
  attach(object: Node): this {
    this.object = object;
    this.#root.visible = true;
    return this;
  }

  /** Detaches the object, clears `axis`, and hides the helper. */
  detach(): this {
    this.object = undefined;
    this.axis = undefined;
    this.#root.visible = false;
    return this;
  }

  /** Restores the transform the object had when the current drag started. */
  reset(): void {
    if (!this.enabled) return;
    const object = this.object;
    if (this.dragging && object !== undefined) {
      object.position.copy(this.#positionStart);
      object.quaternion.copy(this.#quaternionStart);
      object.scale.copy(this.#scaleStart);
      this.dispatchEvent(_changeEvent);
      this.dispatchEvent(_objectChangeEvent);
      this.pointStart.copy(this.pointEnd);
    }
  }

  /**
   * Sets the colors of the X, Y, and Z handles and of the highlighted handle.
   *
   * @param xAxis X handle color.
   * @param yAxis Y handle color.
   * @param zAxis Z handle color.
   * @param active Hovered or dragged handle color.
   */
  setColors(
    xAxis: number | string,
    yAxis: number | string,
    zAxis: number | string,
    active: number | string,
  ): void {
    this.#gizmo.setColors(xAxis, yAxis, zAxis, active);
  }

  /**
   * Sets `axis` to the picker handle under `pointer`, or `undefined`.
   *
   * @param pointer Pointer in normalized device coordinates, or `undefined`
   * to reuse the raycaster's current ray.
   */
  pointerHover(pointer: TransformPointer | undefined): void {
    if (this.object === undefined || this.dragging === true) return;
    if (pointer !== undefined)
      this.#raycaster.setFromCamera(pointer, this.camera);
    const intersect = this.#gizmo.intersectPicker(this.mode, this.#raycaster);
    this.axis = intersect
      ? ((intersect.object as Node).name as TransformAxis)
      : undefined;
  }

  /**
   * Starts a drag on the current `axis` with the primary button.
   *
   * @param pointer Pointer in normalized device coordinates, or `undefined`
   * to reuse the raycaster's current ray.
   */
  pointerDown(pointer: TransformPointer | undefined): void {
    const object = this.object;
    if (
      object === undefined ||
      this.dragging === true ||
      (pointer !== undefined && pointer.button !== 0)
    )
      return;
    if (this.axis === undefined) return;
    if (pointer !== undefined)
      this.#raycaster.setFromCamera(pointer, this.camera);
    const planeIntersect = this.#plane.intersect(
      this.#raycaster,
      this.#planeHit,
    );
    if (planeIntersect) {
      object.updateMatrixWorld();
      object.parent?.updateMatrixWorld();
      this.#positionStart.copy(object.position);
      this.#quaternionStart.copy(object.quaternion);
      this.#scaleStart.copy(object.scale);
      object.matrixWorld.decompose(
        this.worldPositionStart,
        this.worldQuaternionStart,
        this.#worldScaleStart,
      );
      this.pointStart.copy(planeIntersect).sub(this.worldPositionStart);
    }
    this.dragging = true;
    _mouseDownEvent.mode = this.mode;
    this.dispatchEvent(_mouseDownEvent);
  }

  /**
   * Applies the drag to the attached object.
   *
   * @param pointer Pointer in normalized device coordinates with `button`
   * `-1`, or `undefined` to reuse the raycaster's current ray.
   */
  pointerMove(pointer: TransformPointer | undefined): void {
    const axis = this.axis;
    const mode = this.mode;
    const object = this.object;
    let space = this.space;
    if (mode === "scale") space = "local";
    else if (axis === "E" || axis === "XYZE" || axis === "XYZ") space = "world";

    if (
      object === undefined ||
      axis === undefined ||
      this.dragging === false ||
      (pointer !== undefined && pointer.button !== -1)
    )
      return;
    if (pointer !== undefined)
      this.#raycaster.setFromCamera(pointer, this.camera);
    const planeIntersect = this.#plane.intersect(
      this.#raycaster,
      this.#planeHit,
    );
    if (!planeIntersect) return;
    this.pointEnd.copy(planeIntersect).sub(this.worldPositionStart);

    if (mode === "translate") this.#translate(object, axis, space);
    else if (mode === "scale") this.#scale(object, axis);
    else this.#rotate(object, axis, space);

    this.dispatchEvent(_changeEvent);
    this.dispatchEvent(_objectChangeEvent);
  }

  /**
   * Ends the drag with the primary button and clears `axis`.
   *
   * @param pointer Pointer in normalized device coordinates, or `undefined`.
   */
  pointerUp(pointer: TransformPointer | undefined): void {
    if (pointer !== undefined && pointer.button !== 0) return;
    if (this.dragging && this.axis !== undefined) {
      _mouseUpEvent.mode = this.mode;
      this.dispatchEvent(_mouseUpEvent);
    }
    this.dragging = false;
    this.axis = undefined;
  }

  #set<K extends keyof TransformProperties>(
    key: K,
    value: TransformProperties[K],
  ): void {
    if (this.#props[key] === value) return;
    this.#props[key] = value;
    let event = this.#propertyEvents.get(key);
    if (event === undefined) {
      event = { type: `${key}-changed`, value };
      this.#propertyEvents.set(key, event);
    }
    event.value = value;
    this.dispatchEvent(event);
    event.value = undefined;
    this.dispatchEvent(_changeEvent);
  }

  #translate(object: Node, axis: TransformAxis, space: TransformSpace): void {
    const root = this.#root;
    const offset = this.#offset.copy(this.pointEnd).sub(this.pointStart);
    if (space === "local" && axis !== "XYZ")
      offset.applyQuaternion(root.worldQuaternionInv);
    if (!axis.includes("X")) offset.x = 0;
    if (!axis.includes("Y")) offset.y = 0;
    if (!axis.includes("Z")) offset.z = 0;
    if (space === "local" && axis !== "XYZ")
      offset.applyQuaternion(this.#quaternionStart).divide(root.parentScale);
    else
      offset.applyQuaternion(root.parentQuaternionInv).divide(root.parentScale);
    object.position.copy(offset).add(this.#positionStart);

    const snap = this.translationSnap;
    if (snap) {
      if (space === "local") {
        object.position.applyQuaternion(
          _tempQuaternion.copy(this.#quaternionStart).invert(),
        );
        if (axis.includes("X"))
          object.position.x = Math.round(object.position.x / snap) * snap;
        if (axis.includes("Y"))
          object.position.y = Math.round(object.position.y / snap) * snap;
        if (axis.includes("Z"))
          object.position.z = Math.round(object.position.z / snap) * snap;
        object.position.applyQuaternion(this.#quaternionStart);
      }
      if (space === "world") {
        object.updateMatrixWorld(true, false);
        object.getWorldPosition(_tempVector);
        if (axis.includes("X"))
          _tempVector.x = Math.round(_tempVector.x / snap) * snap;
        if (axis.includes("Y"))
          _tempVector.y = Math.round(_tempVector.y / snap) * snap;
        if (axis.includes("Z"))
          _tempVector.z = Math.round(_tempVector.z / snap) * snap;
        object.position.copy(
          object.parent?.worldToLocal(_tempVector) ?? _tempVector,
        );
      }
    }

    object.position.x = Math.max(
      this.minX,
      Math.min(this.maxX, object.position.x),
    );
    object.position.y = Math.max(
      this.minY,
      Math.min(this.maxY, object.position.y),
    );
    object.position.z = Math.max(
      this.minZ,
      Math.min(this.maxZ, object.position.z),
    );
  }

  #scale(object: Node, axis: TransformAxis): void {
    if (axis.includes("XYZ")) {
      let d = this.pointEnd.length / this.pointStart.length;
      if (this.pointEnd.dot(this.pointStart) < 0) d *= -1;
      _tempVector2.set(d, d, d);
    } else {
      const inverse = this.#root.worldQuaternionInv;
      _tempVector.copy(this.pointStart).applyQuaternion(inverse);
      _tempVector2.copy(this.pointEnd).applyQuaternion(inverse);
      _tempVector2.divide(_tempVector);
      if (!axis.includes("X")) _tempVector2.x = 1;
      if (!axis.includes("Y")) _tempVector2.y = 1;
      if (!axis.includes("Z")) _tempVector2.z = 1;
    }
    object.scale.copy(this.#scaleStart).multiply(_tempVector2);

    const snap = this.scaleSnap;
    if (snap) {
      if (axis.includes("X"))
        object.scale.x = Math.round(object.scale.x / snap) * snap || snap;
      if (axis.includes("Y"))
        object.scale.y = Math.round(object.scale.y / snap) * snap || snap;
      if (axis.includes("Z"))
        object.scale.z = Math.round(object.scale.z / snap) * snap || snap;
    }
  }

  #rotate(object: Node, axis: TransformAxis, space: TransformSpace): void {
    const offset = this.#offset.copy(this.pointEnd).sub(this.pointStart);
    const eye = this.eye;
    const rotationAxis = this.rotationAxis;
    const ROTATION_SPEED =
      20 /
      this.worldPosition.distanceTo(
        _tempVector.setFromMatrixPosition(this.camera.matrixWorld),
      );
    let inPlaneRotation = false;

    if (axis === "XYZE") {
      rotationAxis.copy(offset).cross(eye).normalize();
      this.rotationAngle =
        offset.dot(_tempVector.copy(rotationAxis).cross(eye)) * ROTATION_SPEED;
    } else if (axis === "X" || axis === "Y" || axis === "Z") {
      rotationAxis.copy(_unit[axis]);
      _tempVector.copy(_unit[axis]);
      if (space === "local") _tempVector.applyQuaternion(this.worldQuaternion);
      _tempVector.cross(eye);
      // A zero cross product means the axis faces the camera; rotate in plane.
      if (_tempVector.length === 0) inPlaneRotation = true;
      else
        this.rotationAngle =
          offset.dot(_tempVector.normalize()) * ROTATION_SPEED;
    }

    if (axis === "E" || inPlaneRotation) {
      rotationAxis.copy(eye);
      // Two assignments, as in three.js, so listeners see the same events.
      this.rotationAngle = this.pointEnd.angleTo(this.pointStart);
      this.#startNorm.copy(this.pointStart).normalize();
      this.#endNorm.copy(this.pointEnd).normalize();
      this.rotationAngle *=
        this.#endNorm.cross(this.#startNorm).dot(eye) < 0 ? 1 : -1;
    }

    const snap = this.rotationSnap;
    if (snap) this.rotationAngle = Math.round(this.rotationAngle / snap) * snap;

    if (space === "local" && axis !== "E" && axis !== "XYZE") {
      object.quaternion.copy(this.#quaternionStart);
      object.quaternion
        .multiply(
          _tempQuaternion.setFromAxisAngle(rotationAxis, this.rotationAngle),
        )
        .normalize();
    } else {
      rotationAxis.applyQuaternion(this.#root.parentQuaternionInv);
      object.quaternion.copy(
        _tempQuaternion.setFromAxisAngle(rotationAxis, this.rotationAngle),
      );
      object.quaternion.multiply(this.#quaternionStart).normalize();
    }
  }

  #getPointer(
    element: TransformDomElement,
    event: TransformPointerEvent,
  ): TransformPointer {
    const pointer = this.#pointer;
    pointer.button = event.button;
    if (element.ownerDocument?.pointerLockElement) {
      pointer.x = 0;
      pointer.y = 0;
      return pointer;
    }
    const rect = element.getBoundingClientRect();
    const viewport = this.viewport;
    let originX = 0;
    let originY = 0;
    let regionWidth = rect.width;
    let regionHeight = rect.height;
    if (viewport !== undefined) {
      originX = viewport.x;
      originY = rect.height - viewport.y - viewport.w;
      regionWidth = viewport.z;
      regionHeight = viewport.w;
    }
    pointer.x = ((event.clientX - rect.left - originX) / regionWidth) * 2 - 1;
    pointer.y = (-(event.clientY - rect.top - originY) / regionHeight) * 2 + 1;
    return pointer;
  }

  #handlePointerHover(event: TransformPointerEvent): void {
    const element = this.domElement;
    if (!this.enabled || element === undefined) return;
    if (event.pointerType === "mouse" || event.pointerType === "pen")
      this.pointerHover(this.#getPointer(element, event));
  }

  #handlePointerDown(event: TransformPointerEvent): void {
    const element = this.domElement;
    if (!this.enabled || element === undefined) return;
    if (!element.ownerDocument?.pointerLockElement)
      element.setPointerCapture(event.pointerId);
    element.addEventListener("pointermove", this.#onPointerMove);
    this.pointerHover(this.#getPointer(element, event));
    this.pointerDown(this.#getPointer(element, event));
  }

  #handlePointerMove(event: TransformPointerEvent): void {
    const element = this.domElement;
    if (!this.enabled || element === undefined) return;
    this.pointerMove(this.#getPointer(element, event));
  }

  #handlePointerUp(event: TransformPointerEvent): void {
    const element = this.domElement;
    if (!this.enabled || element === undefined) return;
    element.releasePointerCapture(event.pointerId);
    element.removeEventListener("pointermove", this.#onPointerMove);
    this.pointerUp(this.#getPointer(element, event));
  }
}
