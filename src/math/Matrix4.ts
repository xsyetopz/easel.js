import {
  _q,
  _v1,
  _v2,
  _v3,
  composeElements,
  invertElements,
  multiplyMatricesAffineElements,
  multiplyMatricesElements,
} from "./_Matrix4Ops.ts";
import { EPSILON } from "./MathUtils.ts";
import type { Matrix3 } from "./Matrix3.ts";
import type { Quaternion } from "./Quaternion.ts";
import { Vector3 } from "./Vector3.ts";

/** 4x4 matrix for 3D affine and projection transforms. */
export class Matrix4 {
  #elements: Float32Array<ArrayBufferLike> = new Float32Array(16);

  /** Constructs a 4×4 matrix with column-major storage. */
  constructor(elements?: Float32Array<ArrayBufferLike>) {
    if (elements) {
      this.#elements = elements;
    } else {
      this.identity();
    }
  }

  /** Column-major matrix storage exposed for direct numeric access. */
  get elements(): Float32Array {
    return this.#elements;
  }

  /** Returns a new instance with the same component values. */
  clone(): Matrix4 {
    return new Matrix4().copy(this);
  }

  /** Composes this matrix from a position, quaternion rotation, and scale. */
  compose(position: Vector3, q: Quaternion, scale: Vector3): this {
    composeElements(this.#elements, position, q, scale);
    return this;
  }

  /** Copies all sixteen elements from `m` into this matrix. */
  copy(m: Matrix4): this {
    const me = m.elements;
    if (me === this.elements) return this;
    this.elements.set(me);
    return this;
  }

  /** Copies only the translation column from `m`. */
  copyPosition(m: Matrix4): this {
    const te = this.elements;
    const me = m.elements;
    te[12] = me[12];
    te[13] = me[13];
    te[14] = me[14];
    return this;
  }

  /** Copies `m` into the upper-left 3×3 block and restores the affine tail. */
  setFromMatrix3(m: Matrix3): this {
    const me = m.elements;
    const te = this.elements;
    te[0] = me[0];
    te[1] = me[1];
    te[2] = me[2];
    te[3] = 0;
    te[4] = me[3];
    te[5] = me[4];
    te[6] = me[5];
    te[7] = 0;
    te[8] = me[6];
    te[9] = me[7];
    te[10] = me[8];
    te[11] = 0;
    te[12] = 0;
    te[13] = 0;
    te[14] = 0;
    te[15] = 1;
    return this;
  }

  /** Extracts the three column basis vectors into the supplied targets. */
  extractBasis(xAxis: Vector3, yAxis: Vector3, zAxis: Vector3): this {
    if (this.determinantAffine() === 0) {
      xAxis.set(1, 0, 0);
      yAxis.set(0, 1, 0);
      zAxis.set(0, 0, 1);
      return this;
    }

    const te = this.elements;
    xAxis.set(te[0], te[1], te[2]);
    yAxis.set(te[4], te[5], te[6]);
    zAxis.set(te[8], te[9], te[10]);
    return this;
  }

  /** Replaces the basis columns with `xAxis`, `yAxis`, and `zAxis`. */
  makeBasis(xAxis: Vector3, yAxis: Vector3, zAxis: Vector3): this {
    return this.set(
      xAxis.x,
      yAxis.x,
      zAxis.x,
      0,
      xAxis.y,
      yAxis.y,
      zAxis.y,
      0,
      xAxis.z,
      yAxis.z,
      zAxis.z,
      0,
      0,
      0,
      0,
      1,
    );
  }

  /** Decomposes this matrix into position, quaternion rotation, and scale. */
  decompose(position: Vector3, q: Quaternion, scale: Vector3): this {
    this.extractPosition(position);
    this.extractScale(scale);

    const rotationMatrix = new Matrix4().extractRotation(this);
    q.setFromRotationMatrix(rotationMatrix);

    return this;
  }

  /** Returns the signed determinant of this matrix. */
  determinant(): number {
    const te = this.elements;

    const n11 = te[0];
    const n12 = te[4];
    const n13 = te[8];
    const n14 = te[12];
    const n21 = te[1];
    const n22 = te[5];
    const n23 = te[9];
    const n24 = te[13];
    const n31 = te[2];
    const n32 = te[6];
    const n33 = te[10];
    const n34 = te[14];
    const n41 = te[3];
    const n42 = te[7];
    const n43 = te[11];
    const n44 = te[15];

    const t1 = n33 * n44 - n34 * n43;
    const t2 = n32 * n44 - n34 * n42;
    const t3 = n32 * n43 - n33 * n42;
    const t4 = n31 * n44 - n34 * n41;
    const t5 = n31 * n43 - n33 * n41;
    const t6 = n31 * n42 - n32 * n41;

    const det11 = n22 * t1 - n23 * t2 + n24 * t3;
    const det12 = n21 * t1 - n23 * t4 + n24 * t5;
    const det13 = n21 * t2 - n22 * t4 + n24 * t6;
    const det14 = n21 * t3 - n22 * t5 + n23 * t6;

    return n11 * det11 - n12 * det12 + n13 * det13 - n14 * det14;
  }

  /** Returns the signed determinant of the affine 3×3 basis portion. */
  determinantAffine(): number {
    const te = this.elements;
    const n11 = te[0];
    const n12 = te[4];
    const n13 = te[8];
    const n21 = te[1];
    const n22 = te[5];
    const n23 = te[9];
    const n31 = te[2];
    const n32 = te[6];
    const n33 = te[10];
    return (
      n11 * (n22 * n33 - n23 * n32) -
      n12 * (n21 * n33 - n23 * n31) +
      n13 * (n21 * n32 - n22 * n31)
    );
  }

  /** Extracts the translation component into the given Vector3. */
  extractPosition(position: Vector3): this {
    const te = this.elements;
    position.x = te[12];
    position.y = te[13];
    position.z = te[14];
    return this;
  }

  /** Extracts the rotation component from another Matrix4, normalizing by scale. */
  extractRotation(m: Matrix4): this {
    const me = m.elements;

    const scale = new Vector3();
    m.extractScale(scale);

    const invScaleX = 1 / scale.x;
    const invScaleY = 1 / scale.y;
    const invScaleZ = 1 / scale.z;

    const te = this.elements;
    te[0] = me[0] * invScaleX;
    te[1] = me[1] * invScaleX;
    te[2] = me[2] * invScaleX;
    te[3] = 0;
    te[4] = me[4] * invScaleY;
    te[5] = me[5] * invScaleY;
    te[6] = me[6] * invScaleY;
    te[7] = 0;
    te[8] = me[8] * invScaleZ;
    te[9] = me[9] * invScaleZ;
    te[10] = me[10] * invScaleZ;
    te[11] = 0;
    te[12] = 0;
    te[13] = 0;
    te[14] = 0;
    te[15] = 1;
    return this;
  }

  /**
   * Extracts the scale component into the given Vector3.
   * Negates X when the determinant is negative (reflection).
   */
  extractScale(scale: Vector3): this {
    const me = this.elements;

    let sx = Math.hypot(me[0], me[1], me[2]);
    const sy = Math.hypot(me[4], me[5], me[6]);
    const sz = Math.hypot(me[8], me[9], me[10]);

    const det = this.determinant();
    if (det < 0) sx = -sx;

    scale.x = sx;
    scale.y = sy;
    scale.z = sz;

    return this;
  }

  /** Replaces all elements with the identity matrix. */
  identity(): this {
    const te = this.elements;
    te[0] = 1;
    te[4] = 0;
    te[8] = 0;
    te[12] = 0;
    te[1] = 0;
    te[5] = 1;
    te[9] = 0;
    te[13] = 0;
    te[2] = 0;
    te[6] = 0;
    te[10] = 1;
    te[14] = 0;
    te[3] = 0;
    te[7] = 0;
    te[11] = 0;
    te[15] = 1;
    return this;
  }

  /**
   * Inverts this matrix in place.
   * @throws When the matrix is non-invertible (det === 0)
   */
  invert(): this {
    invertElements(this.#elements);
    return this;
  }

  /** Replaces this matrix with a view transform from `eye` toward `target`. */
  lookAt(eye: Vector3, target: Vector3, up: Vector3): this {
    _v1.copy(eye).sub(target);
    if (_v1.lengthSq === 0) _v1.z = 1;
    _v1.normalize();

    _v2.copy(up).cross(_v1);
    if (_v2.lengthSq === 0) {
      if (Math.abs(up.z) === 1) {
        _v1.x += EPSILON;
      } else {
        _v1.z += EPSILON;
      }
      _v1.normalize();

      _v2.copy(up).cross(_v1);
    }
    _v2.normalize();

    _v3.copy(_v1).cross(_v2);

    const te = this.elements;
    te[0] = _v2.x;
    te[4] = _v3.x;
    te[8] = _v1.x;
    te[1] = _v2.y;
    te[5] = _v3.y;
    te[9] = _v1.y;
    te[2] = _v2.z;
    te[6] = _v3.z;
    te[10] = _v1.z;
    return this;
  }

  /** Replaces this matrix with an orthographic projection. */
  makeOrthographic(
    left: number,
    right: number,
    top: number,
    bottom: number,
    near: number,
    far: number,
  ): this {
    const w = 1.0 / (right - left);
    const h = 1.0 / (top - bottom);
    const p = 1.0 / (far - near);

    const te = this.elements;
    te[0] = 2 * w;
    te[1] = 0;
    te[2] = 0;
    te[3] = 0;
    te[4] = 0;
    te[5] = 2 * h;
    te[6] = 0;
    te[7] = 0;
    te[8] = 0;
    te[9] = 0;
    te[10] = -2 * p;
    te[11] = 0;
    te[12] = -((right + left) * w);
    te[13] = -((top + bottom) * h);
    te[14] = -((far + near) * p);
    te[15] = 1;
    return this;
  }

  /**
   * Sets this to a perspective projection matrix.
   * @param fov Vertical field of view in radians
   * @param aspect Viewport aspect ratio (width / height)
   * @param near Near clipping plane distance
   * @param far Far clipping plane distance
   */
  makePerspective(
    fov: number,
    aspect: number,
    near: number,
    far: number,
  ): this {
    const tHalfFov = Math.tan(fov / 2);

    const left = -aspect * tHalfFov * near;
    const right = aspect * tHalfFov * near;
    const top = tHalfFov * near;
    const bottom = -tHalfFov * near;

    const te = this.elements;
    te[0] = (2 * near) / (right - left);
    te[1] = 0;
    te[2] = 0;
    te[3] = 0;
    te[4] = 0;
    te[5] = (2 * near) / (top - bottom);
    te[6] = 0;
    te[7] = 0;
    te[8] = (right + left) / (right - left);
    te[9] = (top + bottom) / (top - bottom);
    te[10] = -(far + near) / (far - near);
    te[11] = -1;
    te[12] = 0;
    te[13] = 0;
    te[14] = -(2 * far * near) / (far - near);
    te[15] = 0;
    return this;
  }

  /** Replaces this matrix with the rotation represented by `euler`. */
  makeRotationFromEuler(euler: import("./Euler.js").Euler): this {
    _q.setFromEuler(euler);
    return this.makeRotationFromQuaternion(_q);
  }

  /** Replaces this matrix with the rotation represented by `q`. */
  makeRotationFromQuaternion(q: Quaternion): this {
    _v1.set(0, 0, 0);
    _v2.set(1, 1, 1);
    return this.compose(_v1, q, _v2);
  }

  /** Replaces this matrix with an X-axis rotation by `radians`. */
  makeRotationX(radians: number): this {
    const c = Math.cos(radians);
    const s = Math.sin(radians);

    const te = this.elements;
    te[0] = 1;
    te[1] = 0;
    te[2] = 0;
    te[3] = 0;
    te[4] = 0;
    te[5] = c;
    te[6] = s;
    te[7] = 0;
    te[8] = 0;
    te[9] = -s;
    te[10] = c;
    te[11] = 0;
    te[12] = 0;
    te[13] = 0;
    te[14] = 0;
    te[15] = 1;
    return this;
  }

  /** Replaces this matrix with a Y-axis rotation by `radians`. */
  makeRotationY(radians: number): this {
    const c = Math.cos(radians);
    const s = Math.sin(radians);

    const te = this.elements;
    te[0] = c;
    te[1] = 0;
    te[2] = -s;
    te[3] = 0;
    te[4] = 0;
    te[5] = 1;
    te[6] = 0;
    te[7] = 0;
    te[8] = s;
    te[9] = 0;
    te[10] = c;
    te[11] = 0;
    te[12] = 0;
    te[13] = 0;
    te[14] = 0;
    te[15] = 1;
    return this;
  }

  /** Replaces this matrix with a Z-axis rotation by `radians`. */
  makeRotationZ(radians: number): this {
    const c = Math.cos(radians);
    const s = Math.sin(radians);

    const te = this.elements;
    te[0] = c;
    te[1] = s;
    te[2] = 0;
    te[3] = 0;
    te[4] = -s;
    te[5] = c;
    te[6] = 0;
    te[7] = 0;
    te[8] = 0;
    te[9] = 0;
    te[10] = 1;
    te[11] = 0;
    te[12] = 0;
    te[13] = 0;
    te[14] = 0;
    te[15] = 1;
    return this;
  }

  /** Replaces this matrix with an `angle` rotation around normalized `axis`. */
  makeRotationAxis(axis: Vector3, angle: number): this {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const t = 1 - c;
    const x = axis.x;
    const y = axis.y;
    const z = axis.z;
    const tx = t * x;
    const ty = t * y;
    return this.set(
      tx * x + c,
      tx * y - s * z,
      tx * z + s * y,
      0,
      tx * y + s * z,
      ty * y + c,
      ty * z - s * x,
      0,
      tx * z - s * y,
      ty * z + s * x,
      t * z * z + c,
      0,
      0,
      0,
      0,
      1,
    );
  }

  /** Replaces this matrix with a 3D scale by `x`, `y`, and `z`. */
  makeScale(x: number, y: number, z: number): this {
    const te = this.elements;
    te[0] = x;
    te[1] = 0;
    te[2] = 0;
    te[3] = 0;
    te[4] = 0;
    te[5] = y;
    te[6] = 0;
    te[7] = 0;
    te[8] = 0;
    te[9] = 0;
    te[10] = z;
    te[11] = 0;
    te[12] = 0;
    te[13] = 0;
    te[14] = 0;
    te[15] = 1;
    return this;
  }

  /** Replaces this matrix with the six-plane shear specified by the arguments. */
  makeShear(
    xy: number,
    xz: number,
    yx: number,
    yz: number,
    zx: number,
    zy: number,
  ): this {
    return this.set(1, yx, zx, 0, xy, 1, zy, 0, xz, yz, 1, 0, 0, 0, 0, 1);
  }

  /** Replaces this matrix with a 3D translation by `x`, `y`, and `z`. */
  makeTranslation(x: number, y: number, z: number): this {
    const te = this.elements;
    te[0] = 1;
    te[1] = 0;
    te[2] = 0;
    te[3] = 0;
    te[4] = 0;
    te[5] = 1;
    te[6] = 0;
    te[7] = 0;
    te[8] = 0;
    te[9] = 0;
    te[10] = 1;
    te[11] = 0;
    te[12] = x;
    te[13] = y;
    te[14] = z;
    te[15] = 1;
    return this;
  }

  /** Post-multiplies this matrix by `m` in place. */
  multiply(m: Matrix4): this {
    return this.multiplyMatrices(this, m);
  }

  /** Stores the matrix product `a * b` in this matrix. */
  multiplyMatrices(a: Matrix4, b: Matrix4): this {
    multiplyMatricesElements(this.#elements, a.elements, b.elements);
    return this;
  }

  /** Pre-multiplies this matrix by `m` in place. */
  premultiply(m: Matrix4): this {
    return this.multiplyMatrices(m, this);
  }

  /** Multiplies every matrix element by `s` in place. */
  multiplyScalar(s: number): this {
    const te = this.elements;
    for (let index = 0; index < 16; index++) te[index] *= s;
    return this;
  }

  /**
   * Sets this matrix to the product a * b, assuming both are affine transforms:
   * last row is [0,0,0,1]. This is the common case for scene graph world-matrix
   * propagation and is substantially cheaper than full 4x4 multiplication.
   */
  multiplyMatricesAffine(a: Matrix4, b: Matrix4): this {
    multiplyMatricesAffineElements(this.#elements, a.elements, b.elements);
    return this;
  }

  /** Scales the three basis columns by `scale` in place. */
  scale(scale: Vector3): this {
    const te = this.elements;
    const { x, y, z } = scale;
    te[0] *= x;
    te[1] *= x;
    te[2] *= x;
    te[3] *= x;
    te[4] *= y;
    te[5] *= y;
    te[6] *= y;
    te[7] *= y;
    te[8] *= z;
    te[9] *= z;
    te[10] *= z;
    te[11] *= z;
    return this;
  }

  /** Returns the largest Euclidean length among the three basis columns. */
  get maxScaleOnAxis(): number {
    const te = this.elements;
    const scaleXSq = te[0] * te[0] + te[1] * te[1] + te[2] * te[2];
    const scaleYSq = te[4] * te[4] + te[5] * te[5] + te[6] * te[6];
    const scaleZSq = te[8] * te[8] + te[9] * te[9] + te[10] * te[10];
    return Math.sqrt(Math.max(scaleXSq, scaleYSq, scaleZSq));
  }

  /** Writes all sixteen row-major arguments into column-major storage. */
  set(
    n11: number,
    n12: number,
    n13: number,
    n14: number,
    n21: number,
    n22: number,
    n23: number,
    n24: number,
    n31: number,
    n32: number,
    n33: number,
    n34: number,
    n41: number,
    n42: number,
    n43: number,
    n44: number,
  ): this {
    const te = this.elements;
    te[0] = n11;
    te[1] = n21;
    te[2] = n31;
    te[3] = n41;
    te[4] = n12;
    te[5] = n22;
    te[6] = n32;
    te[7] = n42;
    te[8] = n13;
    te[9] = n23;
    te[10] = n33;
    te[11] = n43;
    te[12] = n14;
    te[13] = n24;
    te[14] = n34;
    te[15] = n44;
    return this;
  }

  /** Replaces the translation column from a vector or three scalar components. */
  setPosition(position: Vector3): this;
  /** Overload accepting scalar x, y, and z position components. */
  setPosition(x: number, y: number, z: number): this;
  /** Overload accepting scalar x, y, and z position components. */
  setPosition(positionOrX: Vector3 | number, y?: number, z?: number): this {
    const te = this.elements;
    if (typeof positionOrX === "number") {
      if (y === undefined || z === undefined) {
        throw new TypeError("Matrix4.setPosition() requires x, y, and z.");
      }
      te[12] = positionOrX;
      te[13] = y;
      te[14] = z;
    } else {
      te[12] = positionOrX.x;
      te[13] = positionOrX.y;
      te[14] = positionOrX.z;
    }
    return this;
  }

  /** Returns true when all sixteen elements exactly match `m`. */
  equals(m: Matrix4): boolean {
    const te = this.elements;
    const me = m.elements;
    for (let index = 0; index < 16; index++) {
      if (te[index] !== me[index]) return false;
    }
    return true;
  }

  /** Reads sixteen column-major values from `values` starting at `offset`. */
  fromArray(values: ArrayLike<number>, offset: number = 0): this {
    const te = this.elements;
    for (let index = 0; index < 16; index++) {
      te[index] = values[index + offset];
    }
    return this;
  }

  /** Writes column-major elements to `values` starting at `offset`. */
  toArray(values: number[] = [], offset: number = 0): number[] {
    const te = this.elements;
    for (let index = 0; index < 16; index++) {
      values[index + offset] = te[index];
    }
    return values;
  }

  /** Swaps rows and columns in place. */
  transpose(): this {
    const te = this.elements;

    let temp: number;
    temp = te[1];
    te[1] = te[4];
    te[4] = temp;
    temp = te[2];
    te[2] = te[8];
    te[8] = temp;
    temp = te[3];
    te[3] = te[12];
    te[12] = temp;
    temp = te[6];
    te[6] = te[9];
    te[9] = temp;
    temp = te[7];
    te[7] = te[13];
    te[13] = temp;
    temp = te[11];
    te[11] = te[14];
    te[14] = temp;

    return this;
  }

  /** Iterates over all sixteen elements in column-major order. */
  *[Symbol.iterator](): Generator<number> {
    const te = this.elements;

    yield te[0];
    yield te[1];
    yield te[2];
    yield te[3];
    yield te[4];
    yield te[5];
    yield te[6];
    yield te[7];
    yield te[8];
    yield te[9];
    yield te[10];
    yield te[11];
    yield te[12];
    yield te[13];
    yield te[14];
    yield te[15];
  }
}
