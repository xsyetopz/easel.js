import { Plane } from "./Plane.js";

export class Frustum {
	/** @type {Plane[]} 0: left, 1: right, 2: bottom, 3: top, 4: near, 5: far */
	planes = [];

	constructor() {
		this.planes.push(new Plane());
		this.planes.push(new Plane());
		this.planes.push(new Plane());
		this.planes.push(new Plane());
		this.planes.push(new Plane());
		this.planes.push(new Plane());
	}

	/** @returns {Frustum} */
	clone() {
		return new Frustum().copy(this);
	}

	/**
	 * @param {{ x: number, y: number, z: number }} point
	 * @returns {boolean}
	 */
	containsPoint(point) {
		const planes = this.planes;
		if (planes[0].distanceToPoint(point) < 0) return false;
		if (planes[1].distanceToPoint(point) < 0) return false;
		if (planes[2].distanceToPoint(point) < 0) return false;
		if (planes[3].distanceToPoint(point) < 0) return false;
		if (planes[4].distanceToPoint(point) < 0) return false;
		if (planes[5].distanceToPoint(point) < 0) return false;
		return true;
	}

	/**
	 * @param {Frustum} frustum
	 * @returns {this}
	 */
	copy(frustum) {
		const planes = this.planes;
		planes[0].copy(frustum.planes[0]);
		planes[1].copy(frustum.planes[1]);
		planes[2].copy(frustum.planes[2]);
		planes[3].copy(frustum.planes[3]);
		planes[4].copy(frustum.planes[4]);
		planes[5].copy(frustum.planes[5]);
		return this;
	}

	/**
	 * @param {{ min: { x: number, y: number, z: number }, max: { x: number, y: number, z: number } }} box
	 * @returns {boolean}
	 */
	intersectsBox(box) {
		const planes = this.planes;

		for (let i = 0; i < 6; i++) {
			const plane = planes[i];
			const normal = plane.normal;

			const px = normal.x > 0 ? box.max.x : box.min.x;
			const py = normal.y > 0 ? box.max.y : box.min.y;
			const pz = normal.z > 0 ? box.max.z : box.min.z;

			if (plane.distanceToPoint({ x: px, y: py, z: pz }) < 0) {
				return false;
			}
		}

		return true;
	}

	/**
	 * @param {{ centre: { x: number, y: number, z: number }, radius: number }} sphere
	 * @returns {boolean}
	 */
	intersectsSphere(sphere) {
		const planes = this.planes;
		const centre = sphere.centre;
		const negRadius = -sphere.radius;

		for (let i = 0; i < 6; i++) {
			const distance = planes[i].distanceToPoint(centre);
			if (distance < negRadius) return false;
		}

		return true;
	}

	/** @returns {this} */
	makeEmpty() {
		for (let i = 0; i < 6; i++) {
			this.planes[i] = new Plane();
		}
		return this;
	}

	/**
	 * Extracts the six frustum planes from a combined projection matrix.
	 * Uses the Gribb/Hartmann method (column-major layout).
	 *
	 * @param {{ elements: ArrayLike<number> }} m
	 * @returns {this}
	 */
	setFromProjectionMatrix(m) {
		const me = m.elements;
		const planes = this.planes;

		const me0 = me[0];
		const me1 = me[1];
		const me2 = me[2];
		const me3 = me[3];
		const me4 = me[4];
		const me5 = me[5];
		const me6 = me[6];
		const me7 = me[7];
		const me8 = me[8];
		const me9 = me[9];
		const me10 = me[10];
		const me11 = me[11];
		const me12 = me[12];
		const me13 = me[13];
		const me14 = me[14];
		const me15 = me[15];

		planes[0]
			.setComponents(me3 - me0, me7 - me4, me11 - me8, me15 - me12)
			.normalize(); /* left */
		planes[1]
			.setComponents(me3 + me0, me7 + me4, me11 + me8, me15 + me12)
			.normalize(); /* right */
		planes[2]
			.setComponents(me3 + me1, me7 + me5, me11 + me9, me15 + me13)
			.normalize(); /* bottom */
		planes[3]
			.setComponents(me3 - me1, me7 - me5, me11 - me9, me15 - me13)
			.normalize(); /* top */
		planes[4]
			.setComponents(me3 - me2, me7 - me6, me11 - me10, me15 - me14)
			.normalize(); /* near */
		planes[5]
			.setComponents(me3 + me2, me7 + me6, me11 + me10, me15 + me14)
			.normalize(); /* far */
		return this;
	}
}
