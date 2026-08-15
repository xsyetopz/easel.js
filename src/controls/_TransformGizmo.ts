import { Layer } from "../core/Constants.ts";
import { Node } from "../core/Node.ts";
import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { BoxGeometry } from "../geometry/primitives/BoxGeometry.ts";
import { ArrowHelper } from "../helpers/ArrowHelper.ts";
import { BasicMaterial } from "../materials/BasicMaterial.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import { Quaternion } from "../math/Quaternion.ts";
import { Vector3 } from "../math/Vector3.ts";
import { LineLoop } from "../objects/LineLoop.ts";
import { Mesh } from "../objects/Mesh.ts";
import type { TransformAxis } from "./TransformControls.ts";

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

export {
  _axis,
  _axis2,
  _cameraNormal,
  _delta,
  _pointer,
  _rotation,
  _target,
  _v0,
  _v1,
  _xAxis,
  _yAxis,
  _zAxis,
};

/** Copies the unit vector corresponding to a gizmo axis into `target`. */
export function axisVector(axis: string, target: Vector3): Vector3 {
  switch (axis) {
    case "X":
      return target.copy(_xAxis);
    case "Y":
      return target.copy(_yAxis);
    default:
      return target.copy(_zAxis);
  }
}

/** Returns the leading axis letter from a transform-axis selection. */
export function firstAxis(axis: TransformAxis): string {
  return axis?.[0] ?? "X";
}

const _gizmoAxes = ["X", "Y", "Z"] as const;
/** Single-axis labels supported by the transform gizmo. */
export type GizmoAxis = (typeof _gizmoAxes)[number];
export { _gizmoAxes };

/** Scene-graph components that make up a transform gizmo. */
export interface TransformGizmoParts {
  /** Axis-aligned translation arrows keyed by axis. */
  arrows: Record<GizmoAxis, ArrowHelper>;
  /** Rotation rings keyed by axis. */
  rings: Record<GizmoAxis, LineLoop>;
  /** Axis-aligned scale handles keyed by axis. */
  scales: Record<GizmoAxis, Mesh>;
  /** Plane handles keyed by the two active axes. */
  planes: Record<"XY" | "YZ" | "XZ", Mesh>;
}

const _axisColors: Record<GizmoAxis, number> = {
  X: 0xe53935,
  Y: 0x43a047,
  Z: 0x005eff,
};

export { _axisColors };

const _planeColors: Record<PlaneAxis, number> = {
  XY: 0xffc107,
  YZ: 0xab47bc,
  XZ: 0x26a69a,
};

export { _planeColors };

/** Builds a segmented circular geometry oriented around the selected axis. */
export function ringGeometry(axis: GizmoAxis, radius: number): Geometry {
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

function axisDirection(axis: GizmoAxis): Vector3 {
  if (axis === "X") return new Vector3(1, 0, 0);
  if (axis === "Y") return new Vector3(0, 1, 0);
  return new Vector3(0, 0, 1);
}

function scalePosition(axis: GizmoAxis): Vector3 {
  if (axis === "X") return new Vector3(1.12, 0, 0);
  if (axis === "Y") return new Vector3(0, 1.12, 0);
  return new Vector3(0, 0, 1.12);
}

function setTransformAxis(node: Node, axis: GizmoAxis | PlaneAxis): void {
  const userData = node.userData as { transformAxis?: GizmoAxis | PlaneAxis };
  userData.transformAxis = axis;
}

function configureArrow(arrow: ArrowHelper, axis: GizmoAxis): void {
  arrow.name = `TransformControls-${axis}`;
  setTransformAxis(arrow, axis);
  const lineMaterial = arrow.line.material;
  if (lineMaterial !== undefined) {
    lineMaterial.linewidth = 3;
    lineMaterial.layer = Layer.OVERLAY;
    lineMaterial.depthTest = false;
    lineMaterial.depthWrite = false;
  }
  if (arrow.cone.material instanceof BasicMaterial) {
    arrow.cone.material.layer = Layer.OVERLAY;
    arrow.cone.material.depthTest = false;
    arrow.cone.material.depthWrite = false;
  }
}

function makeArrow(axis: GizmoAxis): ArrowHelper {
  const arrow = new ArrowHelper({
    direction: axisDirection(axis),
    length: 1.35,
    headLength: 0.22,
    headWidth: 0.14,
    color: _axisColors[axis],
  });
  configureArrow(arrow, axis);
  return arrow;
}

function makeRing(axis: GizmoAxis): LineLoop {
  const ring = new LineLoop(
    ringGeometry(axis, 1.05),
    new LineMaterial({
      color: _axisColors[axis],
      linewidth: 2,
      layer: Layer.OVERLAY,
      depthTest: false,
      depthWrite: false,
    }),
  );
  ring.name = `TransformControls-R${axis}`;
  setTransformAxis(ring, axis);
  return ring;
}

function makeScale(axis: GizmoAxis): Mesh {
  const scale = new Mesh(
    new BoxGeometry(0.16, 0.16, 0.16),
    new BasicMaterial({
      color: _axisColors[axis],
      layer: Layer.OVERLAY,
      depthTest: false,
      depthWrite: false,
    }),
  );
  scale.name = `TransformControls-S${axis}`;
  setTransformAxis(scale, axis);
  scale.position.copy(scalePosition(axis));
  return scale;
}

type PlaneAxis = "XY" | "YZ" | "XZ";

function makePlane(
  axis: PlaneAxis,
  position: Vector3,
  color: number,
  dimensions: [number, number, number],
): Mesh {
  const plane = new Mesh(
    new BoxGeometry(...dimensions),
    new BasicMaterial({
      color,
      layer: Layer.OVERLAY,
      opacity: 4,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  plane.name = `TransformControls-${axis}`;
  setTransformAxis(plane, axis);
  plane.position.copy(position);
  return plane;
}

/** Creates the helper node and mesh parts used by transform controls. */
export function makeTransformGizmo(): {
  helper: Node;
  parts: TransformGizmoParts;
} {
  const helper = new Node();
  helper.type = "TransformControlsHelper";
  helper.name = "TransformControlsGizmo";

  const arrows = {} as Record<GizmoAxis, ArrowHelper>;
  const rings = {} as Record<GizmoAxis, LineLoop>;
  const scales = {} as Record<GizmoAxis, Mesh>;
  const planes = {} as Record<PlaneAxis, Mesh>;
  const planeDefinitions: Array<
    [PlaneAxis, Vector3, number, [number, number, number]]
  > = [
    ["XY", new Vector3(0.42, 0.42, 0), _planeColors.XY, [0.26, 0.26, 0.04]],
    ["YZ", new Vector3(0, 0.42, 0.42), _planeColors.YZ, [0.04, 0.26, 0.26]],
    ["XZ", new Vector3(0.42, 0, 0.42), _planeColors.XZ, [0.26, 0.04, 0.26]],
  ];

  for (const axis of _gizmoAxes) {
    const arrow = makeArrow(axis);
    arrows[axis] = arrow;
    helper.add(arrow);

    const ring = makeRing(axis);
    rings[axis] = ring;
    helper.add(ring);

    const scale = makeScale(axis);
    scales[axis] = scale;
    helper.add(scale);
  }

  for (const [axis, position, color, dimensions] of planeDefinitions) {
    const plane = makePlane(axis, position, color, dimensions);
    planes[axis] = plane;
    helper.add(plane);
  }

  return { helper, parts: { arrows, rings, scales, planes } };
}

type SegmentDistanceArguments = [
  px: number,
  py: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
];

/** Returns the shortest distance from a point to a 2D line segment. */
export function pointToSegmentDistance(
  ...[px, py, x0, y0, x1, y1]: SegmentDistanceArguments
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

/** Writes a point on an axis-oriented gizmo ring into `target`. */
export function ringPoint(
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
