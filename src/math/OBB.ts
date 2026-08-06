import { Box3 } from "./Box3.ts";
import { Matrix3 } from "./Matrix3.ts";
import { Matrix4 } from "./Matrix4.ts";
import type { Plane } from "./Plane.ts";
import { Ray } from "./Ray.ts";
import type { Sphere } from "./Sphere.ts";
import { Vector3 } from "./Vector3.ts";

const _aAxes = [new Vector3(), new Vector3(), new Vector3()];
const _bAxes = [new Vector3(), new Vector3(), new Vector3()];
const _r = [new Float64Array(3), new Float64Array(3), new Float64Array(3)];
const _absR = [new Float64Array(3), new Float64Array(3), new Float64Array(3)];
const _translation = new Vector3();
const _point = new Vector3();
const _xAxis = new Vector3();
const _yAxis = new Vector3();
const _zAxis = new Vector3();
const _size = new Vector3();
const _closestPoint = new Vector3();
const _matrix = new Matrix4();
const _inverse = new Matrix4();
const _localRay = new Ray();
const _localBox = new Box3();
let _boxObb: OBB;

/** Oriented bounding box with CPU collision and intersection queries. */
export class OBB {
  /** Center of the box in world coordinates. */
  center: Vector3;
  /** Positive half-widths along the local box axes. */
  halfSize: Vector3;
  /** Orthonormal local axes stored as matrix columns. */
  rotation: Matrix3;

  /** Creates an oriented box from center, half-size, and local rotation. */
  constructor(
    center: Vector3 = new Vector3(),
    halfSize: Vector3 = new Vector3(),
    rotation: Matrix3 = new Matrix3(),
  ) {
    this.center = center.clone();
    this.halfSize = halfSize.clone();
    this.rotation = rotation.clone();
  }

  /** Replaces the center, extents, and orientation. */
  set(center: Vector3, halfSize: Vector3, rotation: Matrix3): this {
    this.center.copy(center);
    this.halfSize.copy(halfSize);
    this.rotation.copy(rotation);
    return this;
  }

  /** Copies another oriented box. */
  copy(obb: OBB): this {
    return this.set(obb.center, obb.halfSize, obb.rotation);
  }

  /** Returns an independent copy of this box. */
  clone(): OBB {
    return new OBB(this.center, this.halfSize, this.rotation);
  }

  /** Writes the full dimensions into `target`. */
  getSize(target: Vector3 = new Vector3()): Vector3 {
    return target.copy(this.halfSize).multiplyScalar(2);
  }

  /** Clamps a point to the nearest point inside this box. */
  clampPoint(point: Vector3, target: Vector3 = new Vector3()): Vector3 {
    _point.subVectors(point, this.center);
    this.rotation.extractBasis(_xAxis, _yAxis, _zAxis);
    target.copy(this.center);
    target.add(
      _xAxis.multiplyScalar(
        clamp(_point.dot(_xAxis), -this.halfSize.x, this.halfSize.x),
      ),
    );
    target.add(
      _yAxis.multiplyScalar(
        clamp(_point.dot(_yAxis), -this.halfSize.y, this.halfSize.y),
      ),
    );
    target.add(
      _zAxis.multiplyScalar(
        clamp(_point.dot(_zAxis), -this.halfSize.z, this.halfSize.z),
      ),
    );
    return target;
  }

  /** Returns whether a point lies inside or on the box. */
  containsPoint(point: Vector3): boolean {
    _point.subVectors(point, this.center);
    this.rotation.extractBasis(_xAxis, _yAxis, _zAxis);
    return (
      Math.abs(_point.dot(_xAxis)) <= this.halfSize.x &&
      Math.abs(_point.dot(_yAxis)) <= this.halfSize.y &&
      Math.abs(_point.dot(_zAxis)) <= this.halfSize.z
    );
  }

  /** Returns whether this box intersects an axis-aligned box. */
  intersectsBox3(box: Box3): boolean {
    return this.intersectsOBB(_boxObb.fromBox3(box));
  }

  /** Returns whether this box intersects a sphere. */
  intersectsSphere(sphere: Pick<Sphere, "center" | "radius">): boolean {
    this.clampPoint(sphere.center, _closestPoint);
    return (
      _closestPoint.distanceToSquared(sphere.center) <=
      sphere.radius * sphere.radius
    );
  }

  /** Separating-axis test for two oriented boxes. */
  intersectsOBB(obb: OBB, epsilon: number = Number.EPSILON): boolean {
    this.rotation.extractBasis(_aAxes[0], _aAxes[1], _aAxes[2]);
    obb.rotation.extractBasis(_bAxes[0], _bAxes[1], _bAxes[2]);
    const ae = [this.halfSize.x, this.halfSize.y, this.halfSize.z];
    const be = [obb.halfSize.x, obb.halfSize.y, obb.halfSize.z];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const value = _aAxes[i].dot(_bAxes[j]);
        _r[i][j] = value;
        _absR[i][j] = Math.abs(value) + epsilon;
      }
    }
    _translation.subVectors(obb.center, this.center);
    const t = [
      _translation.dot(_aAxes[0]),
      _translation.dot(_aAxes[1]),
      _translation.dot(_aAxes[2]),
    ];
    for (let i = 0; i < 3; i++) {
      const rb =
        be[0] * _absR[i][0] + be[1] * _absR[i][1] + be[2] * _absR[i][2];
      if (Math.abs(t[i]) > ae[i] + rb) return false;
    }
    for (let i = 0; i < 3; i++) {
      const ra =
        ae[0] * _absR[0][i] + ae[1] * _absR[1][i] + ae[2] * _absR[2][i];
      if (
        Math.abs(t[0] * _r[0][i] + t[1] * _r[1][i] + t[2] * _r[2][i]) >
        ra + be[i]
      )
        return false;
    }
    const crossAxisTests: readonly [number, number][] = [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ];
    for (const [i, j] of crossAxisTests) {
      const i1 = (i + 1) % 3;
      const i2 = (i + 2) % 3;
      const j1 = (j + 1) % 3;
      const j2 = (j + 2) % 3;
      const ra = ae[i1] * _absR[i2][j] + ae[i2] * _absR[i1][j];
      const rb = be[j1] * _absR[i][j2] + be[j2] * _absR[i][j1];
      const value = Math.abs(t[i2] * _r[i1][j] - t[i1] * _r[i2][j]);
      if (value > ra + rb) return false;
    }
    return true;
  }

  /** Returns whether this box intersects a plane. */
  intersectsPlane(plane: Pick<Plane, "normal" | "constant">): boolean {
    this.rotation.extractBasis(_xAxis, _yAxis, _zAxis);
    const radius =
      this.halfSize.x * Math.abs(plane.normal.dot(_xAxis)) +
      this.halfSize.y * Math.abs(plane.normal.dot(_yAxis)) +
      this.halfSize.z * Math.abs(plane.normal.dot(_zAxis));
    return Math.abs(plane.normal.dot(this.center) + plane.constant) <= radius;
  }

  /** Writes the first ray hit point, or `undefined` when there is no hit. */
  intersectRay(ray: Ray, target: Vector3 = new Vector3()): Vector3 | undefined {
    this.getSize(_size);
    _localBox.setFromCenterAndSize(new Vector3(), _size);
    _matrix.setFromMatrix3(this.rotation).setPosition(this.center);
    _inverse.copy(_matrix).invert();
    _localRay.copy(ray).applyMatrix4(_inverse);
    const hit = _localRay.intersectBox(_localBox, target);
    return hit ? target.applyMatrix4(_matrix) : undefined;
  }

  /** Returns whether a ray intersects this box. */
  intersectsRay(ray: Ray): boolean {
    return this.intersectRay(ray, _point) !== undefined;
  }

  /** Initializes this box from an axis-aligned box. */
  fromBox3(box: Box3): this {
    box.getCenter(this.center);
    box.getSize(this.halfSize).multiplyScalar(0.5);
    this.rotation.identity();
    return this;
  }

  /** Returns whether all components equal another box. */
  equals(obb: OBB): boolean {
    return (
      this.center.equals(obb.center) &&
      this.halfSize.equals(obb.halfSize) &&
      this.rotation.equals(obb.rotation)
    );
  }

  /** Applies an affine transform, preserving an oriented box bound. */
  applyMatrix4(matrix: Matrix4): this {
    const e = matrix.elements;
    let sx = Math.hypot(e[0], e[1], e[2]);
    const sy = Math.hypot(e[4], e[5], e[6]);
    const sz = Math.hypot(e[8], e[9], e[10]);
    if (matrix.determinant() < 0) sx = -sx;
    const rotation = new Matrix3().setFromMatrix4(matrix);
    rotation.elements[0] /= sx;
    rotation.elements[1] /= sx;
    rotation.elements[2] /= sx;
    rotation.elements[3] /= sy;
    rotation.elements[4] /= sy;
    rotation.elements[5] /= sy;
    rotation.elements[6] /= sz;
    rotation.elements[7] /= sz;
    rotation.elements[8] /= sz;
    this.rotation.multiply(rotation);
    this.halfSize.x *= sx;
    this.halfSize.y *= sy;
    this.halfSize.z *= sz;
    this.center.add(_point.set(e[12], e[13], e[14]));
    return this;
  }
}

_boxObb = new OBB();

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
