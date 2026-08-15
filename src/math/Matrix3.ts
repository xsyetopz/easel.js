import { fastAtan2 } from "./MathUtils.ts";
import type { Matrix4 } from "./Matrix4.ts";
import { Vector2 } from "./Vector2.ts";
import type { Vector3 } from "./Vector3.ts";

/** 3x3 matrix for 2D transforms and normal matrices. */
export class Matrix3 {
  readonly #elements: Float32Array<ArrayBufferLike> = new Float32Array(9);

  /** Constructs a 3×3 matrix with column-major storage. */
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
  clone(): Matrix3 {
    return new Matrix3().copy(this);
  }

  /**
   * Composes this matrix from a 2D position, rotation angle, and scale.
   * @param rotation Angle in radians
   */
  compose(position: Vector2, rotation: number, scale: Vector2): this {
    this.makeRotation(rotation);

    const te = this.elements;

    const te0 = te[0];
    const te1 = te[1];
    const te3 = te[3];
    const te4 = te[4];

    te[0] = te0 * scale.x;
    te[3] = te3 * scale.x;
    te[1] = te1 * scale.y;
    te[4] = te4 * scale.y;
    te[6] = position.x;
    te[7] = position.y;
    return this;
  }

  /** Copies all nine elements from `m` into this matrix. */
  copy(m: Matrix3): this {
    const me = m.elements;
    if (me === this.elements) return this;
    this.elements.set(me);
    return this;
  }

  /** Returns true when all nine elements exactly match `m`. */
  equals(m: Matrix3): boolean {
    const te = this.elements;
    const me = m.elements;
    for (let index = 0; index < 9; index++) {
      if (te[index] !== me[index]) return false;
    }
    return true;
  }

  /** Extracts the three column basis vectors into the supplied targets. */
  extractBasis(xAxis: Vector3, yAxis: Vector3, zAxis: Vector3): this {
    const te = this.elements;
    xAxis.x = te[0];
    xAxis.y = te[1];
    xAxis.z = te[2];
    yAxis.x = te[3];
    yAxis.y = te[4];
    yAxis.z = te[5];
    zAxis.x = te[6];
    zAxis.y = te[7];
    zAxis.z = te[8];
    return this;
  }

  /** Reads nine column-major values from `values` starting at `offset`. */
  fromArray(values: ArrayLike<number>, offset: number = 0): this {
    const te = this.elements;
    for (let index = 0; index < 9; index++) {
      te[index] = values[index + offset];
    }
    return this;
  }

  /** Decomposes this matrix into position, rotation, and scale components. */
  decompose(
    position: Vector2,
    rotation: { angle: number },
    scale: Vector2,
  ): this {
    this.extractPosition(position);
    this.extractScale(scale);

    const rotationMatrix = new Matrix3().extractRotation(this);
    rotation.angle = fastAtan2(
      rotationMatrix.elements[1],
      rotationMatrix.elements[0],
    );

    return this;
  }

  /** Returns the signed determinant of this matrix. */
  determinant(): number {
    const te = this.elements;

    const a = te[0];
    const b = te[1];
    const c = te[2];
    const d = te[3];
    const e = te[4];
    const f = te[5];
    const g = te[6];
    const h = te[7];
    const i = te[8];

    return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  }

  /** Extracts the translation component into the given Vector2. */
  extractPosition(position: Vector2): this {
    const te = this.elements;

    position.x = te[6];
    position.y = te[7];
    return this;
  }

  /** Extracts the rotation component from another Matrix3, normalizing by scale. */
  extractRotation(m: Matrix3): this {
    const me = m.elements;

    const scale = new Vector2();
    m.extractScale(scale);

    const invScaleX = 1 / scale.x;
    const invScaleY = 1 / scale.y;

    const te = this.elements;
    te[0] = me[0] * invScaleX;
    te[1] = me[1] * invScaleX;
    te[2] = 0;
    te[3] = me[3] * invScaleY;
    te[4] = me[4] * invScaleY;
    te[5] = 0;
    te[6] = 0;
    te[7] = 0;
    te[8] = 1;
    return this;
  }

  /** Extracts the scale component into the given Vector2. */
  extractScale(scale: Vector2): this {
    const me = this.elements;

    const sx = Math.hypot(me[0], me[3]);
    const sy = Math.hypot(me[1], me[4]);
    scale.x = sx;
    scale.y = sy;

    return this;
  }

  /** Replaces this matrix with the inverse-transpose normal matrix of `m`. */
  getNormalMatrix(m: Matrix4): this {
    const me = m.elements;
    const n11 = me[0];
    const n21 = me[1];
    const n31 = me[2];
    const n12 = me[4];
    const n22 = me[5];
    const n32 = me[6];
    const n13 = me[8];
    const n23 = me[9];
    const n33 = me[10];

    const t11 = n33 * n22 - n32 * n23;
    const t12 = n32 * n13 - n33 * n12;
    const t13 = n23 * n12 - n22 * n13;
    const determinant = n11 * t11 + n21 * t12 + n31 * t13;
    const te = this.elements;

    if (determinant === 0) {
      te.fill(0);
      return this;
    }

    const inverseDeterminant = 1 / determinant;
    te[0] = t11 * inverseDeterminant;
    te[1] = t12 * inverseDeterminant;
    te[2] = t13 * inverseDeterminant;
    te[3] = (n31 * n23 - n33 * n21) * inverseDeterminant;
    te[4] = (n33 * n11 - n31 * n13) * inverseDeterminant;
    te[5] = (n21 * n13 - n23 * n11) * inverseDeterminant;
    te[6] = (n32 * n21 - n31 * n22) * inverseDeterminant;
    te[7] = (n31 * n12 - n32 * n11) * inverseDeterminant;
    te[8] = (n22 * n11 - n21 * n12) * inverseDeterminant;
    return this;
  }

  /** Replaces all elements with the identity matrix. */
  identity(): this {
    const te = this.elements;
    te[0] = 1;
    te[1] = 0;
    te[2] = 0;
    te[3] = 0;
    te[4] = 1;
    te[5] = 0;
    te[6] = 0;
    te[7] = 0;
    te[8] = 1;
    return this;
  }

  /**
   * Inverts this matrix in place.
   * @throws When the matrix is non-invertible (det === 0)
   */
  invert(): this {
    const te = this.elements;

    const n11 = te[0];
    const n12 = te[1];
    const n13 = te[2];
    const n21 = te[3];
    const n22 = te[4];
    const n23 = te[5];
    const n31 = te[6];
    const n32 = te[7];
    const n33 = te[8];

    const det = this.determinant();
    if (det === 0) {
      throw new Error(
        "EASEL.Matrix3.invert(): non-invertible matrix (det === 0)",
      );
    }
    const detInv = 1 / det;

    te[0] = (n22 * n33 - n23 * n32) * detInv;
    te[1] = (n13 * n32 - n12 * n33) * detInv;
    te[2] = (n12 * n23 - n13 * n22) * detInv;
    te[3] = (n23 * n31 - n21 * n33) * detInv;
    te[4] = (n11 * n33 - n13 * n31) * detInv;
    te[5] = (n13 * n21 - n11 * n23) * detInv;
    te[6] = (n21 * n32 - n22 * n31) * detInv;
    te[7] = (n12 * n31 - n11 * n32) * detInv;
    te[8] = (n11 * n22 - n12 * n21) * detInv;
    return this;
  }

  /** Replaces this matrix with a 2D rotation by `radians`. */
  makeRotation(radians: number): this {
    const c = Math.cos(radians);
    const s = Math.sin(radians);

    const te = this.elements;
    te[0] = c;
    te[1] = s;
    te[2] = 0;
    te[3] = -s;
    te[4] = c;
    te[5] = 0;
    te[6] = 0;
    te[7] = 0;
    te[8] = 1;
    return this;
  }

  /** Replaces this matrix with a 2D scale by `x` and `y`. */
  makeScale(x: number, y: number): this {
    const te = this.elements;
    te[0] = x;
    te[1] = 0;
    te[2] = 0;
    te[3] = 0;
    te[4] = y;
    te[5] = 0;
    te[6] = 0;
    te[7] = 0;
    te[8] = 1;
    return this;
  }

  /** Replaces this matrix with a 2D translation by `x` and `y`. */
  makeTranslation(x: number, y: number): this {
    const te = this.elements;
    te[0] = 1;
    te[1] = 0;
    te[2] = 0;
    te[3] = 0;
    te[4] = 1;
    te[5] = 0;
    te[6] = x;
    te[7] = y;
    te[8] = 1;
    return this;
  }

  /** Post-multiplies this matrix by `m` in place. */
  multiply(m: Matrix3): this {
    return this.multiplyMatrices(this, m);
  }

  /** Stores the matrix product `a * b` in this matrix. */
  multiplyMatrices(a: Matrix3, b: Matrix3): this {
    const ae = a.elements;
    const be = b.elements;
    const te = this.elements;

    const a11 = ae[0];
    const a21 = ae[1];
    const a31 = ae[2];
    const a12 = ae[3];
    const a22 = ae[4];
    const a32 = ae[5];
    const a13 = ae[6];
    const a23 = ae[7];
    const a33 = ae[8];

    const b11 = be[0];
    const b21 = be[1];
    const b31 = be[2];
    const b12 = be[3];
    const b22 = be[4];
    const b32 = be[5];
    const b13 = be[6];
    const b23 = be[7];
    const b33 = be[8];

    te[0] = a11 * b11 + a12 * b21 + a13 * b31;
    te[1] = a21 * b11 + a22 * b21 + a23 * b31;
    te[2] = a31 * b11 + a32 * b21 + a33 * b31;
    te[3] = a11 * b12 + a12 * b22 + a13 * b32;
    te[4] = a21 * b12 + a22 * b22 + a23 * b32;
    te[5] = a31 * b12 + a32 * b22 + a33 * b32;
    te[6] = a11 * b13 + a12 * b23 + a13 * b33;
    te[7] = a21 * b13 + a22 * b23 + a23 * b33;
    te[8] = a31 * b13 + a32 * b23 + a33 * b33;
    return this;
  }

  /** Pre-multiplies this matrix by `m` in place. */
  premultiply(m: Matrix3): this {
    return this.multiplyMatrices(m, this);
  }

  /** Multiplies every matrix element by `s` in place. */
  multiplyScalar(s: number): this {
    const te = this.elements;
    for (let index = 0; index < 9; index++) te[index] *= s;
    return this;
  }

  /** Pre-multiplies the THREE-compatible 2D rotation by `theta`. */
  rotate(theta: number): this {
    // THREE's legacy rotate() uses makeRotation(-theta) and pre-multiplies.
    // Keep the operation allocation-free by applying that product directly.
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const te = this.elements;

    const m0 = te[0];
    const m1 = te[1];
    const m3 = te[3];
    const m4 = te[4];
    const m6 = te[6];
    const m7 = te[7];

    te[0] = c * m0 + s * m1;
    te[1] = -s * m0 + c * m1;
    te[3] = c * m3 + s * m4;
    te[4] = -s * m3 + c * m4;
    te[6] = c * m6 + s * m7;
    te[7] = -s * m6 + c * m7;
    return this;
  }

  /** Pre-multiplies a 2D scale by `sx` and `sy`. */
  scale(sx: number, sy: number): this {
    const te = this.elements;
    te[0] *= sx;
    te[3] *= sx;
    te[6] *= sx;
    te[1] *= sy;
    te[4] *= sy;
    te[7] *= sy;
    return this;
  }

  /** Pre-multiplies a 2D translation by `tx` and `ty`. */
  translate(tx: number, ty: number): this {
    const te = this.elements;
    const m2 = te[2];
    const m5 = te[5];
    const m8 = te[8];
    te[0] += tx * m2;
    te[1] += ty * m2;
    te[3] += tx * m5;
    te[4] += ty * m5;
    te[6] += tx * m8;
    te[7] += ty * m8;
    return this;
  }

  /** Replaces this matrix with an affine UV offset, repeat, rotation, and center transform. */
  setUvTransform(
    tx: number,
    ty: number,
    sx: number,
    sy: number,
    rotation: number,
    cx: number,
    cy: number,
  ): this {
    const c = Math.cos(rotation);
    const s = Math.sin(rotation);
    return this.set(
      sx * c,
      sx * s,
      -sx * (c * cx + s * cy) + cx + tx,
      -sy * s,
      sy * c,
      -sy * (-s * cx + c * cy) + cy + ty,
      0,
      0,
      1,
    );
  }

  /** Writes column-major elements to `values` starting at `offset`. */
  toArray(values: number[] = [], offset: number = 0): number[] {
    const te = this.elements;
    for (let index = 0; index < 9; index++) {
      values[index + offset] = te[index];
    }
    return values;
  }

  /** Writes all nine row-major arguments into column-major storage. */
  set(
    n11: number,
    n12: number,
    n13: number,
    n21: number,
    n22: number,
    n23: number,
    n31: number,
    n32: number,
    n33: number,
  ): this {
    const te = this.elements;
    te[0] = n11;
    te[1] = n21;
    te[2] = n31;
    te[3] = n12;
    te[4] = n22;
    te[5] = n32;
    te[6] = n13;
    te[7] = n23;
    te[8] = n33;
    return this;
  }

  /** Copies the upper-left 3×3 block of `m` into this matrix. */
  setFromMatrix4(m: Matrix4): this {
    const me = m.elements;
    const te = this.elements;

    te[0] = me[0];
    te[1] = me[1];
    te[2] = me[2];
    te[3] = me[4];
    te[4] = me[5];
    te[5] = me[6];
    te[6] = me[8];
    te[7] = me[9];
    te[8] = me[10];
    return this;
  }

  /** Swaps rows and columns in place. */
  transpose(): this {
    const te = this.elements;

    let temp: number;
    temp = te[1];
    te[1] = te[3];
    te[3] = temp;
    temp = te[2];
    te[2] = te[6];
    te[6] = temp;
    temp = te[5];
    te[5] = te[7];
    te[7] = temp;

    return this;
  }

  /** Writes transposed elements to `values` without mutating this matrix. */
  transposeInto(values: number[] | Float32Array<ArrayBufferLike>): this {
    const te = this.elements;
    values[0] = te[0];
    values[1] = te[3];
    values[2] = te[6];
    values[3] = te[1];
    values[4] = te[4];
    values[5] = te[7];
    values[6] = te[2];
    values[7] = te[5];
    values[8] = te[8];
    return this;
  }

  /** Iterates over all nine elements in column-major order. */
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
  }
}
