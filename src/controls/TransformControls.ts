import { EventDispatcher } from "../core/EventDispatcher.ts";
import type { Node } from "../core/Node.ts";
import type { RaycastCamera } from "../core/Raycaster.ts";
import { Raycaster } from "../core/Raycaster.ts";
import { BasicMaterial } from "../materials/BasicMaterial.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Quaternion } from "../math/Quaternion.ts";
import { Vector3 } from "../math/Vector3.ts";
import {
  _axis,
  _axis2,
  _axisColors,
  _cameraNormal,
  _delta,
  _gizmoAxes,
  _planeColors,
  _pointer,
  _rotation,
  _target,
  _v0,
  _v1,
  axisVector,
  firstAxis,
  type GizmoAxis,
  makeTransformGizmo,
  pointToSegmentDistance,
  ringPoint,
  type TransformGizmoParts,
} from "./_TransformGizmo.ts";
import {
  type ControlDomElement,
  type ControlEvent,
  prevent,
} from "./ControlDom.ts";

/**
 * Transformation operation applied by a {@link TransformControls} gesture.
 *
 * Translation moves the attached node, rotation changes its orientation, and
 * scale changes its size along the selected axis or axes.
 */
export type TransformMode = "translate" | "rotate" | "scale";
/**
 * Coordinate space used to interpret transform axes and rotations.
 *
 * World-space operations use the scene axes, while local-space operations
 * follow the attached node's current orientation.
 */
export type TransformSpace = "world" | "local";
/**
 * Axis, axis-plane, or free-transform handle selected for a gesture.
 *
 * `null` leaves handle selection to pointer picking, while `XYZ` applies a
 * free transform around the node origin.
 */
export type TransformAxis = "X" | "Y" | "Z" | "XY" | "YZ" | "XZ" | "XYZ" | null;
/**
 * Optional sub-viewport used to map pointer coordinates to a camera.
 *
 * Coordinates are measured in CSS pixels from the viewport's left and bottom
 * edges, with `width` and `height` defining the active pointer area.
 */
export interface TransformViewport {
  /** Horizontal offset from the containing element's left edge in CSS pixels. */
  x: number;
  /** Vertical offset from the containing element's bottom edge in CSS pixels. */
  y: number;
  /** Width of the active pointer area in CSS pixels. */
  width: number;
  /** Height of the active pointer area in CSS pixels. */
  height: number;
}
/**
 * Pointer data accepted by the imperative transform gesture methods.
 *
 * Supply client coordinates for browser events or normalized device
 * coordinates in `x` and `y` when working with a custom input source.
 */
export interface TransformPointer {
  /** Normalized device-coordinate horizontal position, when clientX is absent. */
  x?: number;
  /** Normalized device-coordinate vertical position, when clientY is absent. */
  y?: number;
  /** Client-space horizontal position in CSS pixels. */
  clientX?: number;
  /** Client-space vertical position in CSS pixels. */
  clientY?: number;
  /** Mouse button index; pointer-down accepts the primary button (0). */
  button?: number;
  /** Pointer identifier used to pair down, move, and up gestures. */
  pointerId?: number;
}
type PlaneAxis = "XY" | "YZ" | "XZ";
type PickCandidate = { axis: TransformAxis; distance: number };
type PickContext = {
  pointerX: number;
  pointerY: number;
  candidate: PickCandidate;
};
const DRAG_THRESHOLD_PX = 3;
const GIZMO_PICK_THRESHOLD_PX = 18;
const GIZMO_HIGHLIGHT_COLOR = 0xffff00;
const _cross = new Vector3();
const _identityQuaternion = new Quaternion();
const _planeDefinitions: Array<[PlaneAxis, Vector3]> = [
  ["XY", new Vector3(0.42, 0.42, 0)],
  ["YZ", new Vector3(0, 0.42, 0.42)],
  ["XZ", new Vector3(0.42, 0, 0.42)],
];

function axisVisible(
  axis: GizmoAxis,
  showX: boolean,
  showY: boolean,
  showZ: boolean,
): boolean {
  if (axis === "X") return showX;
  if (axis === "Y") return showY;
  return showZ;
}
function planeVisible(
  axis: PlaneAxis,
  showX: boolean,
  showY: boolean,
  showZ: boolean,
): boolean {
  if (axis === "XY") return showX && showY;
  if (axis === "YZ") return showY && showZ;
  return showX && showZ;
}
function closer(
  current: PickCandidate,
  axis: TransformAxis,
  distance: number,
  threshold: number,
): PickCandidate {
  return distance <= threshold && distance < current.distance
    ? { axis, distance }
    : current;
}
function screenDistance(x: number, y: number, point: Vector3): number {
  return Math.hypot(x - point.x, y - point.y);
}

/** CPU/Canvas2D equivalent of THREE.TransformControls. */
export class TransformControls extends EventDispatcher {
  /** Camera used to construct CPU pointer rays. */ camera: RaycastCamera;
  /** Event target receiving pointer listeners. */ domElement: ControlDomElement;
  /** Attached node, or undefined when detached. */ object: Node | undefined;
  /** Whether pointer interaction is enabled. */ enabled: boolean = true;
  /** Active transformation mode. */ mode: TransformMode = "translate";
  /** Pointer axis override; null enables gizmo handle picking. */ axis: TransformAxis =
    null;
  /** Coordinate space used for axis and rotation operations. */ space: TransformSpace =
    "world";
  /** Optional translation increment. */ translationSnap: number | null = null;
  /** Optional rotation increment in radians. */ rotationSnap: number | null =
    null;
  /** Optional scale increment. */ scaleSnap: number | null = null;
  /** Visual gizmo size. */ size = 1;
  /** Whether the x-axis handle is available. */ showX: boolean = true;
  /** Whether the y-axis handle is available. */ showY: boolean = true;
  /** Whether the z-axis handle is available. */ showZ: boolean = true;
  /** Optional pointer viewport override. */ viewport: TransformViewport | null =
    null;
  /** Whether a pointer gesture is modifying the object. */ dragging: boolean = false;
  /** Reusable CPU pointer raycaster. */ raycaster: Raycaster;
  #pointerId = -1;
  #activeAxis: TransformAxis = null;
  #hoveredAxis: TransformAxis = null;
  #selectedAxis: TransformAxis = null;
  #pendingPointer = false;
  #startMode: TransformMode = "translate";
  #startSpace: TransformSpace = "world";
  readonly #startWorldPosition = new Vector3();
  readonly #startLocalPosition = new Vector3();
  readonly #startQuaternion = new Quaternion();
  readonly #startScale = new Vector3(1, 1, 1);
  readonly #startPointer = new Vector3();
  readonly #planeNormal = new Vector3(0, 0, 1);
  #startClientX = 0;
  #startClientY = 0;
  readonly #listeners: Array<[string, EventListener]> = [];
  readonly #helper: Node;
  readonly #gizmo: TransformGizmoParts;
  readonly #projection = new Matrix4();
  readonly #view = new Matrix4();
  readonly #projectedOrigin = new Vector3();
  readonly #projectedAxis = new Vector3();
  readonly #initialPosition = new Vector3();
  readonly #initialQuaternion = new Quaternion();
  readonly #initialScale = new Vector3(1, 1, 1);
  #hasInitial = false;

  /** Creates controls and installs pointer listeners. */
  constructor(
    camera: RaycastCamera,
    domElement: ControlDomElement,
    raycaster: Raycaster = new Raycaster(),
  ) {
    super();
    this.camera = camera;
    this.domElement = domElement;
    this.raycaster = raycaster;
    ({ helper: this.#helper, parts: this.#gizmo } = makeTransformGizmo());
    this.#helper.visible = false;
    this.#listen("pointerdown", this.#onPointerDown.bind(this));
    this.#listen("pointermove", this.#onPointerMove.bind(this));
    this.#listen("pointerleave", this.#onPointerLeave.bind(this));
    this.#listen("pointerup", this.#onPointerUp.bind(this));
    this.#listen("pointercancel", this.#onPointerUp.bind(this));
    this.#listen("contextmenu", (event) => prevent(event));
    if (domElement.style) domElement.style.touchAction = "none";
    if (domElement.tabIndex !== undefined && domElement.tabIndex < 0)
      domElement.tabIndex = 0;
  }

  /** Attaches a node and updates its world transform. */
  attach(object: Node): this {
    this.#endDrag();
    this.object = object;
    this.#hoveredAxis = null;
    this.#selectedAxis = null;
    object.updateMatrixWorld(true, true);
    this.#initialPosition.copy(object.position);
    this.#initialQuaternion.copy(object.quaternion);
    this.#initialScale.copy(object.scale);
    this.#hasInitial = true;
    this.#syncHelper();
    this.dispatchEvent({ type: "change" });
    return this;
  }
  /** Detaches the current node and ends any active gesture. */
  detach(): this {
    this.#endDrag();
    this.object = undefined;
    this.#hasInitial = false;
    this.#hoveredAxis = null;
    this.#selectedAxis = null;
    this.#syncHelper();
    this.dispatchEvent({ type: "change" });
    return this;
  }
  /** Renderable CPU gizmo node. */ get helper(): Node {
    return this.#helper;
  }
  /** Restores the transform captured by the most recent attach. */
  reset(): this {
    if (this.object && this.#hasInitial) {
      this.object.position.copy(this.#initialPosition);
      this.object.quaternion.copy(this.#initialQuaternion);
      this.object.rotation.setFromQuaternion(this.object.quaternion);
      this.object.scale.copy(this.#initialScale);
      this.object.matrixWorldNeedsUpdate = true;
      this.object.updateMatrixWorld(true, true);
      this.#syncHelper();
      this.dispatchEvent({ type: "change" });
      this.dispatchEvent({ type: "objectChange" });
    }
    return this;
  }
  /** Changes the active transform mode and notifies listeners. */
  setMode(mode: TransformMode): this {
    if (this.mode !== mode) {
      this.mode = mode;
      this.#syncHelper();
      this.dispatchEvent({ type: "mode-changed", value: mode });
      this.dispatchEvent({ type: "change" });
    }
    return this;
  }
  /** Sets the coordinate space used for operations. */
  setSpace(space: TransformSpace): this {
    if (this.space !== space) {
      this.space = space;
      this.#syncHelper();
      this.dispatchEvent({ type: "space-changed", value: space });
      this.dispatchEvent({ type: "change" });
    }
    return this;
  }
  /** Sets the translation snap increment. */
  setTranslationSnap(value: number | null): this {
    this.translationSnap = value;
    return this;
  }
  /** Sets the rotation snap increment. */
  setRotationSnap(value: number | null): this {
    this.rotationSnap = value;
    return this;
  }
  /** Sets the scale snap increment. */
  setScaleSnap(value: number | null): this {
    this.scaleSnap = value;
    return this;
  }
  /** Sets the host gizmo size. */
  setSize(value: number): this {
    if (!Number.isFinite(value) || value <= 0)
      throw new RangeError(
        "TransformControls.size must be positive and finite.",
      );
    this.size = value;
    this.#syncHelper();
    return this;
  }
  /** Changes the active axis handle and notifies listeners. */
  setAxis(axis: TransformAxis): this {
    if (this.axis !== axis) {
      this.axis = axis;
      this.#syncHelper();
      this.dispatchEvent({ type: "axis-changed", value: axis });
      this.dispatchEvent({ type: "change" });
    }
    return this;
  }
  /** Applies pending node matrix updates and reports gesture state. */
  update(): boolean {
    this.object?.updateMatrixWorld(true, true);
    this.#syncHelper();
    return this.dragging;
  }
  /** Compatibility alias for scene graphs. */
  updateMatrixWorld(_force = false): void {
    this.update();
  }
  /** Processes a normalized or client-space pointer-down event. */
  pointerDown(event: TransformPointer): void {
    this.#onPointerDown(this.#normalizePointerEvent(event));
  }
  /** Processes a normalized or client-space pointer-move event. */
  pointerMove(event: TransformPointer): void {
    this.#onPointerMove(this.#normalizePointerEvent(event));
  }
  /** Processes a pointer-up event and finishes the gesture. */
  pointerUp(event: TransformPointer): void {
    this.#onPointerUp(this.#normalizePointerEvent(event));
  }
  /** Removes listeners, ends input, and detaches the object. */
  dispose(): void {
    for (const [type, listener] of this.#listeners)
      this.domElement.removeEventListener(type, listener);
    this.#listeners.length = 0;
    this.#endDrag();
    this.object = undefined;
    this.#hasInitial = false;
    this.#helper.visible = false;
  }

  #listen(type: string, listener: EventListener): void {
    this.domElement.addEventListener(type, listener);
    this.#listeners.push([type, listener]);
  }
  #syncHelper(): void {
    const object = this.object;
    if (object === undefined) {
      this.#helper.visible = false;
      return;
    }
    object.updateMatrixWorld(true, true);
    object.getWorldPosition(this.#projectedOrigin);
    object.getWorldQuaternion(_rotation);
    this.#helper.position.copy(this.#projectedOrigin);
    this.#helper.quaternion.copy(_rotation);
    this.#helper.scale.setScalar(this.size);
    this.#helper.visible = this.enabled;
    for (const axis of _gizmoAxes) {
      const visible = axisVisible(axis, this.showX, this.showY, this.showZ);
      this.#gizmo.arrows[axis].visible = visible && this.mode === "translate";
      this.#gizmo.rings[axis].visible = visible && this.mode === "rotate";
      this.#gizmo.scales[axis].visible = visible && this.mode === "scale";
    }
    this.#gizmo.planes.XY.visible =
      this.mode === "translate" &&
      planeVisible("XY", this.showX, this.showY, this.showZ);
    this.#gizmo.planes.YZ.visible =
      this.mode === "translate" &&
      planeVisible("YZ", this.showX, this.showY, this.showZ);
    this.#gizmo.planes.XZ.visible =
      this.mode === "translate" &&
      planeVisible("XZ", this.showX, this.showY, this.showZ);
    this.#helper.updateMatrixWorld(false, true);
    this.#syncGizmoHighlight();
  }
  #syncGizmoHighlight(): void {
    const highlighted =
      this.#activeAxis ??
      this.#hoveredAxis ??
      this.#selectedAxis ??
      (this.axis === "XYZ" ? "XYZ" : this.axis);
    for (const axis of _gizmoAxes) {
      const isHighlighted = highlighted === "XYZ" || highlighted === axis;
      const arrow = this.#gizmo.arrows[axis];
      arrow.color = isHighlighted ? GIZMO_HIGHLIGHT_COLOR : _axisColors[axis];
      const lineMaterial = arrow.line.material;
      if (lineMaterial instanceof LineMaterial)
        lineMaterial.linewidth = isHighlighted ? 4 : 3;
      const coneMaterial = arrow.cone.material;
      if (coneMaterial instanceof BasicMaterial)
        coneMaterial.color.hex = isHighlighted
          ? GIZMO_HIGHLIGHT_COLOR
          : _axisColors[axis];

      const ringMaterial = this.#gizmo.rings[axis].material;
      if (ringMaterial instanceof LineMaterial) {
        ringMaterial.color.hex = isHighlighted
          ? GIZMO_HIGHLIGHT_COLOR
          : _axisColors[axis];
        ringMaterial.linewidth = isHighlighted ? 4 : 2;
      }
      const scaleMaterial = this.#gizmo.scales[axis].material;
      if (scaleMaterial instanceof BasicMaterial)
        scaleMaterial.color.hex = isHighlighted
          ? GIZMO_HIGHLIGHT_COLOR
          : _axisColors[axis];
    }

    for (const axis of ["XY", "YZ", "XZ"] as const) {
      const material = this.#gizmo.planes[axis].material;
      if (!(material instanceof BasicMaterial)) continue;
      const isHighlighted = highlighted === axis || highlighted === "XYZ";
      material.color.hex = isHighlighted
        ? GIZMO_HIGHLIGHT_COLOR
        : _planeColors[axis];
      material.opacity = isHighlighted ? 1 : 4;
    }
  }
  #projectToScreen(world: Vector3, target: Vector3): boolean {
    const camera = this.camera as RaycastCamera & {
      projectionMatrix?: { elements: ArrayLike<number> };
    };
    if (camera.projectionMatrix)
      this.#projection.elements.set(camera.projectionMatrix.elements);
    else this.#projectionFromInverse(camera);
    this.#view.elements.set(camera.matrixWorld.elements);
    this.#view.invert();
    target.copy(world).applyMatrix4(this.#view).applyMatrix4(this.#projection);
    if (!(Number.isFinite(target.x) && Number.isFinite(target.y))) return false;
    const rect = this.domElement.getBoundingClientRect?.();
    const availableWidth = rect?.width ?? this.domElement.clientWidth ?? 800;
    const availableHeight = rect?.height ?? this.domElement.clientHeight ?? 600;
    const viewport = this.viewport;
    const viewportLeft = viewport?.x ?? 0;
    const viewportTop =
      viewport === null ? 0 : availableHeight - viewport.y - viewport.height;
    const viewportWidth = viewport?.width ?? availableWidth;
    const viewportHeight = viewport?.height ?? availableHeight;
    target.x =
      (rect?.left ?? 0) + viewportLeft + (target.x + 1) * 0.5 * viewportWidth;
    target.y =
      (rect?.top ?? 0) + viewportTop + (1 - target.y) * 0.5 * viewportHeight;
    return true;
  }
  #projectionFromInverse(camera: RaycastCamera): Matrix4 {
    this.#projection.elements.set(camera.projectionMatrixInverse.elements);
    return this.#projection.invert();
  }
  #visualAxis(axis: GizmoAxis, target: Vector3): Vector3 {
    axisVector(axis, target);
    if (this.space === "local" && this.object !== undefined) {
      this.object.getWorldQuaternion(_rotation);
      target.applyQuaternion(_rotation).normalize();
    }
    return target;
  }
  #pickAxis(event: ControlEvent): TransformAxis {
    if (this.object === undefined) return null;
    const context: PickContext = {
      pointerX: event.clientX ?? 0,
      pointerY: event.clientY ?? 0,
      candidate: { axis: null, distance: Number.POSITIVE_INFINITY },
    };
    this.object.getWorldPosition(_target);
    if (!this.#projectToScreen(_target, this.#projectedOrigin)) return null;
    if (
      screenDistance(
        context.pointerX,
        context.pointerY,
        this.#projectedOrigin,
      ) <= 10
    )
      return "XYZ";
    if (this.mode === "translate")
      context.candidate = this.#pickPlanes(context);
    for (const axis of _gizmoAxes)
      context.candidate = this.#pickSingleAxis(axis, context);
    return context.candidate.axis;
  }
  #pickPlanes(context: PickContext): PickCandidate {
    for (const [axis, offset] of _planeDefinitions) {
      if (!planeVisible(axis, this.showX, this.showY, this.showZ)) continue;
      const point = offset
        .clone()
        .applyQuaternion(this.#worldQuaternion())
        .add(_target);
      if (this.#projectToScreen(point, this.#projectedAxis))
        context.candidate = closer(
          context.candidate,
          axis,
          screenDistance(
            context.pointerX,
            context.pointerY,
            this.#projectedAxis,
          ),
          GIZMO_PICK_THRESHOLD_PX,
        );
    }
    return context.candidate;
  }
  #pickSingleAxis(axis: GizmoAxis, context: PickContext): PickCandidate {
    if (!axisVisible(axis, this.showX, this.showY, this.showZ))
      return context.candidate;
    const endpoint = _target
      .clone()
      .addScaledVector(this.#visualAxis(axis, _axis), 1.35 * this.size);
    if (!this.#projectToScreen(endpoint, this.#projectedAxis))
      return context.candidate;
    if (this.mode === "rotate") return this.#pickRing(axis, context);
    return closer(
      context.candidate,
      axis,
      pointToSegmentDistance(
        context.pointerX,
        context.pointerY,
        this.#projectedOrigin.x,
        this.#projectedOrigin.y,
        this.#projectedAxis.x,
        this.#projectedAxis.y,
      ),
      GIZMO_PICK_THRESHOLD_PX,
    );
  }
  #pickRing(axis: GizmoAxis, context: PickContext): PickCandidate {
    let closest = Number.POSITIVE_INFINITY;
    for (let index = 0; index < 24; index++) {
      const point = ringPoint(
        axis,
        (index / 24) * Math.PI * 2,
        1.05 * this.size,
        _v0,
      )
        .applyQuaternion(this.#worldQuaternion())
        .add(_target);
      if (this.#projectToScreen(point, _v1))
        closest = Math.min(
          closest,
          screenDistance(context.pointerX, context.pointerY, _v1),
        );
    }
    return closer(context.candidate, axis, closest, GIZMO_PICK_THRESHOLD_PX);
  }
  #worldQuaternion(): Quaternion {
    if (this.space === "local" && this.object !== undefined) {
      this.object.getWorldQuaternion(_rotation);
      return _rotation;
    }
    return _identityQuaternion;
  }
  #normalizePointerEvent(event: TransformPointer): Event {
    if (event.clientX !== undefined || event.clientY !== undefined)
      return event as unknown as Event;
    const width = this.domElement.clientWidth ?? 800;
    const height = this.domElement.clientHeight ?? 600;
    const rect = this.domElement.getBoundingClientRect?.();
    const availableWidth = rect?.width ?? width;
    const availableHeight = rect?.height ?? height;
    const viewport = this.viewport;
    const viewportLeft = viewport?.x ?? 0;
    const viewportTop =
      viewport === null ? 0 : availableHeight - viewport.y - viewport.height;
    const viewportWidth = viewport?.width ?? availableWidth;
    const viewportHeight = viewport?.height ?? availableHeight;
    return {
      ...event,
      clientX:
        (rect?.left ?? 0) +
        viewportLeft +
        ((event.x ?? 0) + 1) * 0.5 * viewportWidth,
      clientY:
        (rect?.top ?? 0) +
        viewportTop +
        (1 - (event.y ?? 0)) * 0.5 * viewportHeight,
    } as unknown as Event;
  }
  #setPointer(event: ControlEvent): void {
    const width = this.domElement.clientWidth ?? 800;
    const height = this.domElement.clientHeight ?? 600;
    const rect = this.domElement.getBoundingClientRect?.();
    const left = rect?.left ?? 0;
    const top = rect?.top ?? 0;
    const availableWidth = rect?.width ?? width;
    const availableHeight = rect?.height ?? height;
    const viewport = this.viewport;
    const viewportTop =
      viewport === null ? 0 : availableHeight - viewport.y - viewport.height;
    const viewportWidth = viewport?.width ?? availableWidth;
    const viewportHeight = viewport?.height ?? availableHeight;
    const x =
      ((event.clientX ?? 0) - left - (viewport?.x ?? 0)) / viewportWidth;
    const y = ((event.clientY ?? 0) - top - viewportTop) / viewportHeight;
    this.raycaster.setFromCamera({ x: x * 2 - 1, y: 1 - y * 2 }, this.camera);
  }
  #intersectPointer(event: ControlEvent): Vector3 | undefined {
    this.#setPointer(event);
    return this.raycaster.ray.intersectPlane(
      {
        normal: this.#planeNormal,
        constant: -this.#planeNormal.dot(this.#startWorldPosition),
      },
      _pointer,
    );
  }
  #onPointerDown(raw: Event): void {
    const event = raw as ControlEvent;
    const object = this.object;
    if (!this.enabled || object === undefined || (event.button ?? 0) !== 0)
      return;
    this.domElement.focus?.();
    object.updateMatrixWorld(true, true);
    const pickedAxis =
      this.axis ??
      (event as ControlEvent & { axis?: TransformAxis }).axis ??
      this.#pickAxis(event);
    if (pickedAxis === null) {
      this.#selectedAxis = null;
      this.#hoveredAxis = null;
      this.#syncHelper();
      return;
    }
    this.#activeAxis = pickedAxis;
    this.#selectedAxis = pickedAxis;
    this.#hoveredAxis = pickedAxis;
    this.#startMode = this.mode;
    this.#startSpace = this.space;
    this.#startWorldPosition.copy(object.getWorldPosition(_target));
    this.#startLocalPosition.copy(object.position);
    this.#startQuaternion.copy(object.quaternion);
    this.#startScale.copy(object.scale);
    this.#startClientX = event.clientX ?? 0;
    this.#startClientY = event.clientY ?? 0;
    const elements = this.camera.matrixWorld.elements;
    _cameraNormal.set(-elements[8], -elements[9], -elements[10]).normalize();
    this.#planeNormal.copy(_cameraNormal);
    if (this.#startMode === "rotate" && this.#activeAxis.length === 1) {
      const rotationAxis = this.#worldAxis(this.#activeAxis, _axis);
      this.#planeNormal.copy(rotationAxis);
      if (Math.abs(rotationAxis.dot(_cameraNormal)) < 0.25)
        this.#planeNormal.add(_cameraNormal).normalize();
    } else if (this.#activeAxis.length === 2) {
      axisVector(this.#activeAxis[0], _axis);
      axisVector(this.#activeAxis[1], _axis2);
      if (this.#startSpace === "local") {
        object.getWorldQuaternion(_rotation);
        _axis.applyQuaternion(_rotation);
        _axis2.applyQuaternion(_rotation);
      }
      this.#planeNormal.crossVectors(_axis, _axis2).normalize();
    }
    if (this.#planeNormal.lengthSq === 0) this.#planeNormal.set(0, 0, 1);
    this.#startPointer.copy(
      this.#intersectPointer(event) ?? this.#startWorldPosition,
    );
    this.#pendingPointer = true;
    this.dragging = false;
    this.#pointerId = event.pointerId ?? 0;
    this.domElement.setPointerCapture?.(this.#pointerId);
    this.#syncHelper();
    this.dispatchEvent({ type: "mouseDown", mode: this.#startMode });
  }
  #onPointerMove(raw: Event): void {
    if (!this.enabled) return;
    const object = this.object;
    if (object === undefined) return;
    const event = raw as ControlEvent;
    if (!this.#pendingPointer && !this.dragging) {
      const hoveredAxis = this.#pickAxis(event);
      if (hoveredAxis !== this.#hoveredAxis) {
        this.#hoveredAxis = hoveredAxis;
        this.#syncHelper();
        this.dispatchEvent({ type: "change" });
      }
      return;
    }
    if ((event.pointerId ?? 0) !== this.#pointerId) return;
    if (!this.dragging) {
      const distance = Math.hypot(
        (event.clientX ?? this.#startClientX) - this.#startClientX,
        (event.clientY ?? this.#startClientY) - this.#startClientY,
      );
      if (distance < DRAG_THRESHOLD_PX) return;
      this.dragging = true;
      this.#syncHelper();
    }
    const pointer = this.#intersectPointer(event);
    if (pointer === undefined) return;
    _pointer.copy(pointer);
    _delta.copy(_pointer).sub(this.#startPointer);
    if (this.#startMode === "translate") this.#translate(_delta);
    else if (this.#startMode === "rotate") this.#rotate(_pointer, event);
    else this.#scale(_delta, event);
    object.updateMatrixWorld(true, true);
    this.dispatchEvent({ type: "change" });
    this.dispatchEvent({ type: "objectChange" });
  }
  #onPointerLeave(): void {
    if (this.#pendingPointer || this.dragging || this.#hoveredAxis === null)
      return;
    this.#hoveredAxis = null;
    this.#syncHelper();
    this.dispatchEvent({ type: "change" });
  }
  #onPointerUp(raw: Event): void {
    const event = raw as ControlEvent;
    if (
      !(this.#pendingPointer || this.dragging) ||
      (event.pointerId ?? 0) !== this.#pointerId
    )
      return;
    this.domElement.releasePointerCapture?.(this.#pointerId);
    this.#endDrag();
    this.#syncHelper();
    this.dispatchEvent({ type: "mouseUp", mode: this.#startMode });
  }
  #endDrag(): void {
    this.#pendingPointer = false;
    this.dragging = false;
    this.#pointerId = -1;
    this.#activeAxis = null;
  }
  #worldAxis(axis: string, target: Vector3): Vector3 {
    axisVector(axis, target);
    if (this.#startSpace === "local" && this.object !== undefined) {
      this.object.getWorldQuaternion(_rotation);
      target.applyQuaternion(_rotation).normalize();
    }
    return target;
  }
  #translate(delta: Vector3): void {
    if (this.object === undefined) return;
    const active = this.#activeAxis ?? "XYZ";
    if (active.length === 1) {
      const axis = this.#worldAxis(active, _axis);
      const amount = delta.dot(axis);
      const snapped = this.translationSnap
        ? Math.round(amount / this.translationSnap) * this.translationSnap
        : amount;
      delta.copy(axis).multiplyScalar(snapped);
    } else if (active.length === 2) {
      this.#worldAxis(active[0], _axis);
      this.#worldAxis(active[1], _axis2);
      const firstAmount = delta.dot(_axis);
      const secondAmount = delta.dot(_axis2);
      delta
        .copy(_axis)
        .multiplyScalar(firstAmount)
        .addScaledVector(_axis2, secondAmount);
      if (this.translationSnap) {
        const x =
          Math.round(delta.dot(_axis) / this.translationSnap) *
          this.translationSnap;
        const y =
          Math.round(delta.dot(_axis2) / this.translationSnap) *
          this.translationSnap;
        delta.copy(_axis).multiplyScalar(x).addScaledVector(_axis2, y);
      }
    }
    _target.copy(this.#startWorldPosition).add(delta);
    if (this.object.parent) this.object.parent.worldToLocal(_target);
    this.object.position.copy(_target);
    this.object.matrixWorldNeedsUpdate = true;
  }
  #rotate(pointer: Vector3, event: ControlEvent): void {
    if (this.object === undefined) return;
    const axis = this.#worldAxis(firstAxis(this.#activeAxis), _axis);
    _v0
      .copy(this.#startPointer)
      .sub(this.#startWorldPosition)
      .projectOnPlane(axis)
      .normalize();
    _v1
      .copy(pointer)
      .sub(this.#startWorldPosition)
      .projectOnPlane(axis)
      .normalize();
    let angle: number;
    if (_v0.lengthSq > 0 && _v1.lengthSq > 0)
      angle = Math.atan2(axis.dot(_cross.crossVectors(_v0, _v1)), _v0.dot(_v1));
    else
      angle =
        (((event.clientX ?? 0) - this.#startClientX) * (Math.PI * 2)) /
        (this.domElement.clientWidth ?? 800);
    if (this.rotationSnap)
      angle = Math.round(angle / this.rotationSnap) * this.rotationSnap;
    _rotation.setFromAxisAngle(axis, angle);
    this.object.quaternion.copy(this.#startQuaternion);
    if (this.#startSpace === "world")
      this.object.quaternion.premultiply(_rotation);
    else this.object.quaternion.multiply(_rotation);
    this.object.rotation.setFromQuaternion(this.object.quaternion);
    this.object.matrixWorldNeedsUpdate = true;
  }
  #scale(delta: Vector3, event: ControlEvent): void {
    if (this.object === undefined) return;
    const active = this.#activeAxis ?? "XYZ";
    let amount: number;
    if (active.length === 1) amount = delta.dot(this.#worldAxis(active, _axis));
    else
      amount =
        ((event.clientX ?? 0) -
          this.#startClientX -
          (event.clientY ?? 0) +
          this.#startClientY) /
        (this.domElement.clientWidth ?? 800);
    let factor = 1 + amount;
    if (!Number.isFinite(factor)) factor = 1;
    factor = Math.max(0.001, factor);
    if (this.scaleSnap)
      factor = Math.max(
        0.001,
        Math.round(factor / this.scaleSnap) * this.scaleSnap,
      );
    this.object.scale.copy(this.#startScale);
    if (active === "X") this.object.scale.x *= factor;
    else if (active === "Y") this.object.scale.y *= factor;
    else if (active === "Z") this.object.scale.z *= factor;
    else this.object.scale.multiplyScalar(factor);
    this.object.matrixWorldNeedsUpdate = true;
  }
}
