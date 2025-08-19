
import { Vector2 } from "./Vector2.js";

export class Matrix3 {
    /**
     * Creates new 3x3 matrix.
     * @param {Float32Array} [elements] - optional elements array
     */
    constructor(elements) {
        /**
         * @type {Float32Array}
         * @default [1,0,0,0,1,0,0,0,1]
         */
        this.elements = elements ? elements : new Float32Array([
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ]);
    }

    /**
     * Clones this matrix.
     * @returns {Matrix3}
     */
    clone() {
        return new Matrix3().copy(this);
    }

    /**
     * Composes transformation matrix from position, rotation, and scale (2D).
     * @param {Vector2} position - translation vector
     * @param {number} rotation - rotation in radians
     * @param {Vector2} scale - scale vector
     * @returns {Matrix3} this matrix for chaining
     */
    compose(position, rotation, scale) {
        this.makeRotation(rotation);

        const te = this.elements;
        const te0 = te[0], te1 = te[1], te3 = te[3], te4 = te[4];
        te[0] = te0 * scale.x; te[3] = te3 * scale.x;
        te[1] = te1 * scale.y; te[4] = te4 * scale.y;
        te[6] = position.x; te[7] = position.y;
        return this;
    }

    /**
     * Copies values from another matrix.
     * @param {Matrix3} m - source matrix
     * @returns {Matrix3} this matrix for chaining
     */
    copy(m) {
        const te = this.elements;
        const me = m.elements;
        for (let i = 0; i < 9; i++) {
            te[i] = me[i];
        }
        return this;
    }

    /**
     * Decomposes this matrix into position, rotation, and scale (2D).
     * @param {Vector2} position - output translation vector
     * @param {{angle:number}} rotation - output rotation object with angle in radians
     * @param {Vector2} scale - output scale vector
     * @returns {Matrix3}
     */
    decompose(position, rotation, scale) {
        this.extractPosition(position);
        this.extractScale(scale);

        const rotationMatrix = new Matrix3().extractRotation(this);
        rotation.angle = Math.atan2(rotationMatrix.elements[1], rotationMatrix.elements[0]);
        return this;
    }

    /**
     * Calculates determinant of this matrix.
     * @returns {number} determinant value
     */
    determinant() {
        const te = this.elements;
        const a = te[0], b = te[1], c = te[2];
        const d = te[3], e = te[4], f = te[5];
        const g = te[6], h = te[7], i = te[8];
        return (a * (e * i - f * h)) - (b * (d * i - f * g)) + (c * (d * h - e * g));
    }

    /**
     * Extracts translation component from matrix.
     * @param {Vector2} position - output
     * @returns {Matrix3} this matrix for chaining
     */
    extractPosition(position) {
        const te = this.elements;
        position.x = te[6];
        position.y = te[7];
        return this;
    }

    /**
     * Extracts rotation component from matrix, removing scale.
     * @param {Matrix3} m - source matrix
     * @returns {Matrix3} this matrix for chaining
     */
    extractRotation(m) {
        const me = m.elements;
        const scale = new Vector2();
        m.extractScale(scale);

        const invScaleX = 1 / scale.x;
        const invScaleY = 1 / scale.y;

        const te = this.elements;
        te[0] = me[0] * invScaleX;
        te[1] = me[1] * invScaleX; te[2] = 0;
        te[3] = me[3] * invScaleY;
        te[4] = me[4] * invScaleY; te[5] = 0;
        te[6] = 0; te[7] = 0; te[8] = 1;
        return this;
    }

    /**
     * Extracts scale component from matrix.
     * @param {Vector2} scale - output
     * @returns {Matrix3} this matrix for chaining
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
     * Gets normal matrix (3x3) from Matrix4.
     * @param {Matrix4} m - source matrix
     * @returns {Matrix3} this matrix for chaining
     */
    getNormalMatrix(m) {
        return this.setFromMatrix4(m).invert().transpose();
    }

    /**
     * Resets this matrix to identity.
     * @returns {Matrix3} this matrix for chaining
     */
    identity() {
        const te = this.elements;
        te[0] = 1; te[1] = 0; te[2] = 0;
        te[3] = 0; te[4] = 1; te[5] = 0;
        te[6] = 0; te[7] = 0; te[8] = 1;
        return this;
    }

    /**
     * Inverts this matrix.
     * @returns {Matrix3} this matrix for chaining
     * @throws {Error} if matrix is not invertible
     */
    invert() {
        const te = this.elements;
        const n11 = te[0], n12 = te[1], n13 = te[2];
        const n21 = te[3], n22 = te[4], n23 = te[5];
        const n31 = te[6], n32 = te[7], n33 = te[8];

        const det = this.determinant();
        if (det === 0) throw new Error("Matrix3.invert(): non-invertible matrix (det === 0)");
        const detInv = 1 / det;

        te[0] = ((n22 * n33) - (n23 * n32)) * detInv;
        te[1] = ((n13 * n32) - (n12 * n33)) * detInv;
        te[2] = ((n12 * n23) - (n13 * n22)) * detInv;
        te[3] = ((n23 * n31) - (n21 * n33)) * detInv;
        te[4] = ((n11 * n33) - (n13 * n31)) * detInv;
        te[5] = ((n13 * n21) - (n11 * n23)) * detInv;
        te[6] = ((n21 * n32) - (n22 * n31)) * detInv;
        te[7] = ((n12 * n31) - (n11 * n32)) * detInv;
        te[8] = ((n11 * n22) - (n12 * n21)) * detInv;
        return this;
    }

    /**
     * Creates rotation matrix.
     * @param {number} radians - rotation angle in radians
     * @returns {Matrix3} this matrix for chaining
     */
    makeRotation(radians) {
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);

        const te = this.elements;
        te[0] = cos; te[1] = sin; te[2] = 0;
        te[3] = -sin; te[4] = cos; te[5] = 0;
        te[6] = 0; te[7] = 0; te[8] = 1;
        return this;
    }

    /**
     * Creates scale matrix (2D).
     * @param {number} x - scale x
     * @param {number} y - scale y
     * @returns {Matrix3} this matrix for chaining
     */
    makeScale(x, y) {
        const te = this.elements;
        te[0] = x; te[1] = 0; te[2] = 0;
        te[3] = 0; te[4] = y; te[5] = 0;
        te[6] = 0; te[7] = 0; te[8] = 1;
        return this;
    }

    /**
     * Creates translation matrix (2D).
     * @param {number} x - translation x
     * @param {number} y - translation y
     * @returns {Matrix3} this matrix for chaining
     */
    makeTranslation(x, y) {
        const te = this.elements;
        te[0] = 1; te[1] = 0; te[2] = 0;
        te[3] = 0; te[4] = 1; te[5] = 0;
        te[6] = x; te[7] = y; te[8] = 1;
        return this;
    }

    /**
     * Multiplies this matrix by another matrix.
     * @param {Matrix3} m - matrix to multiply by
     * @returns {Matrix3} this matrix for chaining
     */
    mul(m) {
        return this.mulMatrices(this, m);
    }

    /**
     * Multiplies two matrices and stores result in this matrix.
     * @param {Matrix3} a - first matrix
     * @param {Matrix3} b - second matrix
     * @returns {Matrix3} this matrix for chaining
     */
    mulMatrices(a, b) {
        const ae = a.elements;
        const be = b.elements;
        const te = this.elements;
        const a11 = ae[0], a21 = ae[1], a31 = ae[2];
        const a12 = ae[3], a22 = ae[4], a32 = ae[5];
        const a13 = ae[6], a23 = ae[7], a33 = ae[8];
        const b11 = be[0], b21 = be[1], b31 = be[2];
        const b12 = be[3], b22 = be[4], b32 = be[5];
        const b13 = be[6], b23 = be[7], b33 = be[8];
        te[0] = (a11 * b11) + (a12 * b21) + (a13 * b31);
        te[1] = (a21 * b11) + (a22 * b21) + (a23 * b31);
        te[2] = (a31 * b11) + (a32 * b21) + (a33 * b31);
        te[3] = (a11 * b12) + (a12 * b22) + (a13 * b32);
        te[4] = (a21 * b12) + (a22 * b22) + (a23 * b32);
        te[5] = (a31 * b12) + (a32 * b22) + (a33 * b32);
        te[6] = (a11 * b13) + (a12 * b23) + (a13 * b33);
        te[7] = (a21 * b13) + (a22 * b23) + (a23 * b33);
        te[8] = (a31 * b13) + (a32 * b23) + (a33 * b33);
        return this;
    }

    /**
     * Sets matrix elements directly
     * @param {number} n11 - element (0,0)
     * @param {number} n12 - element (0,1)
     * @param {number} n13 - element (0,2)
     * @param {number} n21 - element (1,0)
     * @param {number} n22 - element (1,1)
     * @param {number} n23 - element (1,2)
     * @param {number} n31 - element (2,0)
     * @param {number} n32 - element (2,1)
     * @param {number} n33 - element (2,2)
     * @returns {Matrix3} this matrix for chaining
     */
    set(n11, n12, n13, n21, n22, n23, n31, n32, n33) {
        const te = this.elements;
        te[0] = n11; te[1] = n21; te[2] = n31;
        te[3] = n12; te[4] = n22; te[5] = n32;
        te[6] = n13; te[7] = n23; te[8] = n33;
        return this;
    }

    /**
     * Sets this matrix from a Matrix4 (upper-left 3x3).
     * @param {Matrix4} m - source matrix
     * @returns {Matrix3} this matrix for chaining
     */
    setFromMatrix4(m) {
        const me = m.elements;
        const te = this.elements;
        te[0] = me[0]; te[1] = me[1]; te[2] = me[2];
        te[3] = me[4]; te[4] = me[5]; te[5] = me[6];
        te[6] = me[8]; te[7] = me[9]; te[8] = me[10];
        return this;
    }

    /**
     * Transposes this matrix.
     * @returns {Matrix3} this matrix for chaining
     */
    transpose() {
        const te = this.elements;
        let tmp;
        tmp = te[1]; te[1] = te[3]; te[3] = tmp;
        tmp = te[2]; te[2] = te[6]; te[6] = tmp;
        tmp = te[5]; te[5] = te[7]; te[7] = tmp;
        return this;
    }

    *[Symbol.iterator]() {
        const te = this.elements;
        yield te[0]; yield te[1]; yield te[2];
        yield te[3]; yield te[4]; yield te[5];
        yield te[6]; yield te[7]; yield te[8];
    }
}
