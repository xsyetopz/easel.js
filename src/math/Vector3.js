import { Quaternion } from "./Quaternion.js";

const _q = new Quaternion();

/** 3D vector with x, y, z components. */
export class Vector3 {
	#x = 0;
	#y = 0;
	#z = 0;

	/**
	 * @param {number} [x]
	 * @param {number} [y]
	 * @param {number} [z]
	 */
	constructor(x = 0, y = 0, z = 0) {
		this.#x = x;
		this.#y = y;
		this.#z = z;
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
	get length() {
		return Math.sqrt(this.lengthSq);
	}

	/** @returns {number} */
	get lengthSq() {
		const { x, y, z } = this;
		return x * x + y * y + z * z;
	}

	/**
	 * @param {Vector3} v
	 * @returns {this}
	 */
	add(v) {
		this.x += v.x;
		this.y += v.y;
		this.z += v.z;
		return this;
	}

	/**
	 * Applies an Euler rotation (XYZ order) in-place.
	 * @param {{ x: number, y: number, z: number, order: string }} euler
	 * @returns {this}
	 */
	applyEuler(euler) {
		_q.setFromEuler(euler);
		return this.applyQuaternion(_q);
	}

	/**
	 * Multiplies this vector by a 3x3 matrix (column-major flat array).
	 * @param {{ elements: ArrayLike<number> }} m
	 * @returns {this}
	 */
	applyMatrix3(m) {
		const me = m.elements;
		const { x, y, z } = this;
		this.x = me[0] * x + me[3] * y + me[6] * z;
		this.y = me[1] * x + me[4] * y + me[7] * z;
		this.z = me[2] * x + me[5] * y + me[8] * z;
		return this;
	}

	/**
	 * Multiplies this vector by a 4x4 matrix (column-major flat array), treating w=1.
	 * @param {{ elements: ArrayLike<number> }} m
	 * @returns {this}
	 */
	applyMatrix4(m) {
		const me = m.elements;
		const { x, y, z } = this;
		const w = 1 / (me[3] * x + me[7] * y + me[11] * z + me[15] || 1);
		this.x = (me[0] * x + me[4] * y + me[8] * z + me[12]) * w;
		this.y = (me[1] * x + me[5] * y + me[9] * z + me[13]) * w;
		this.z = (me[2] * x + me[6] * y + me[10] * z + me[14]) * w;
		return this;
	}

	/**
	 * Rotates this vector by a quaternion.
	 * @param {{ x: number, y: number, z: number, w: number }} q
	 * @returns {this}
	 */
	applyQuaternion(q) {
		const { x, y, z } = this;
		const qx = q.x;
		const qy = q.y;
		const qz = q.z;
		const qw = q.w;
		const ix = qw * x + qy * z - qz * y;
		const iy = qw * y + qz * x - qx * z;
		const iz = qw * z + qx * y - qy * x;
		const iw = -qx * x - qy * y - qz * z;
		this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
		this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
		this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
		return this;
	}

	/**
	 * @returns {Vector3}
	 */
	clone() {
		return new Vector3(this.x, this.y, this.z);
	}

	/**
	 * @param {Vector3} v
	 * @returns {this}
	 */
	copy(v) {
		this.x = v.x;
		this.y = v.y;
		this.z = v.z;
		return this;
	}

	/**
	 * Cross product of two 3D vectors, returned as a new Vector3.
	 * @param {number} x1
	 * @param {number} y1
	 * @param {number} z1
	 * @param {number} x2
	 * @param {number} y2
	 * @param {number} z2
	 * @returns {Vector3}
	 */
	static cross(x1, y1, z1, x2, y2, z2) {
		return new Vector3(y1 * z2 - y2 * z1, z1 * x2 - z2 * x1, x1 * y2 - x2 * y1);
	}

	/**
	 * Sets this vector to the cross product of this × v.
	 * @param {Vector3} v
	 * @returns {this}
	 */
	cross(v) {
		return this.crossVectors(this, v);
	}

	/**
	 * Sets this vector to the cross product of a × b.
	 * @param {Vector3} a
	 * @param {Vector3} b
	 * @returns {this}
	 */
	crossVectors(a, b) {
		const ax = a.x;
		const ay = a.y;
		const az = a.z;
		const bx = b.x;
		const by = b.y;
		const bz = b.z;
		this.x = ay * bz - az * by;
		this.y = az * bx - ax * bz;
		this.z = ax * by - ay * bx;
		return this;
	}

	/**
	 * @param {Vector3} v
	 * @returns {number}
	 */
	distanceTo(v) {
		return Math.sqrt(this.distanceSqTo(v));
	}

	/**
	 * @param {Vector3} v
	 * @returns {number}
	 */
	distanceSqTo(v) {
		const dx = this.x - v.x;
		const dy = this.y - v.y;
		const dz = this.z - v.z;
		return dx * dx + dy * dy + dz * dz;
	}

	/**
	 * @param {number} scalar
	 * @returns {this}
	 */
	divScalar(scalar) {
		return this.mulScalar(1 / scalar);
	}

	/**
	 * Dot product of (x, y, z) with a target vector.
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @param {Vector3} [target]
	 * @returns {number}
	 */
	static dot(x, y, z, target = new Vector3()) {
		return x * target.x + y * target.y + z * target.z;
	}

	/**
	 * @param {{ x: number, y: number, z: number }} v
	 * @returns {number}
	 */
	dot(v) {
		return this.x * v.x + this.y * v.y + this.z * v.z;
	}

	/**
	 * @param {Vector3} v
	 * @returns {boolean}
	 */
	equals(v) {
		return this.x === v.x && this.y === v.y && this.z === v.z;
	}

	/**
	 * @param {number[]} array
	 * @returns {this}
	 */
	fromArray(array) {
		this.x = array[0];
		this.y = array[1];
		this.z = array[2];
		return this;
	}

	/**
	 * Linearly interpolates toward v by t.
	 * @param {Vector3} v
	 * @param {number} t
	 * @returns {this}
	 */
	lerp(v, t) {
		this.x += (v.x - this.x) * t;
		this.y += (v.y - this.y) * t;
		this.z += (v.z - this.z) * t;
		return this;
	}

	/**
	 * @param {number} scalar
	 * @returns {this}
	 */
	mulScalar(scalar) {
		this.x *= scalar;
		this.y *= scalar;
		this.z *= scalar;
		return this;
	}

	/**
	 * @returns {this}
	 */
	negate() {
		this.x = -this.x;
		this.y = -this.y;
		this.z = -this.z;
		return this;
	}

	/**
	 * Normalizes this vector to unit length.
	 * @returns {this}
	 */
	normalize() {
		const len = this.length;
		return len > 0 ? this.divScalar(len) : this.set(0, 0, 0);
	}

	/**
	 * Projects this world-space vector into normalized device coordinates
	 * using the camera's matrixWorldInverse and projectionMatrix.
	 * @param {{ matrixWorldInverse: { elements: number[] }, projectionMatrix: { elements: number[] } }} camera
	 * @returns {this}
	 */
	project(camera) {
		return this.applyMatrix4(camera.matrixWorldInverse).applyMatrix4(
			camera.projectionMatrix,
		);
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @returns {this}
	 */
	set(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
		return this;
	}

	/**
	 * Reads the translation column from a 4x4 column-major matrix.
	 * @param {{ elements: ArrayLike<number> }} m
	 * @returns {this}
	 */
	setFromMatrixPosition(m) {
		const me = m.elements;
		this.x = me[12];
		this.y = me[13];
		this.z = me[14];
		return this;
	}

	/**
	 * @param {number} scalar
	 * @returns {this}
	 */
	setScalar(scalar) {
		this.x = scalar;
		this.y = scalar;
		this.z = scalar;
		return this;
	}

	/**
	 * @param {Vector3} v
	 * @returns {this}
	 */
	sub(v) {
		this.x -= v.x;
		this.y -= v.y;
		this.z -= v.z;
		return this;
	}

	/**
	 * Sets this vector to a - b.
	 * @param {Vector3} a
	 * @param {Vector3} b
	 * @returns {this}
	 */
	subVectors(a, b) {
		this.x = a.x - b.x;
		this.y = a.y - b.y;
		this.z = a.z - b.z;
		return this;
	}

	/**
	 * Sets this vector from spherical coordinates.
	 * @param {{ radius: number, phi: number, theta: number }} s
	 * @returns {this}
	 */
	setFromSpherical(s) {
		return this.setFromSphericalCoords(s.radius, s.phi, s.theta);
	}

	/**
	 * Sets this vector from spherical coordinates (radius, phi, theta).
	 * phi is polar angle from Y+ axis, theta is azimuthal angle from Z+ axis.
	 * @param {number} radius
	 * @param {number} phi
	 * @param {number} theta
	 * @returns {this}
	 */
	setFromSphericalCoords(radius, phi, theta) {
		const sinPhiRadius = Math.sin(phi) * radius;
		this.x = sinPhiRadius * Math.sin(theta);
		this.y = Math.cos(phi) * radius;
		this.z = sinPhiRadius * Math.cos(theta);
		return this;
	}

	*[Symbol.iterator]() {
		yield this.x;
		yield this.y;
		yield this.z;
	}
}
