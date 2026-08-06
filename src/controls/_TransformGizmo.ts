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
import { Node } from "../core/Node.ts";
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

export function firstAxis(axis: TransformAxis): string {
  return axis?.[0] ?? "X";
}

const _gizmoAxes = ["X", "Y", "Z"] as const;
export type GizmoAxis = (typeof _gizmoAxes)[number];
export { _gizmoAxes };

export interface TransformGizmoParts {
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
export { _axisColors };

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

export function pointToSegmentDistance(
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
