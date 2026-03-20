import { MathUtils } from "./MathUtils.js";
import { Vector2 } from "./Vector2.js";
/** @typedef {import("./Matrix4.js").Matrix4} Matrix4 */

/** 3×3 matrix for 2D transforms and normal matrices. */
export class Matrix3 {
	#elements = new Float32Array(9);

	/**
	 * @param {Float32Array<ArrayBuffer>} [elements]
	 */
	constructor(elements) {
		if (elements) {
			this.#elements = elements;
		} else {
			this.identity();
		}
	}

	/**
	 * @returns {Float32Array}
	 */
	get elements() {
		return this.#elements;
	}

	/**
	 * @returns {Matrix3}
	 */
	clone() {
		return new Matrix3().copy(this);
	}

	/**
	 * Composes this matrix from a 2D position, rotation angle, and scale.
	 * @param {Vector2} position
	 * @param {number} rotation - Angle in radians
	 * @param {Vector2} scale
	 * @returns {this}
	 */
	compose(position, rotation, scale) {
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

	/**
	 * Copies elements from another Matrix3 into this one.
	 * @param {Matrix3} m
	 * @returns {this}
	 */
	copy(m) {
		const me = m.elements;
		if (me === this.elements) return this;
		this.elements.set(me);
		return this;
	}

	/**
	 * Decomposes this matrix into position, rotation, and scale components.
	 * @param {Vector2} position
	 * @param {{ angle: number }} rotation
	 * @param {Vector2} scale
	 * @returns {this}
	 */
	decompose(position, rotation, scale) {
		this.extractPosition(position);
		this.extractScale(scale);

		const rotationMatrix = new Matrix3().extractRotation(this);
		rotation.angle = MathUtils.fastAtan2(
			rotationMatrix.elements[1],
			rotationMatrix.elements[0],
		);

		return this;
	}

	/**
	 * Computes the determinant of this matrix.
	 * @returns {number}
	 */
	determinant() {
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

	/**
	 * Extracts the translation component into the given Vector2.
	 * @param {Vector2} position
	 * @returns {this}
	 */
	extractPosition(position) {
		const te = this.elements;

		position.x = te[6];
		position.y = te[7];
		return this;
	}

	/**
	 * Extracts the rotation component from another Matrix3, normalizing by scale.
	 * @param {Matrix3} m
	 * @returns {this}
	 */
	extractRotation(m) {
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

	/**
	 * Extracts the scale component into the given Vector2.
	 * @param {Vector2} scale
	 * @returns {this}
	 */
	extractScale(scale) {
		const me = this.elements;

		const sx = Math.hypot(me[0], me[3]);
		const sy = Math.hypot(me[1], me[4]);
		scale.x = sx;
		scale.y = sy;

		return this;
	}

	/**
	 * Sets this to the normal matrix derived from the given Matrix4.
	 * @param {Matrix4} m
	 * @returns {this}
	 */
	getNormalMatrix(m) {
		return this.setFromMatrix4(m).invert().transpose();
	}

	/**
	 * Resets this matrix to the identity.
	 * @returns {this}
	 */
	identity() {
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
	 * @throws {Error} When the matrix is non-invertible (det === 0)
	 * @returns {this}
	 */
	invert() {
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

	/**
	 * Sets this to a 2D rotation matrix.
	 * @param {number} radians
	 * @returns {this}
	 */
	makeRotation(radians) {
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

	/**
	 * Sets this to a 2D scale matrix.
	 * @param {number} x
	 * @param {number} y
	 * @returns {this}
	 */
	makeScale(x, y) {
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

	/**
	 * Sets this to a 2D translation matrix.
	 * @param {number} x
	 * @param {number} y
	 * @returns {this}
	 */
	makeTranslation(x, y) {
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

	/**
	 * Post-multiplies this matrix by m.
	 * @param {Matrix3} m
	 * @returns {this}
	 */
	mul(m) {
		return this.mulMatrices(this, m);
	}

	/**
	 * Sets this matrix to the product a * b.
	 * @param {Matrix3} a
	 * @param {Matrix3} b
	 * @returns {this}
	 */
	mulMatrices(a, b) {
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

	/**
	 * Sets all nine elements directly (row-major argument order).
	 * @param {number} n11
	 * @param {number} n12
	 * @param {number} n13
	 * @param {number} n21
	 * @param {number} n22
	 * @param {number} n23
	 * @param {number} n31
	 * @param {number} n32
	 * @param {number} n33
	 * @returns {this}
	 */
	set(n11, n12, n13, n21, n22, n23, n31, n32, n33) {
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

	/**
	 * Sets this matrix from the upper-left 3x3 of a Matrix4.
	 * @param {Matrix4} m
	 * @returns {this}
	 */
	setFromMatrix4(m) {
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

	/**
	 * Transposes this matrix in place.
	 * @returns {this}
	 */
	transpose() {
		const te = this.elements;

		let temp;
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

	/**
	 * Iterates over all nine elements in column-major order.
	 * @returns {IterableIterator<number>}
	 */
	*[Symbol.iterator]() {
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
