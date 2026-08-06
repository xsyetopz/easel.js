import { EventDispatcher } from "../core/EventDispatcher.ts";
import { Node } from "../core/Node.ts";
import type { RaycastCamera } from "../core/Raycaster.ts";
import { Raycaster } from "../core/Raycaster.ts";
import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { BoxGeometry } from "../geometry/primitives/BoxGeometry.ts";
import { ArrowHelper } from "../helpers/ArrowHelper.ts";
import { BasicMaterial } from "../materials/BasicMaterial.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Quaternion } from "../math/Quaternion.ts";
import { Vector3 } from "../math/Vector3.ts";
import { LineLoop } from "../objects/LineLoop.ts";
import { Mesh } from "../objects/Mesh.ts";
import {
  type ControlDomElement,
  type ControlEvent,
  prevent,
} from "./ControlDom.ts";

/** Transform modes supported by the CPU transform control. */
export type TransformMode = "translate" | "rotate" | "scale";

/** Coordinate spaces supported by the CPU transform control. */
export type TransformSpace = "world" | "local";

/** Axis or axis-plane handle used for a transform gesture. */
export type TransformAxis = "X" | "Y" | "Z" | "XY" | "YZ" | "XZ" | "XYZ" | null;

/** Optional sub-viewport used when mapping pointer coordinates to a camera. */
export interface TransformViewport {
  /** Viewport left edge in CSS pixels. */
  x: number;
  /** Viewport bottom edge in CSS pixels. */
  y: number;
  /** Viewport width in CSS pixels. */
  width: number;
  /** Viewport height in CSS pixels. */
  height: number;
}

/** Pointer data accepted by the imperative transform gesture methods. */
export interface TransformPointer {
  /** Normalized device-coordinate horizontal position, when no clientX is supplied. */
  x?: number;
  /** Normalized device-coordinate vertical position, when no clientY is supplied. */
  y?: number;
  /** Client-space horizontal position. */
  clientX?: number;
  /** Client-space vertical position. */
  clientY?: number;
  /** Mouse button index. */
  button?: number;
  /** Pointer identifier used to pair down/move/up gestures. */
  pointerId?: number;
}

const _xAxis = new Vector3(1, 0, 0);
const _yAxis = new Vector3(0, 1, 0);
const _zAxis = new Vector3(0, 0, 1);
const _cameraNormal = new Vector3();
const _axis = new Vector3();
const _axis2 = new Vector3();
const _pointer = new Vector3();
const _delta = new Vector3();
const _target = new Vector3();
const _v0 = new Vector3();
const _v1 = new Vector3();
const _rotation = new Quaternion();

function axisVector(axis: string, target: Vector3): Vector3 {
  switch (axis) {
    case "X":
      return target.copy(_xAxis);
    case "Y":
      return target.copy(_yAxis);
    default:
      return target.copy(_zAxis);
  }
}

function firstAxis(axis: TransformAxis): string {
  return axis?.[0] ?? "X";
}

const _gizmoAxes = ["X", "Y", "Z"] as const;
type GizmoAxis = (typeof _gizmoAxes)[number];

interface TransformGizmoParts {
  arrows: Record<GizmoAxis, ArrowHelper>;
  rings: Record<GizmoAxis, LineLoop>;
  scales: Record<GizmoAxis, Mesh>;
  planes: Record<"XY" | "YZ" | "XZ", Mesh>;
}

const _axisColors: Record<GizmoAxis, number> = {
  X: 0xe53935,
  Y: 0x43a047,
  Z: 0x1e88e5,
};

function ringGeometry(axis: GizmoAxis, radius: number): Geometry {
  const positions: number[] = [];
  const segments = 48;
  for (let index = 0; index <= segments; index++) {
    const angle = (index / segments) * Math.PI * 2;
    const c = Math.cos(angle) * radius;
    const s = Math.sin(angle) * radius;
    if (axis === "X") positions.push(0, c, s);
    else if (axis === "Y") positions.push(c, 0, s);
    else positions.push(c, s, 0);
  }
  return new Geometry().setAttribute(
    "position",
    new Attribute(new Float32Array(positions), 3),
  );
}

function makeTransformGizmo(): {
  helper: Node;
  parts: TransformGizmoParts;
} {
  const helper = new Node();
  helper.type = "TransformControlsHelper";
  helper.name = "TransformControlsGizmo";

  const arrows = {} as Record<GizmoAxis, ArrowHelper>;
  const rings = {} as Record<GizmoAxis, LineLoop>;
  const scales = {} as Record<GizmoAxis, Mesh>;
  const planes = {} as Record<"XY" | "YZ" | "XZ", Mesh>;

  for (const axis of _gizmoAxes) {
    const arrow = new ArrowHelper({
      direction:
        axis === "X"
          ? new Vector3(1, 0, 0)
          : axis === "Y"
            ? new Vector3(0, 1, 0)
            : new Vector3(0, 0, 1),
      length: 1.35,
      headLength: 0.18,
      headWidth: 0.1,
      color: _axisColors[axis],
    });
    arrow.name = `TransformControls-${axis}`;
    arrow.userData["transformAxis"] = axis;
    arrow.line.material!.linewidth = 2;
    arrow.line.material!.depthTest = false;
    arrow.line.material!.depthWrite = false;
    if (arrow.cone.material instanceof BasicMaterial) {
      arrow.cone.material.depthTest = false;
      arrow.cone.material.depthWrite = false;
    }
    arrows[axis] = arrow;
    helper.add(arrow);

    const ring = new LineLoop(
      ringGeometry(axis, 1.05),
      new LineMaterial({
        color: _axisColors[axis],
        linewidth: 2,
        depthTest: false,
        depthWrite: false,
      }),
    );
    ring.name = `TransformControls-R${axis}`;
    ring.userData["transformAxis"] = axis;
    rings[axis] = ring;
    helper.add(ring);

    const scale = new Mesh(
      new BoxGeometry(0.16, 0.16, 0.16),
      new BasicMaterial({
        color: _axisColors[axis],
        depthTest: false,
        depthWrite: false,
      }),
    );
    scale.name = `TransformControls-S${axis}`;
    scale.userData["transformAxis"] = axis;
    scale.position.copy(
      axis === "X"
        ? new Vector3(1.12, 0, 0)
        : axis === "Y"
          ? new Vector3(0, 1.12, 0)
          : new Vector3(0, 0, 1.12),
    );
    scales[axis] = scale;
    helper.add(scale);
  }

  const planeDefinitions: Array<["XY" | "YZ" | "XZ", Vector3, number]> = [
    ["XY", new Vector3(0.42, 0.42, 0), 0xffc107],
    ["YZ", new Vector3(0, 0.42, 0.42), 0xab47bc],
    ["XZ", new Vector3(0.42, 0, 0.42), 0x26a69a],
  ];
  for (const [axis, position, color] of planeDefinitions) {
    const plane = new Mesh(
      new BoxGeometry(0.26, 0.04, 0.26),
      new BasicMaterial({
        color,
        opacity: 4,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    );
    plane.name = `TransformControls-${axis}`;
    plane.userData["transformAxis"] = axis;
    plane.position.copy(position);
    planes[axis] = plane;
    helper.add(plane);
  }

  return { helper, parts: { arrows, rings, scales, planes } };
}

function pointToSegmentDistance(
  px: number,
  py: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lengthSq = dx * dx + dy * dy;
  const amount =
    lengthSq === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / lengthSq));
  return Math.hypot(px - (x0 + amount * dx), py - (y0 + amount * dy));
}

function ringPoint(
  axis: GizmoAxis,
  angle: number,
  radius: number,
  target: Vector3,
): Vector3 {
  const c = Math.cos(angle) * radius;
  const s = Math.sin(angle) * radius;
  if (axis === "X") return target.set(0, c, s);
  if (axis === "Y") return target.set(c, 0, s);
  return target.set(c, s, 0);
}

/**
 * CPU/Canvas2D equivalent of THREE.TransformControls.
 *
 * The control edits a {@link Node} directly using pointer rays and does not
 * allocate a WebGL gizmo. Set `axis` from a UI handle (or leave it unset for
 * a free XYZ transform), then call `update()` once per frame. The control
 * dispatches `change`, `mouseDown`, `mouseUp`, and `objectChange` events.
 */
export class TransformControls extends EventDispatcher {
  /** Camera used to construct CPU pointer rays. */
  camera: RaycastCamera;
  /** Event target receiving pointer listeners. */
  domElement: ControlDomElement;
  /** Attached node, or `undefined` when detached. */
  object: Node | undefined;
  /** Whether pointer interaction is enabled. */
  enabled = true;
  /** Active transformation mode. */
  mode: TransformMode = "translate";
  /** Active gizmo axis. Null selects a free XYZ transform. */
  axis: TransformAxis = null;
  /** Coordinate space used by axis and rotation operations. */
  space: TransformSpace = "world";
  /** Optional translation increment in world or local units. */
  translationSnap: number | null = null;
  /** Optional rotation increment in radians. */
  rotationSnap: number | null = null;
  /** Optional scale increment. */
  scaleSnap: number | null = null;
  /** Visual gizmo size retained for source/API compatibility. */
  size = 1;
  /** Whether the x-axis handle is available to a host UI. */
  showX = true;
  /** Whether the y-axis handle is available to a host UI. */
  showY = true;
  /** Whether the z-axis handle is available to a host UI. */
  showZ = true;
  /** Pointer viewport override; when absent, the complete element is used. */
  viewport: TransformViewport | null = null;
  /** Whether a pointer gesture is currently modifying the attached object. */
  dragging = false;
  /** Reusable CPU pointer raycaster. */
  raycaster: Raycaster;

  #pointerId = -1;
  #activeAxis: TransformAxis = null;
  #startMode: TransformMode = "translate";
  #startSpace: TransformSpace = "world";
  #startWorldPosition = new Vector3();
  #startLocalPosition = new Vector3();
  #startQuaternion = new Quaternion();
  #startScale = new Vector3(1, 1, 1);
  #startPointer = new Vector3();
  #planeNormal = new Vector3(0, 0, 1);
  #startClientX = 0;
  #startClientY = 0;
  #listeners: Array<[string, EventListener]> = [];
  #helper: Node;
  #gizmo: TransformGizmoParts;
  #projection = new Matrix4();
  #view = new Matrix4();
  #projectedOrigin = new Vector3();
  #projectedAxis = new Vector3();
  #initialPosition = new Vector3();
  #initialQuaternion = new Quaternion();
  #initialScale = new Vector3(1, 1, 1);
  #hasInitial = false;

  /** Creates controls and installs pointer listeners on `domElement`. */
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
    this.#listen("pointerup", this.#onPointerUp.bind(this));
    this.#listen("pointercancel", this.#onPointerUp.bind(this));
    this.#listen("contextmenu", (event) => prevent(event));
    if (domElement.style) domElement.style.touchAction = "none";
  }

  /** Attaches a node and updates its world transform before the next gesture. */
  attach(object: Node): this {
    this.#endDrag();
    this.object = object;
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
    this.#syncHelper();
    this.dispatchEvent({ type: "change" });
    return this;
  }

  /** Renderable CPU gizmo node; add it to the scene beside the controlled object. */
  get helper(): Node {
    return this.#helper;
  }

  /** Restores the transform captured by the most recent `attach()`. */
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

  /** Sets the coordinate space used for axis and rotation operations. */
  setSpace(space: TransformSpace): this {
    if (this.space !== space) {
      this.space = space;
      this.#syncHelper();
      this.dispatchEvent({ type: "space-changed", value: space });
      this.dispatchEvent({ type: "change" });
    }
    return this;
  }

  /** Sets the translation snap increment, or null to disable snapping. */
  setTranslationSnap(value: number | null): this {
    this.translationSnap = value;
    return this;
  }

  /** Sets the rotation snap increment, or null to disable snapping. */
  setRotationSnap(value: number | null): this {
    this.rotationSnap = value;
    return this;
  }

  /** Sets the scale snap increment, or null to disable snapping. */
  setScaleSnap(value: number | null): this {
    this.scaleSnap = value;
    return this;
  }

  /** Sets the host gizmo size retained by Canvas2D integrations. */
  setSize(value: number): this {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(
        "TransformControls.size must be positive and finite.",
      );
    }
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

  /** Applies pending node matrix updates and reports whether a gesture is active. */
  update(): boolean {
    this.object?.updateMatrixWorld(true, true);
    this.#syncHelper();
    return this.dragging;
  }

  /** Compatibility alias for scene graphs that update controls as a node. */
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

  /** Processes a pointer-up event and finishes the active gesture. */
  pointerUp(event: TransformPointer): void {
    this.#onPointerUp(this.#normalizePointerEvent(event));
  }

  /** Removes listeners, ends active input, and detaches the controlled object. */
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
    if (!object) {
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
      const enabled =
        axis === "X" ? this.showX : axis === "Y" ? this.showY : this.showZ;
      this.#gizmo.arrows[axis].visible = enabled && this.mode === "translate";
      this.#gizmo.rings[axis].visible = enabled && this.mode === "rotate";
      this.#gizmo.scales[axis].visible = enabled && this.mode === "scale";
    }
    this.#gizmo.planes.XY.visible =
      this.mode === "translate" && this.showX && this.showY;
    this.#gizmo.planes.YZ.visible =
      this.mode === "translate" && this.showY && this.showZ;
    this.#gizmo.planes.XZ.visible =
      this.mode === "translate" && this.showX && this.showZ;
    this.#helper.updateMatrixWorld(false, true);
  }

  #projectToScreen(world: Vector3, target: Vector3): boolean {
    const camera = this.camera as RaycastCamera & {
      projectionMatrix?: { elements: ArrayLike<number> };
    };
    if (!camera.projectionMatrix) {
      this.#projectionFromInverse(camera);
    } else {
      this.#projection.elements.set(camera.projectionMatrix.elements);
    }
    this.#view.elements.set(camera.matrixWorld.elements);
    this.#view.invert();
    target.copy(world).applyMatrix4(this.#view).applyMatrix4(this.#projection);
    if (!Number.isFinite(target.x) || !Number.isFinite(target.y)) return false;
    const rect = this.domElement.getBoundingClientRect?.();
    const width = rect?.width ?? this.domElement.clientWidth ?? 800;
    const height = rect?.height ?? this.domElement.clientHeight ?? 600;
    target.x = (target.x + 1) * 0.5 * width;
    target.y = (1 - target.y) * 0.5 * height;
    return true;
  }

  #projectionFromInverse(camera: RaycastCamera): Matrix4 {
    this.#projection.elements.set(camera.projectionMatrixInverse.elements);
    return this.#projection.invert();
  }

  #visualAxis(axis: GizmoAxis, target: Vector3): Vector3 {
    axisVector(axis, target);
    if (this.space === "local" && this.object) {
      this.object.getWorldQuaternion(_rotation);
      target.applyQuaternion(_rotation).normalize();
    }
    return target;
  }

  #pickAxis(event: ControlEvent): TransformAxis {
    if (!this.object) return null;
    const pointerX = event.clientX ?? 0;
    const pointerY = event.clientY ?? 0;
    this.object.getWorldPosition(_target);
    if (!this.#projectToScreen(_target, this.#projectedOrigin)) return null;

    const distanceToPoint = (point: Vector3): number =>
      Math.hypot(pointerX - point.x, pointerY - point.y);
    const originDistance = distanceToPoint(this.#projectedOrigin);
    if (originDistance <= 10) return "XYZ";

    const enabled = (axis: GizmoAxis): boolean =>
      axis === "X" ? this.showX : axis === "Y" ? this.showY : this.showZ;
    let best: TransformAxis = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    const length = 1.35 * this.size;
    const considerSegment = (
      axis: GizmoAxis,
      start: Vector3,
      end: Vector3,
      threshold: number,
    ): void => {
      if (!enabled(axis)) return;
      const distance = pointToSegmentDistance(
        pointerX,
        pointerY,
        start.x,
        start.y,
        end.x,
        end.y,
      );
      if (distance <= threshold && distance < bestDistance) {
        best = axis;
        bestDistance = distance;
      }
    };

    if (this.mode === "translate") {
      const planeDefinitions: Array<["XY" | "YZ" | "XZ", Vector3]> = [
        ["XY", new Vector3(0.42, 0.42, 0)],
        ["YZ", new Vector3(0, 0.42, 0.42)],
        ["XZ", new Vector3(0.42, 0, 0.42)],
      ];
      for (const [axis, offset] of planeDefinitions) {
        if (
          (axis === "XY" && !(this.showX && this.showY)) ||
          (axis === "YZ" && !(this.showY && this.showZ)) ||
          (axis === "XZ" && !(this.showX && this.showZ))
        )
          continue;
        const worldOffset = offset
          .clone()
          .applyQuaternion(
            this.space === "local" && this.object
              ? this.object.getWorldQuaternion(_rotation)
              : new Quaternion(),
          )
          .add(_target);
        if (!this.#projectToScreen(worldOffset, this.#projectedAxis)) continue;
        const distance = distanceToPoint(this.#projectedAxis);
        if (distance <= 12 && distance < bestDistance) {
          best = axis;
          bestDistance = distance;
        }
      }
    }

    for (const axis of _gizmoAxes) {
      if (!enabled(axis)) continue;
      const worldAxis = this.#visualAxis(axis, _axis);
      const endpoint = _target.clone().addScaledVector(worldAxis, length);
      if (!this.#projectToScreen(endpoint, this.#projectedAxis)) continue;
      if (this.mode === "rotate") {
        const ringRadius = 1.05 * this.size;
        let closest = Number.POSITIVE_INFINITY;
        for (let index = 0; index < 24; index++) {
          const angle = (index / 24) * Math.PI * 2;
          const point = ringPoint(axis, angle, ringRadius, _v0)
            .applyQuaternion(
              this.space === "local" && this.object
                ? this.object.getWorldQuaternion(_rotation)
                : new Quaternion(),
            )
            .add(_target);
          if (this.#projectToScreen(point, _v1)) {
            closest = Math.min(closest, distanceToPoint(_v1));
          }
        }
        if (closest <= 12 && closest < bestDistance) {
          best = axis;
          bestDistance = closest;
        }
      } else {
        considerSegment(axis, this.#projectedOrigin, this.#projectedAxis, 12);
      }
    }
    return best;
  }

  #normalizePointerEvent(event: TransformPointer): Event {
    if (event.clientX !== undefined || event.clientY !== undefined)
      return event as unknown as Event;
    const width = this.domElement.clientWidth ?? 800;
    const height = this.domElement.clientHeight ?? 600;
    const normalized = event;
    return {
      ...event,
      clientX: ((normalized.x ?? 0) + 1) * 0.5 * width,
      clientY: (1 - (normalized.y ?? 0)) * 0.5 * height,
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
    const viewportLeft = viewport?.x ?? 0;
    const viewportTop = viewport
      ? availableHeight - viewport.y - viewport.height
      : 0;
    const viewportWidth = viewport?.width ?? availableWidth;
    const viewportHeight = viewport?.height ?? availableHeight;
    const x = ((event.clientX ?? 0) - left - viewportLeft) / viewportWidth;
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
    if (!this.enabled || !this.object || (event.button ?? 0) !== 0) return;
    this.object.updateMatrixWorld(true, true);
    this.#activeAxis =
      this.axis ??
      (event as ControlEvent & { axis?: TransformAxis }).axis ??
      this.#pickAxis(event) ??
      "XYZ";
    this.#startMode = this.mode;
    this.#startSpace = this.space;
    this.#startWorldPosition.copy(this.object.getWorldPosition(_target));
    this.#startLocalPosition.copy(this.object.position);
    this.#startQuaternion.copy(this.object.quaternion);
    this.#startScale.copy(this.object.scale);
    this.#startClientX = event.clientX ?? 0;
    this.#startClientY = event.clientY ?? 0;
    const elements = this.camera.matrixWorld.elements;
    _cameraNormal.set(-elements[8], -elements[9], -elements[10]).normalize();
    this.#planeNormal.copy(_cameraNormal);
    if (this.#activeAxis && this.#activeAxis.length === 2) {
      axisVector(this.#activeAxis[0], _axis);
      axisVector(this.#activeAxis[1], _axis2);
      if (this.#startSpace === "local") {
        this.object.getWorldQuaternion(_rotation);
        _axis.applyQuaternion(_rotation);
        _axis2.applyQuaternion(_rotation);
      }
      this.#planeNormal.crossVectors(_axis, _axis2).normalize();
    }
    if (this.#planeNormal.lengthSq === 0) this.#planeNormal.set(0, 0, 1);
    const pointer = this.#intersectPointer(event);
    this.#startPointer.copy(pointer ?? this.#startWorldPosition);
    this.dragging = true;
    this.#pointerId = event.pointerId ?? 0;
    this.domElement.setPointerCapture?.(this.#pointerId);
    this.dispatchEvent({ type: "mouseDown", mode: this.#startMode });
  }

  #onPointerMove(raw: Event): void {
    if (!this.enabled || !this.dragging || !this.object) return;
    const event = raw as ControlEvent;
    if ((event.pointerId ?? 0) !== this.#pointerId) return;
    const pointer = this.#intersectPointer(event);
    if (!pointer) return;
    _pointer.copy(pointer);
    _delta.copy(_pointer).sub(this.#startPointer);
    if (this.#startMode === "translate") this.#translate(_delta);
    else if (this.#startMode === "rotate") this.#rotate(_pointer, event);
    else this.#scale(_delta, event);
    this.object.updateMatrixWorld(true, true);
    this.dispatchEvent({ type: "change" });
    this.dispatchEvent({ type: "objectChange" });
  }

  #onPointerUp(raw: Event): void {
    const event = raw as ControlEvent;
    if (!this.dragging || (event.pointerId ?? 0) !== this.#pointerId) return;
    this.domElement.releasePointerCapture?.(this.#pointerId);
    this.#endDrag();
    this.dispatchEvent({ type: "mouseUp", mode: this.#startMode });
  }

  #endDrag(): void {
    this.dragging = false;
    this.#pointerId = -1;
    this.#activeAxis = null;
  }

  #worldAxis(axis: string, target: Vector3): Vector3 {
    axisVector(axis, target);
    if (this.#startSpace === "local" && this.object) {
      this.object.getWorldQuaternion(_rotation);
      target.applyQuaternion(_rotation).normalize();
    }
    return target;
  }

  #translate(delta: Vector3): void {
    if (!this.object) return;
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
      delta
        .copy(_axis)
        .multiplyScalar(delta.dot(_axis))
        .addScaledVector(_axis2, delta.dot(_axis2));
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
    if (!this.object) return;
    const axisName = firstAxis(this.#activeAxis);
    const axis = this.#worldAxis(axisName, _axis);
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
    let angle =
      _v0.lengthSq > 0 && _v1.lengthSq > 0
        ? Math.atan2(axis.dot(_v0.cross(_v1)), _v0.dot(_v1))
        : (((event.clientX ?? 0) - this.#startClientX) * (Math.PI * 2)) /
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
    if (!this.object) return;
    const active = this.#activeAxis ?? "XYZ";
    const amount =
      active.length === 1
        ? delta.dot(this.#worldAxis(active, _axis))
        : ((event.clientX ?? 0) -
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
