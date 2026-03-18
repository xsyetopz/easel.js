import { Matrix3 } from "./Matrix3.js";
import { Vector3 } from "./Vector3.js";

export class Plane {
	#normal = new Vector3(1, 0, 0);
	#constant = 0;

	/**
	 * @param {Vector3} normal
	 * @param {number} constant
	 */
	constructor(normal = new Vector3(1, 0, 0), constant = 0) {
		const length = normal.length;
		this.#normal = normal.clone().normalize();
		this.#constant = constant / length;
	}

	/** @returns {Vector3} */
	get normal() {
		return this.#normal;
	}

	/** @param {Vector3} value */
	set normal(value) {
		this.#normal.copy(value).normalize();
	}

	/** @returns {number} */
	get constant() {
		return this.#constant;
	}

	/** @param {number} value */
	set constant(value) {
		this.#constant = value;
	}

	/**
	 * @param {import("./Matrix4.js").Matrix4} m
	 * @returns {Plane}
	 */
	applyMatrix4(m) {
		const normalMatrix = new Matrix3().getNormalMatrix(m);
		const referencePoint = this.coplanarPoint(new Vector3()).applyMatrix4(m);
		this.normal.applyMatrix3(normalMatrix).normalize();
		this.constant = -referencePoint.dot(this.normal);
		return this;
	}

	/**
	 * @param {Vector3} [target]
	 * @returns {Vector3}
	 */
	coplanarPoint(target = new Vector3()) {
		return target.copy(this.normal).mulScalar(-this.constant);
	}

	/** @returns {Plane} */
	clone() {
		return new Plane(this.normal, this.constant);
	}

	/**
	 * @param {Plane} plane
	 * @returns {Plane}
	 */
	copy(plane) {
		this.normal.copy(plane.normal);
		this.constant = plane.constant;
		return this;
	}

	/**
	 * @param {{ x: number, y: number, z: number }} point
	 * @returns {number}
	 */
	distanceToPoint(point) {
		return this.normal.dot(point) + this.constant;
	}

	/**
	 * @param {Plane} plane
	 * @returns {boolean}
	 */
	equals(plane) {
		return plane.normal.equals(this.normal) && plane.constant === this.constant;
	}

	/**
	 * @param {{ start: Vector3, end: Vector3 }} line
	 * @param {Vector3} [target]
	 * @returns {Vector3 | undefined}
	 */
	intersectLine(line, target = new Vector3()) {
		const dir = line.end.sub(line.start);
		const denom = this.normal.dot(dir);
		if (denom === 0) {
			return this.distanceToPoint(line.start) === 0
				? target.copy(line.start)
				: undefined;
		}
		const t = -(line.start.dot(this.normal) + this.constant) / denom;
		if (t < 0 || t > 1) return undefined;
		return target.copy(dir).mulScalar(t).add(line.start);
	}

	/**
	 * @param {{ centre: Vector3, radius: number }} sphere
	 * @returns {boolean}
	 */
	intersectsSphere(sphere) {
		return this.distanceToPoint(sphere.centre) <= sphere.radius;
	}

	/**
	 * @param {Vector3} point
	 * @param {Vector3} [target]
	 * @returns {Vector3}
	 */
	projectPoint(point, target = new Vector3()) {
		return target
			.copy(this.normal)
			.mulScalar(-this.distanceToPoint(point))
			.add(point);
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @param {number} w
	 * @returns {Plane}
	 */
	setComponents(x, y, z, w) {
		this.normal.set(x, y, z);
		this.constant = w;
		return this;
	}

	/**
	 * @param {Vector3} a
	 * @param {Vector3} b
	 * @param {Vector3} c
	 * @returns {Plane}
	 */
	setFromCoplanarPoints(a, b, c) {
		const v1 = b.clone().sub(a);
		const v2 = c.clone().sub(a);
		const normal = v1.clone().cross(v2).normalize();
		this.setFromNormalAndCoplanarPoint(normal, a);
		return this;
	}

	/**
	 * @param {Vector3} normal
	 * @param {Vector3} point
	 * @returns {Plane}
	 */
	setFromNormalAndCoplanarPoint(normal, point) {
		this.normal.copy(normal).normalize();
		this.constant = -point.clone().dot(this.normal);
		return this;
	}

	/**
	 * @param {Vector3} offset
	 * @returns {Plane}
	 */
	translate(offset) {
		this.constant -= offset.dot(this.normal);
		return this;
	}

	/** @returns {Plane} */
	normalize() {
		const length = this.normal.length;
		this.normal.divScalar(length);
		this.constant /= length;
		return this;
	}
}
