import { Vector3 } from "./Vector3.js";

/** Bounding sphere defined by center and radius. */
export class Sphere {
	#centre = new Vector3();
	#radius = 1;

	/**
	 * @param {Vector3} [centre]
	 * @param {number} [radius]
	 */
	constructor(centre = new Vector3(), radius = 1) {
		this.#centre = centre.clone();
		this.#radius = radius;
	}

	/** @returns {Vector3} */
	get centre() {
		return this.#centre;
	}

	/** @param {Vector3} value */
	set centre(value) {
		this.#centre.copy(value);
	}

	/** @returns {number} */
	get radius() {
		return this.#radius;
	}

	/** @param {number} value */
	set radius(value) {
		this.#radius = value;
	}

	/** @returns {Sphere} */
	clone() {
		return new Sphere(this.centre, this.radius);
	}

	/**
	 * @param {Vector3} point
	 * @returns {boolean}
	 */
	containsPoint(point) {
		return point.clone().sub(this.centre).lengthSq <= this.radius * this.radius;
	}

	/**
	 * @param {Sphere} sphere
	 * @returns {Sphere}
	 */
	copy(sphere) {
		this.centre.copy(sphere.centre);
		this.radius = sphere.radius;
		return this;
	}

	/**
	 * @param {Vector3} point
	 * @returns {number}
	 */
	distanceToPoint(point) {
		return point.clone().sub(this.centre).length - this.radius;
	}

	/**
	 * @param {Sphere} sphere
	 * @returns {boolean}
	 */
	equals(sphere) {
		return (
			sphere.centre.x === this.centre.x &&
			sphere.centre.y === this.centre.y &&
			sphere.centre.z === this.centre.z &&
			sphere.radius === this.radius
		);
	}

	/**
	 * @param {Sphere} sphere
	 * @returns {boolean}
	 */
	intersectsSphere(sphere) {
		const r = this.radius + sphere.radius;
		return this.centre.clone().sub(sphere.centre).lengthSq <= r * r;
	}

	/**
	 * @param {Vector3} offset
	 * @returns {Sphere}
	 */
	translate(offset) {
		this.centre.add(offset);
		return this;
	}

	/**
	 * Sets this sphere to tightly bound the given points. If optionalCenter is
	 * provided it is used as the sphere centre; otherwise the centroid is used.
	 * @param {Vector3[]} points
	 * @param {Vector3} [optionalCenter]
	 * @returns {this}
	 */
	setFromPoints(points, optionalCenter) {
		const center = this.centre;
		if (optionalCenter) {
			center.copy(optionalCenter);
		} else {
			center.set(0, 0, 0);
			for (const p of points) {
				center.add(p);
			}
			if (points.length > 0) {
				center.mulScalar(1 / points.length);
			}
		}
		let maxRadiusSq = 0;
		for (const p of points) {
			const dx = p.x - center.x;
			const dy = p.y - center.y;
			const dz = p.z - center.z;
			maxRadiusSq = Math.max(maxRadiusSq, dx * dx + dy * dy + dz * dz);
		}
		this.radius = Math.sqrt(maxRadiusSq);
		return this;
	}

	/**
	 * Expands the sphere radius to include the given point if it lies outside.
	 * The centre is not moved.
	 * @param {Vector3} point
	 * @returns {this}
	 */
	expandByPoint(point) {
		const dx = point.x - this.centre.x;
		const dy = point.y - this.centre.y;
		const dz = point.z - this.centre.z;
		const distSq = dx * dx + dy * dy + dz * dz;
		if (distSq > this.radius * this.radius) {
			this.radius = Math.sqrt(distSq);
		}
		return this;
	}
}
