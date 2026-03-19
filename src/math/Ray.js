import { Vector3 } from "./Vector3.js";

const _v1 = new Vector3();
const _v2 = new Vector3();
const _v3 = new Vector3();
const _diff = new Vector3();
const _edge1 = new Vector3();
const _edge2 = new Vector3();
const _normal = new Vector3();

/**
 * Handles the s0 >= 0 sub-case of ray-segment distance (det > 0 branch).
 * @param {number} s0In
 * @param {number} s1In
 * @param {number} extDet
 * @param {number} segExtent
 * @param {number} a01
 * @param {number} b0
 * @param {number} b1
 * @param {number} det
 * @param {number} c
 * @returns {{ s0: number, s1: number, sqrDist: number }}
 */
function _segS0NonNeg(s0In, s1In, extDet, segExtent, a01, b0, b1, det, c) {
	let s0 = s0In;
	let s1 = s1In;
	let sqrDist;
	if (s1 >= -extDet) {
		if (s1 <= extDet) {
			const invDet = 1 / det;
			s0 *= invDet;
			s1 *= invDet;
			sqrDist =
				s0 * (s0 + a01 * s1 + 2 * b0) + s1 * (a01 * s0 + s1 + 2 * b1) + c;
		} else {
			s1 = segExtent;
			s0 = Math.max(0, -(a01 * s1 + b0));
			sqrDist = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
		}
	} else {
		s1 = -segExtent;
		s0 = Math.max(0, -(a01 * s1 + b0));
		sqrDist = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
	}
	return { s0, s1, sqrDist };
}

/**
 * Handles the det > 0 case of ray-segment distance.
 * @param {number} s0In
 * @param {number} s1In
 * @param {number} extDet
 * @param {number} segExtent
 * @param {number} a01
 * @param {number} b0
 * @param {number} b1
 * @param {number} det
 * @param {number} c
 * @returns {{ s0: number, s1: number, sqrDist: number }}
 */
function _segDetNonZero(s0In, s1In, extDet, segExtent, a01, b0, b1, det, c) {
	let s0 = s0In;
	let s1 = s1In;
	let sqrDist;
	if (s0 >= 0) {
		return _segS0NonNeg(s0, s1, extDet, segExtent, a01, b0, b1, det, c);
	}
	if (s1 <= -extDet) {
		s0 = Math.max(0, -(-a01 * segExtent + b0));
		s1 = s0 > 0 ? -segExtent : Math.min(Math.max(-segExtent, -b1), segExtent);
		sqrDist = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
	} else if (s1 <= extDet) {
		s0 = 0;
		s1 = Math.min(Math.max(-segExtent, -b1), segExtent);
		sqrDist = s1 * (s1 + 2 * b1) + c;
	} else {
		s0 = Math.max(0, -(a01 * segExtent + b0));
		s1 = s0 > 0 ? segExtent : Math.min(Math.max(-segExtent, -b1), segExtent);
		sqrDist = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
	}
	return { s0, s1, sqrDist };
}

/**
 * Computes slab interval along one axis for ray-box intersection.
 * @param {number} minVal
 * @param {number} maxVal
 * @param {number} originVal
 * @param {number} invdir
 * @returns {{ lo: number, hi: number }}
 */
function _boxSlab(minVal, maxVal, originVal, invdir) {
	if (invdir >= 0) {
		return {
			lo: (minVal - originVal) * invdir,
			hi: (maxVal - originVal) * invdir,
		};
	}
	return {
		lo: (maxVal - originVal) * invdir,
		hi: (minVal - originVal) * invdir,
	};
}

export class Ray {
	#origin = new Vector3(0, 0, 0);
	#direction = new Vector3(0, 0, -1);

	/**
	 * @param {Vector3} [origin]
	 * @param {Vector3} [direction]
	 */
	constructor(
		origin = new Vector3(0, 0, 0),
		direction = new Vector3(0, 0, -1),
	) {
		this.#origin = origin.clone();
		this.#direction = direction.clone();
	}

	/** @returns {Vector3} */
	get origin() {
		return this.#origin;
	}

	/** @param {Vector3} value */
	set origin(value) {
		this.#origin.copy(value);
	}

	/** @returns {Vector3} */
	get direction() {
		return this.#direction;
	}

	/** @param {Vector3} value */
	set direction(value) {
		this.#direction.copy(value);
	}

	/**
	 * @param {Vector3} origin
	 * @param {Vector3} direction
	 * @returns {this}
	 */
	set(origin, direction) {
		this.#origin.copy(origin);
		this.#direction.copy(direction);
		return this;
	}

	/** @returns {Ray} */
	clone() {
		return new Ray(this.#origin, this.#direction);
	}

	/**
	 * @param {Ray} ray
	 * @returns {this}
	 */
	copy(ray) {
		this.#origin.copy(ray.origin);
		this.#direction.copy(ray.direction);
		return this;
	}

	/**
	 * Returns the point at parameter t along the ray.
	 * @param {number} t
	 * @param {Vector3} [target]
	 * @returns {Vector3}
	 */
	at(t, target = new Vector3()) {
		return target.copy(this.#direction).mulScalar(t).add(this.#origin);
	}

	/**
	 * Aims the ray direction toward v.
	 * @param {Vector3} v
	 * @returns {this}
	 */
	lookAt(v) {
		this.#direction.copy(v).sub(this.#origin).normalize();
		return this;
	}

	/**
	 * Moves the origin to the point at t and keeps the direction.
	 * @param {number} t
	 * @returns {this}
	 */
	recast(t) {
		this.#origin.copy(this.at(t, _v1));
		return this;
	}

	/**
	 * @param {Vector3} point
	 * @param {Vector3} [target]
	 * @returns {Vector3}
	 */
	closestPointToPoint(point, target = new Vector3()) {
		target.copy(point).sub(this.#origin);
		const dirDist = target.dot(this.#direction);
		if (dirDist < 0) return target.copy(this.#origin);
		return target.copy(this.#direction).mulScalar(dirDist).add(this.#origin);
	}

	/**
	 * @param {Vector3} point
	 * @returns {number}
	 */
	distanceToPoint(point) {
		return Math.sqrt(this.distanceSqToPoint(point));
	}

	/**
	 * @param {Vector3} point
	 * @returns {number}
	 */
	distanceSqToPoint(point) {
		const dirDist = _v1.copy(point).sub(this.#origin).dot(this.#direction);
		if (dirDist < 0) return this.#origin.distanceSqTo(point);
		_v1.copy(this.#direction).mulScalar(dirDist).add(this.#origin);
		return _v1.distanceSqTo(point);
	}

	/**
	 * Squared distance from the ray to the closest point on a segment [v0,v1].
	 * @param {Vector3} v0
	 * @param {Vector3} v1
	 * @param {Vector3} [optionalPointOnRay]
	 * @param {Vector3} [optionalPointOnSegment]
	 * @returns {number}
	 */
	distanceSqToSegment(v0, v1, optionalPointOnRay, optionalPointOnSegment) {
		const segCenter = _v1.copy(v0).add(v1).mulScalar(0.5);
		const segDir = _v2.copy(v1).sub(v0).normalize();
		const diff = _v3.copy(this.#origin).sub(segCenter);

		const segExtent = v0.distanceTo(v1) * 0.5;
		const a01 = -this.#direction.dot(segDir);
		const b0 = diff.dot(this.#direction);
		const b1 = -diff.dot(segDir);
		const c = diff.dot(diff);
		const det = Math.abs(1 - a01 * a01);

		let s0;
		let s1;
		let sqrDist;

		if (det > 0) {
			const s0raw = a01 * b1 - b0;
			const s1raw = a01 * b0 - b1;
			const extDet = segExtent * det;
			const result = _segDetNonZero(
				s0raw,
				s1raw,
				extDet,
				segExtent,
				a01,
				b0,
				b1,
				det,
				c,
			);
			s0 = result.s0;
			s1 = result.s1;
			sqrDist = result.sqrDist;
		} else {
			s1 = a01 > 0 ? -segExtent : segExtent;
			s0 = Math.max(0, -(a01 * s1 + b0));
			sqrDist = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
		}

		if (optionalPointOnRay) {
			optionalPointOnRay.copy(this.#direction).mulScalar(s0).add(this.#origin);
		}
		if (optionalPointOnSegment) {
			optionalPointOnSegment.copy(segDir).mulScalar(s1).add(segCenter);
		}

		return sqrDist;
	}

	/**
	 * @param {{ centre: Vector3, radius: number }} sphere
	 * @param {Vector3} [target]
	 * @returns {Vector3|undefined}
	 */
	intersectSphere(sphere, target = new Vector3()) {
		_v1.copy(sphere.centre).sub(this.#origin);
		const tca = _v1.dot(this.#direction);
		const d2 = _v1.dot(_v1) - tca * tca;
		const r2 = sphere.radius * sphere.radius;
		if (d2 > r2) return undefined;
		const thc = Math.sqrt(r2 - d2);
		const t0 = tca - thc;
		const t1 = tca + thc;
		if (t1 < 0) return undefined;
		return this.at(t0 >= 0 ? t0 : t1, target);
	}

	/**
	 * @param {{ centre: Vector3, radius: number }} sphere
	 * @returns {boolean}
	 */
	intersectsSphere(sphere) {
		return (
			this.distanceSqToPoint(sphere.centre) <= sphere.radius * sphere.radius
		);
	}

	/**
	 * @param {{ normal: Vector3, constant: number }} plane
	 * @param {Vector3} [target]
	 * @returns {Vector3|undefined}
	 */
	intersectPlane(plane, target = new Vector3()) {
		const t = this.distanceToPlane(plane);
		if (t === undefined) return undefined;
		return this.at(t, target);
	}

	/**
	 * @param {{ normal: Vector3, constant: number }} plane
	 * @returns {boolean}
	 */
	intersectsPlane(plane) {
		const distToPoint = plane.normal.dot(this.#origin) + plane.constant;
		if (distToPoint === 0) return true;
		const denominator = plane.normal.dot(this.#direction);
		return denominator * distToPoint < 0;
	}

	/**
	 * @param {{ normal: Vector3, constant: number }} plane
	 * @returns {number|undefined}
	 */
	distanceToPlane(plane) {
		const denominator = plane.normal.dot(this.#direction);
		if (denominator === 0) {
			if (plane.normal.dot(this.#origin) + plane.constant === 0) return 0;
			return undefined;
		}
		const t = -(this.#origin.dot(plane.normal) + plane.constant) / denominator;
		return t >= 0 ? t : undefined;
	}

	/**
	 * @param {{ min: Vector3, max: Vector3 }} box
	 * @param {Vector3} [target]
	 * @returns {Vector3|undefined}
	 */
	intersectBox3(box, target = new Vector3()) {
		const origin = this.#origin;
		const invdirx = 1 / this.#direction.x;
		const invdiry = 1 / this.#direction.y;
		const invdirz = 1 / this.#direction.z;

		const x = _boxSlab(box.min.x, box.max.x, origin.x, invdirx);
		const y = _boxSlab(box.min.y, box.max.y, origin.y, invdiry);

		if (x.lo > y.hi || y.lo > x.hi) return undefined;
		const tmin0 = y.lo > x.lo ? y.lo : x.lo;
		const tmax0 = y.hi < x.hi ? y.hi : x.hi;

		const z = _boxSlab(box.min.z, box.max.z, origin.z, invdirz);

		if (tmin0 > z.hi || z.lo > tmax0) return undefined;
		const tmin = z.lo > tmin0 ? z.lo : tmin0;
		const tmax = z.hi < tmax0 ? z.hi : tmax0;

		if (tmax < 0) return undefined;
		return this.at(tmin >= 0 ? tmin : tmax, target);
	}

	/**
	 * @param {{ min: Vector3, max: Vector3 }} box
	 * @returns {boolean}
	 */
	intersectsBox3(box) {
		return this.intersectBox3(box, _v1) !== undefined;
	}

	/**
	 * Möller–Trumbore ray-triangle intersection.
	 * @param {Vector3} a
	 * @param {Vector3} b
	 * @param {Vector3} c
	 * @param {boolean} backfaceCulling
	 * @param {Vector3} [target]
	 * @returns {Vector3|undefined}
	 */
	intersectTriangle(a, b, c, backfaceCulling, target = new Vector3()) {
		_edge1.copy(b).sub(a);
		_edge2.copy(c).sub(a);
		_normal.copy(_edge1).cross(_edge2);

		let DdN = this.#direction.dot(_normal);
		let sign;
		if (DdN > 0) {
			if (backfaceCulling) return undefined;
			sign = 1;
		} else if (DdN < 0) {
			sign = -1;
			DdN = -DdN;
		} else {
			return undefined;
		}

		_diff.copy(this.#origin).sub(a);

		_v1.copy(_diff).cross(_edge2);
		const DdQxE2 = sign * this.#direction.dot(_v1);
		if (DdQxE2 < 0) return undefined;

		_v2.copy(_edge1).cross(_diff);
		const DdE1xQ = sign * this.#direction.dot(_v2);
		if (DdE1xQ < 0) return undefined;
		if (DdQxE2 + DdE1xQ > DdN) return undefined;

		const QdN = -sign * _diff.dot(_normal);
		if (QdN < 0) return undefined;

		return this.at(QdN / DdN, target);
	}

	/**
	 * @param {{ elements: ArrayLike<number> }} matrix4
	 * @returns {this}
	 */
	applyMatrix4(matrix4) {
		this.#direction.add(this.#origin);
		this.#origin.applyMatrix4(matrix4);
		this.#direction.applyMatrix4(matrix4);
		this.#direction.sub(this.#origin).normalize();
		return this;
	}

	/**
	 * @param {Ray} ray
	 * @returns {boolean}
	 */
	equals(ray) {
		return (
			ray.origin.equals(this.#origin) && ray.direction.equals(this.#direction)
		);
	}
}
