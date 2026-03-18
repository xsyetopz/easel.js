export class Quaternion {
	#x = 0;
	#y = 0;
	#z = 0;
	#w = 1;

	/**
	 * @param {number} [x]
	 * @param {number} [y]
	 * @param {number} [z]
	 * @param {number} [w]
	 */
	constructor(x = 0, y = 0, z = 0, w = 1) {
		this.#x = x;
		this.#y = y;
		this.#z = z;
		this.#w = w;
	}

	/** @returns {number} */
	get x() {
		return this.#x;
	}

	/** @param {number} value */
	set x(value) {
		this.#x = value;
	}

	/** @returns {number} */
	get y() {
		return this.#y;
	}

	/** @param {number} value */
	set y(value) {
		this.#y = value;
	}

	/** @returns {number} */
	get z() {
		return this.#z;
	}

	/** @param {number} value */
	set z(value) {
		this.#z = value;
	}

	/** @returns {number} */
	get w() {
		return this.#w;
	}

	/** @param {number} value */
	set w(value) {
		this.#w = value;
	}

	/** @returns {number} */
	get length() {
		return Math.sqrt(this.lengthSq);
	}

	/** @returns {number} */
	get lengthSq() {
		const { x, y, z, w } = this;
		return x * x + y * y + z * z + w * w;
	}

	/**
	 * @returns {Quaternion}
	 */
	clone() {
		return new Quaternion().copy(this);
	}

	/**
	 * @param {Quaternion} q
	 * @returns {this}
	 */
	copy(q) {
		this.x = q.x;
		this.y = q.y;
		this.z = q.z;
		this.w = q.w;
		return this;
	}

	/**
	 * @param {number} scalar
	 * @returns {this}
	 */
	divScalar(scalar) {
		this.x /= scalar;
		this.y /= scalar;
		this.z /= scalar;
		this.w /= scalar;
		return this;
	}

	/**
	 * @param {number[]} array
	 * @returns {this}
	 */
	fromArray(array) {
		this.x = array[0];
		this.y = array[1];
		this.z = array[2];
		this.w = array[3];
		return this;
	}

	/**
	 * Computes the conjugate (assumes unit quaternion).
	 * @returns {this}
	 */
	invert() {
		this.x = -this.x;
		this.y = -this.y;
		this.z = -this.z;
		return this;
	}

	/**
	 * Pre-multiplies this quaternion by q (Hamilton product: q * this).
	 * @param {Quaternion} q
	 * @returns {this}
	 */
	premul(q) {
		const { x, y, z, w } = this;
		const { x: qx, y: qy, z: qz, w: qw } = q;

		this.x = qx * w + qw * x + qy * z - qz * y;
		this.y = qy * w + qw * y + qz * x - qx * z;
		this.z = qz * w + qw * z + qx * y - qy * x;
		this.w = qw * w - qx * x - qy * y - qz * z;
		return this;
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @param {number} w
	 * @returns {this}
	 */
	set(x, y, z, w) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;
		return this;
	}

	/**
	 * @param {{ x: number, y: number, z: number }} axis
	 * @param {number} angle
	 * @returns {this}
	 */
	setFromAxisAngle(axis, angle) {
		const halfAngle = angle / 2;
		const s = Math.sin(halfAngle);

		this.x = axis.x * s;
		this.y = axis.y * s;
		this.z = axis.z * s;
		this.w = Math.cos(halfAngle);
		return this;
	}

	/**
	 * @param {{ x: number, y: number, z: number, order: string }} euler
	 * @returns {this}
	 */
	setFromEuler(euler) {
		const { x, y, z, order } = euler;

		const c1 = Math.cos(x / 2);
		const c2 = Math.cos(y / 2);
		const c3 = Math.cos(z / 2);
		const s1 = Math.sin(x / 2);
		const s2 = Math.sin(y / 2);
		const s3 = Math.sin(z / 2);

		switch (order) {
			case "XYZ":
				this.x = s1 * c2 * c3 + c1 * s2 * s3;
				this.y = c1 * s2 * c3 - s1 * c2 * s3;
				this.z = c1 * c2 * s3 + s1 * s2 * c3;
				this.w = c1 * c2 * c3 - s1 * s2 * s3;
				return this;
			case "YXZ":
				this.x = s1 * c2 * c3 + c1 * s2 * s3;
				this.y = c1 * s2 * c3 - s1 * c2 * s3;
				this.z = c1 * c2 * s3 - s1 * s2 * c3;
				this.w = c1 * c2 * c3 + s1 * s2 * s3;
				return this;
			case "ZXY":
				this.x = s1 * c2 * c3 - c1 * s2 * s3;
				this.y = c1 * s2 * c3 + s1 * c2 * s3;
				this.z = c1 * c2 * s3 + s1 * s2 * c3;
				this.w = c1 * c2 * c3 - s1 * s2 * s3;
				return this;
			case "ZYX":
				this.x = s1 * c2 * c3 - c1 * s2 * s3;
				this.y = c1 * s2 * c3 + s1 * c2 * s3;
				this.z = c1 * c2 * s3 - s1 * s2 * c3;
				this.w = c1 * c2 * c3 + s1 * s2 * s3;
				return this;
			case "YZX":
				this.x = s1 * c2 * c3 + c1 * s2 * s3;
				this.y = c1 * s2 * c3 + s1 * c2 * s3;
				this.z = c1 * c2 * s3 - s1 * s2 * c3;
				this.w = c1 * c2 * c3 - s1 * s2 * s3;
				return this;
			case "XZY":
				this.x = s1 * c2 * c3 - c1 * s2 * s3;
				this.y = c1 * s2 * c3 - s1 * c2 * s3;
				this.z = c1 * c2 * s3 + s1 * s2 * c3;
				this.w = c1 * c2 * c3 + s1 * s2 * s3;
				return this;
			default:
				return this;
		}
	}

	/**
	 * @param {{ elements: ArrayLike<number> }} m
	 * @returns {this}
	 */
	setFromRotationMatrix(m) {
		const te = m.elements;

		const m11 = te[0];
		const m12 = te[4];
		const m13 = te[8];
		const m21 = te[1];
		const m22 = te[5];
		const m23 = te[9];
		const m31 = te[2];
		const m32 = te[6];
		const m33 = te[10];

		const trace = m11 + m22 + m33;
		if (trace > 0) {
			const s = 0.5 / Math.sqrt(trace + 1.0);

			this.w = 0.25 / s;
			this.x = (m32 - m23) * s;
			this.y = (m13 - m31) * s;
			this.z = (m21 - m12) * s;
		} else if (m11 > m22 && m11 > m33) {
			const s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33);

			this.w = (m32 - m23) / s;
			this.x = 0.25 * s;
			this.y = (m12 + m21) / s;
			this.z = (m13 + m31) / s;
		} else if (m22 > m33) {
			const s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33);

			this.w = (m13 - m31) / s;
			this.x = (m12 + m21) / s;
			this.y = 0.25 * s;
			this.z = (m23 + m32) / s;
		} else {
			const s = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22);

			this.w = (m21 - m12) / s;
			this.x = (m13 + m31) / s;
			this.y = (m23 + m32) / s;
			this.z = 0.25 * s;
		}
		return this;
	}

	/**
	 * Normalizes this quaternion to unit length.
	 * @returns {this}
	 */
	normalize() {
		return this.divScalar(this.length || 1);
	}

	*[Symbol.iterator]() {
		yield this.x;
		yield this.y;
		yield this.z;
		yield this.w;
	}
}
