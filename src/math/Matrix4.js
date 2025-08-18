export class Matrix4 {
    /**
     * Creates new 4x4 identity matrix.
     */
    constructor() {
        /** @type {Float32Array} */
        this.elements = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    /**
     * Clones this matrix.
     * @returns {Matrix4} new matrix with same values
     */
    clone() {
        return new Matrix4().copy(this);
    }

    /**
     * Composes transformation matrix from position, quaternion, and scale.
     * @param {Vector3} position - translation vector
     * @param {Quaternion} quaternion - rotation quaternion
     * @param {Vector3} scale - scale vector
     * @returns {Matrix4} this matrix for chaining
     */
    compose(position, quaternion, scale) {
        const te = this.elements;
        const quatX = quaternion.x, quatY = quaternion.y, quatZ = quaternion.z, quatW = quaternion.w;
        const doubleX = quatX + quatX, doubleY = quatY + quatY, doubleZ = quatZ + quatZ;
        const quatXX = quatX * doubleX, quatXY = quatX * doubleY, quatXZ = quatX * doubleZ;
        const quatYY = quatY * doubleY, quatYZ = quatY * doubleZ, quatZZ = quatZ * doubleZ;
        const quatWX = quatW * doubleX, quatWY = quatW * doubleY, quatWZ = quatW * doubleZ;

        const scaleX = scale.x, scaleY = scale.y, scaleZ = scale.z;

        te[0] = (1 - (quatYY + quatZZ)) * scaleX;
        te[1] = (quatXY + quatWZ) * scaleX;
        te[2] = (quatXZ - quatWY) * scaleX;
        te[3] = 0;

        te[4] = (quatXY - quatWZ) * scaleY;
        te[5] = (1 - (quatXX + quatZZ)) * scaleY;
        te[6] = (quatYZ + quatWX) * scaleY;
        te[7] = 0;

        te[8] = (quatXZ + quatWY) * scaleZ;
        te[9] = (quatYZ - quatWX) * scaleZ;
        te[10] = (1 - (quatXX + quatYY)) * scaleZ;
        te[11] = 0;

        te[12] = position.x;
        te[13] = position.y;
        te[14] = position.z;
        te[15] = 1;

        return this;
    }

    /**
     * Copies values from another matrix.
     * @param {Matrix4} m - source matrix
     * @returns {Matrix4} this matrix for chaining
     */
    copy(m) {
        const te = this.elements;
        const me = m.elements;
        for (let i = 0; i < 16; i++) {
            te[i] = me[i];
        }
        return this;
    }

    /**
     * Calculates determinant of this matrix.
     * @returns {number} determinant value
     */
    determinant() {
        const te = this.elements;

        const n11 = te[0], n12 = te[4], n13 = te[8], n14 = te[12];
        const n21 = te[1], n22 = te[5], n23 = te[9], n24 = te[13];
        const n31 = te[2], n32 = te[6], n33 = te[10], n34 = te[14];
        const n41 = te[3], n42 = te[7], n43 = te[11], n44 = te[15];

        return (
            n41 * (
                n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34
            ) +
            n42 * (
                n11 * n23 * n34 - n11 * n24 * n33 + n14 * n21 * n33 - n13 * n21 * n34 + n13 * n24 * n31 - n14 * n23 * n31
            ) +
            n43 * (
                n11 * n24 * n32 - n11 * n22 * n34 - n14 * n21 * n32 + n12 * n21 * n34 + n14 * n22 * n31 - n12 * n24 * n31
            ) +
            n44 * (
                -n13 * n22 * n31 - n11 * n23 * n32 + n11 * n22 * n33 + n13 * n21 * n32 - n12 * n21 * n33 + n12 * n23 * n31
            )
        );
    }

    /**
     * Extracts rotation component from matrix, removing scale.
     * @param {Matrix4} m - source matrix
     * @returns {Matrix4} this matrix for chaining
     */
    extractRotation(m) {
        const te = this.elements;
        const me = m.elements;

        const scaleX = 1 / Math.sqrt(me[0] * me[0] + me[1] * me[1] + me[2] * me[2]);
        const scaleY = 1 / Math.sqrt(me[4] * me[4] + me[5] * me[5] + me[6] * me[6]);
        const scaleZ = 1 / Math.sqrt(me[8] * me[8] + me[9] * me[9] + me[10] * me[10]);

        te[0] = me[0] * scaleX;
        te[1] = me[1] * scaleX;
        te[2] = me[2] * scaleX;
        te[3] = 0;

        te[4] = me[4] * scaleY;
        te[5] = me[5] * scaleY;
        te[6] = me[6] * scaleY;
        te[7] = 0;

        te[8] = me[8] * scaleZ;
        te[9] = me[9] * scaleZ;
        te[10] = me[10] * scaleZ;
        te[11] = 0;

        te[12] = 0;
        te[13] = 0;
        te[14] = 0;
        te[15] = 1;

        return this;
    }

    /**
     * Resets this matrix to identity.
     * @returns {Matrix4} this matrix for chaining
     */
    identity() {
        this.elements = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
        return this;
    }

    /**
     * Inverts this matrix.
     * @returns {Matrix4} this matrix for chaining
     * @throws {Error} if matrix is not invertible
     */
    invert() {
        const te = this.elements;

        const n11 = te[0], n21 = te[1], n31 = te[2], n41 = te[3];
        const n12 = te[4], n22 = te[5], n32 = te[6], n42 = te[7];
        const n13 = te[8], n23 = te[9], n33 = te[10], n43 = te[11];
        const n14 = te[12], n24 = te[13], n34 = te[14], n44 = te[15];

        const t11 = (n23 * n34 * n42) - (n24 * n33 * n42) +
            (n24 * n32 * n43) - (n22 * n34 * n43) -
            (n23 * n32 * n44) + (n22 * n33 * n44);
        const t12 = (n14 * n33 * n42) - (n13 * n34 * n42) -
            (n14 * n32 * n43) + (n12 * n34 * n43) +
            (n13 * n32 * n44) - (n12 * n33 * n44);
        const t13 = (n13 * n24 * n42) - (n14 * n23 * n42) +
            (n14 * n22 * n43) - (n12 * n24 * n43) -
            (n13 * n22 * n44) + (n12 * n23 * n44);
        const t14 = (n14 * n23 * n32) - (n13 * n24 * n32) -
            (n14 * n22 * n33) + (n12 * n24 * n33) +
            (n13 * n22 * n34) - (n12 * n23 * n34);

        const det = (n11 * t11) + (n21 * t12) + (n31 * t13) + (n41 * t14);
        if (det === 0) {
            throw new Error(
                "Matrix4.invert(): non-invertible matrix (det === 0)",
            );
        }
        const detInv = 1 / det;

        te[0] = t11 * detInv;
        te[1] = ((n24 * n33 * n41) - (n23 * n34 * n41) -
            (n24 * n31 * n43) + (n21 * n34 * n43) +
            (n23 * n31 * n44) - (n21 * n33 * n44)) * detInv;
        te[2] = ((n22 * n34 * n41) - (n24 * n32 * n41) +
            (n24 * n31 * n42) - (n21 * n34 * n42) -
            (n22 * n31 * n44) + (n21 * n32 * n44)) * detInv;
        te[3] = ((n23 * n32 * n41) - (n22 * n33 * n41) -
            (n23 * n31 * n42) + (n21 * n33 * n42) +
            (n22 * n31 * n43) - (n21 * n32 * n43)) * detInv;
        te[4] = t12 * detInv;
        te[5] = ((n13 * n34 * n41) - (n14 * n33 * n41) +
            (n14 * n31 * n43) - (n11 * n34 * n43) -
            (n13 * n31 * n44) + (n11 * n33 * n44)) * detInv;
        te[6] = ((n14 * n32 * n41) - (n12 * n34 * n41) -
            (n14 * n31 * n42) + (n11 * n34 * n42) +
            (n12 * n31 * n44) - (n11 * n32 * n44)) * detInv;
        te[7] = ((n12 * n33 * n41) - (n13 * n32 * n41) +
            (n13 * n31 * n42) - (n11 * n33 * n42) -
            (n12 * n31 * n43) + (n11 * n32 * n43)) * detInv;
        te[8] = t13 * detInv;
        te[9] = ((n14 * n23 * n41) - (n13 * n24 * n41) -
            (n14 * n21 * n43) + (n11 * n24 * n43) +
            (n13 * n21 * n44) - (n11 * n23 * n44)) * detInv;
        te[10] = ((n12 * n24 * n41) - (n14 * n22 * n41) +
            (n14 * n21 * n42) - (n11 * n24 * n42) -
            (n12 * n21 * n44) + (n11 * n22 * n44)) * detInv;
        te[11] = ((n13 * n22 * n41) - (n12 * n23 * n41) -
            (n13 * n21 * n42) + (n11 * n23 * n42) +
            (n12 * n21 * n43) - (n11 * n22 * n43)) * detInv;
        te[12] = t14 * detInv;
        te[13] = ((n13 * n24 * n31) - (n14 * n23 * n31) +
            (n14 * n21 * n33) - (n11 * n24 * n33) -
            (n13 * n21 * n34) + (n11 * n23 * n34)) * detInv;
        te[14] = ((n14 * n22 * n31) - (n12 * n24 * n31) -
            (n14 * n21 * n32) + (n11 * n24 * n32) +
            (n12 * n21 * n34) - (n11 * n22 * n34)) * detInv;
        te[15] = ((n12 * n23 * n31) - (n13 * n22 * n31) +
            (n13 * n21 * n32) - (n11 * n23 * n32) -
            (n12 * n21 * n33) + (n11 * n22 * n33)) * detInv;
        return this;
    }

    /**
     * Creates look-at view matrix.
     * @param {Vector3} eye - camera position
     * @param {Vector3} target - target position to look at
     * @param {Vector3} up - up direction vector
     * @returns {Matrix4} this matrix for chaining
     */
    lookAt(eye, target, up) {
        const te = this.elements;

        const xAxis = new (Vector3 || Object)();
        const yAxis = new (Vector3 || Object)();
        const zAxis = new (Vector3 || Object)();
        zAxis.x = eye.x - target.x;
        zAxis.y = eye.y - target.y;
        zAxis.z = eye.z - target.z;
        const zLen = Math.sqrt(zAxis.x * zAxis.x + zAxis.y * zAxis.y + zAxis.z * zAxis.z);
        if (zLen !== 0) {
            zAxis.x /= zLen; zAxis.y /= zLen; zAxis.z /= zLen;
        }

        const cross = (a, b) => ({
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        });

        const xCross = cross(up, zAxis);
        xAxis.x = xCross.x;
        xAxis.y = xCross.y;
        xAxis.z = xCross.z;
        const xLength = Math.sqrt(xAxis.x * xAxis.x + xAxis.y * xAxis.y + xAxis.z * xAxis.z);
        if (xLength !== 0) {
            xAxis.x /= xLength; xAxis.y /= xLength; xAxis.z /= xLength;
        }

        const yCross = cross(zAxis, xAxis);
        yAxis.x = yCross.x;
        yAxis.y = yCross.y;
        yAxis.z = yCross.z;

        te[0] = xAxis.x; te[4] = yAxis.x; te[8] = zAxis.x;
        te[1] = xAxis.y; te[5] = yAxis.y; te[9] = zAxis.y;
        te[2] = xAxis.z; te[6] = yAxis.z; te[10] = zAxis.z;

        return this;
    }

    /**
     * Creates orthographic projection matrix.
     * @param {number} left - left plane
     * @param {number} right - right plane
     * @param {number} top - top plane
     * @param {number} bottom - bottom plane
     * @param {number} near - near clipping plane
     * @param {number} far - far clipping plane
     * @returns {Matrix4} this matrix for chaining
     */
    makeOrtho(left, right, top, bottom, near, far) {
        const widthRatio = 1.0 / (right - left);
        const heightRatio = 1.0 / (top - bottom);
        const depthRatio = 1.0 / (far - near);

        const te = this.elements;
        te[0] = 2 * widthRatio, te[1] = 0, te[2] = 0, te[3] = 0;
        te[4] = 0, te[5] = 2 * heightRatio, te[6] = 0, te[7] = 0;
        te[8] = 0, te[9] = 0, te[10] = -2 * depthRatio, te[11] = 0;
        te[12] = -((right + left) * widthRatio),
            te[13] = -((top + bottom) * heightRatio),
            te[14] = -((far + near) * depthRatio),
            te[15] = 1;
        return this;
    }

    /**
     * Creates perspective projection matrix.
     * @param {number} fov - field of view in radians
     * @param {number} aspect - aspect ratio (width/height)
     * @param {number} near - near clipping plane
     * @param {number} far - far clipping plane
     * @returns {Matrix4} this matrix for chaining
     */
    makePersp(fov, aspect, near, far) {
        const halfFovTangent = Math.tan(fov / 2);

        const frustumLeft = -aspect * halfFovTangent * near;
        const frustumRight = aspect * halfFovTangent * near;
        const frustumTop = halfFovTangent * near;
        const frustumBottom = -halfFovTangent * near;

        const te = this.elements;
        te[0] = (2 * near) / (frustumRight - frustumLeft), te[1] = 0, te[2] = 0, te[3] = 0;
        te[4] = 0, te[5] = (2 * near) / (frustumTop - frustumBottom), te[6] = 0, te[7] = 0;
        te[8] = (frustumRight + frustumLeft) / (frustumRight - frustumLeft),
            te[9] = (frustumTop + frustumBottom) / (frustumTop - frustumBottom),
            te[10] = -(far + near) / (far - near),
            te[11] = -1;
        te[12] = 0,
            te[13] = 0,
            te[14] = -(2 * far * near) / (far - near),
            te[15] = 0;

        return this;
    }

    /**
     * Creates rotation matrix around X axis.
     * @param {number} radians - rotation angle in radians
     * @returns {Matrix4} this matrix for chaining
     */
    makeRotationX(radians) {
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);

        const te = this.elements;
        te[0] = 1; te[4] = 0; te[8] = 0; te[12] = 0;
        te[1] = 0; te[5] = cos; te[9] = -sin; te[13] = 0;
        te[2] = 0; te[6] = sin; te[10] = cos; te[14] = 0;
        te[3] = 0; te[7] = 0; te[11] = 0; te[15] = 1;
        return this;
    }

    /**
     * Creates rotation matrix around Y axis.
     * @param {number} radians - rotation angle in radians
     * @returns {Matrix4} this matrix for chaining
     */
    makeRotationY(radians) {
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);

        const te = this.elements;
        te[0] = cos; te[4] = 0; te[8] = sin; te[12] = 0;
        te[1] = 0; te[5] = 1; te[9] = 0; te[13] = 0;
        te[2] = -sin; te[6] = 0; te[10] = cos; te[14] = 0;
        te[3] = 0; te[7] = 0; te[11] = 0; te[15] = 1;
        return this;
    }

    /**
     * Creates rotation matrix around Z axis.
     * @param {number} radians - rotation angle in radians
     * @returns {Matrix4} this matrix for chaining
     */
    makeRotationZ(radians) {
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);

        const te = this.elements;
        te[0] = cos; te[4] = -sin; te[8] = 0; te[12] = 0;
        te[1] = sin; te[5] = cos; te[9] = 0; te[13] = 0;
        te[2] = 0; te[6] = 0; te[10] = 1; te[14] = 0;
        te[3] = 0; te[7] = 0; te[11] = 0; te[15] = 1;
        return this;
    }

    /**
     * Creates scale matrix.
     * @param {number} x - scale x
     * @param {number} y - scale y
     * @param {number} z - scale z
     * @returns {Matrix4} this matrix for chaining
     */
    makeScale(x, y, z) {
        const te = this.elements;
        te[0] = x; te[4] = 0; te[8] = 0; te[12] = 0;
        te[1] = 0; te[5] = y; te[9] = 0; te[13] = 0;
        te[2] = 0; te[6] = 0; te[10] = z; te[14] = 0;
        te[3] = 0; te[7] = 0; te[11] = 0; te[15] = 1;
        return this;
    }

    /**
     * Creates translation matrix.
     * @param {number} x - translation x
     * @param {number} y - translation y
     * @param {number} z - translation z
     * @returns {Matrix4} this matrix for chaining
     */
    makeTranslation(x, y, z) {
        this.identity();

        const te = this.elements;
        te[12] = x;
        te[13] = y;
        te[14] = z;
        return this;
    }

    /**
     * Multiplies two matrices and stores result in this matrix.
     * @param {Matrix4} a - first matrix
     * @param {Matrix4} b - second matrix
     * @returns {Matrix4} this matrix for chaining
     */
    mulMatrices(a, b) {
        const ae = a.elements;
        const be = b.elements;
        const te = this.elements;

        const a11 = ae[0], a12 = ae[4], a13 = ae[8], a14 = ae[12];
        const a21 = ae[1], a22 = ae[5], a23 = ae[9], a24 = ae[13];
        const a31 = ae[2], a32 = ae[6], a33 = ae[10], a34 = ae[14];
        const a41 = ae[3], a42 = ae[7], a43 = ae[11], a44 = ae[15];

        const b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12];
        const b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13];
        const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
        const b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];

        te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
        te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
        te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
        te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;

        te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
        te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
        te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
        te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;

        te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
        te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
        te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
        te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;

        te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
        te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
        te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
        te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
        return this;
    }

    /**
     * Multiplies this matrix by another matrix.
     * @param {Matrix4} m - matrix to multiply by
     * @returns {Matrix4} this matrix for chaining
     */
    mul(m) {
        return this.mulMatrices(this, m);
    }

    /**
     * Sets matrix elements directly
     * @param {number} n11 - element (0,0)
     * @param {number} n12 - element (0,1)
     * @param {number} n13 - element (0,2)
     * @param {number} n14 - element (0,3)
     * @param {number} n21 - element (1,0)
     * @param {number} n22 - element (1,1)
     * @param {number} n23 - element (1,2)
     * @param {number} n24 - element (1,3)
     * @param {number} n31 - element (2,0)
     * @param {number} n32 - element (2,1)
     * @param {number} n33 - element (2,2)
     * @param {number} n34 - element (2,3)
     * @param {number} n41 - element (3,0)
     * @param {number} n42 - element (3,1)
     * @param {number} n43 - element (3,2)
     * @param {number} n44 - element (3,3)
     * @returns {Matrix4} this matrix for chaining
     */
    set(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44) {
        const te = this.elements;
        te[0] = n11; te[4] = n12; te[8] = n13; te[12] = n14;
        te[1] = n21; te[5] = n22; te[9] = n23; te[13] = n24;
        te[2] = n31; te[6] = n32; te[10] = n33; te[14] = n34;
        te[3] = n41; te[7] = n42; te[11] = n43; te[15] = n44;
        return this;
    }

    /**
     * Transposes this matrix.
     * @returns {Matrix4} this matrix for chaining
     */
    transpose() {
        const te = this.elements;
        let tmp;

        tmp = te[1]; te[1] = te[4]; te[4] = tmp;
        tmp = te[2]; te[2] = te[8]; te[8] = tmp;
        tmp = te[6]; te[6] = te[9]; te[9] = tmp;

        tmp = te[3]; te[3] = te[12]; te[12] = tmp;
        tmp = te[7]; te[7] = te[13]; te[13] = tmp;
        tmp = te[11]; te[11] = te[14]; te[14] = tmp;

        return this;
    }
}
