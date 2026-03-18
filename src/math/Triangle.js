import { Plane } from "./Plane.js";
import { Vector3 } from "./Vector3.js";

const _v0 = new Vector3();
const _v1 = new Vector3();
const _v2 = new Vector3();
const _v3 = new Vector3();
const _v4 = new Vector3();
const _v5 = new Vector3();

/**
 * Projects point onto the nearest edge/vertex of triangle (a, b, c).
 * @param {Vector3} a
 * @param {Vector3} b
 * @param {Vector3} c
 * @param {Vector3} point
 * @param {Vector3} target
 * @returns {Vector3}
 */
function _closestOnEdges(a, b, c, point, target) {
	const ab = _v3.copy(b).sub(a);
	const ac = _v4.copy(c).sub(a);
	const bc = _v5.copy(c).sub(b);
	const ap = _v2.copy(point).sub(a);

	const snom = ap.dot(ab);
	const sdenom = point.clone().sub(b).dot(ab.negate());
	const tnom = ap.dot(ac);
	const tdenom = point.clone().sub(c).dot(ac.negate());

	if (snom <= 0 && tnom <= 0) return target.copy(a);

	const unom = point.clone().sub(b).dot(bc);
	const udenom = point.clone().sub(c).dot(bc.negate());

	if (sdenom <= 0 && unom <= 0) return target.copy(b);
	if (tdenom <= 0 && udenom <= 0) return target.copy(c);

	const n = Triangle.getNormal(a, b, c, new Vector3());
	return _projectOntoEdge(
		n,
		a,
		b,
		c,
		point,
		target,
		ab,
		ac,
		bc,
		snom,
		sdenom,
		tnom,
		tdenom,
		unom,
		udenom,
	);
}

/**
 * @param {Vector3} n
 * @param {Vector3} a
 * @param {Vector3} b
 * @param {Vector3} c
 * @param {Vector3} point
 * @param {Vector3} target
 * @param {Vector3} ab
 * @param {Vector3} ac
 * @param {Vector3} bc
 * @param {number} snom
 * @param {number} sdenom
 * @param {number} tnom
 * @param {number} tdenom
 * @param {number} unom
 * @param {number} udenom
 * @returns {Vector3}
 */
function _projectOntoEdge(
	n,
	a,
	b,
	c,
	point,
	target,
	ab,
	ac,
	bc,
	snom,
	sdenom,
	tnom,
	tdenom,
	unom,
	udenom,
) {
	const vc = n.dot(_v0.copy(a).sub(point).cross(_v0.copy(b).sub(point)));
	if (vc <= 0 && snom >= 0 && sdenom >= 0) {
		return target.copy(a).add(_v0.copy(ab).mulScalar(snom / (snom + sdenom)));
	}
	const va = n.dot(_v1.copy(b).sub(point).cross(_v1.copy(c).sub(point)));
	if (va <= 0 && unom >= 0 && udenom >= 0) {
		return target.copy(b).add(_v1.copy(bc).mulScalar(unom / (unom + udenom)));
	}
	const vb = n.dot(_v2.copy(c).sub(point).cross(_v2.copy(a).sub(point)));
	if (vb <= 0 && tnom >= 0 && tdenom >= 0) {
		return target.copy(a).add(_v3.copy(ac).mulScalar(tnom / (tnom + tdenom)));
	}

	const denom = va + vb + vc;
	const s = vb / denom;
	const t = vc / denom;
	return target
		.copy(a)
		.add(_v4.copy(b).sub(a).mulScalar(s))
		.add(_v5.copy(c).sub(a).mulScalar(t));
}

export class Triangle {
	#a = new Vector3();
	#b = new Vector3();
	#c = new Vector3();

	/**
	 * @param {Vector3} [a]
	 * @param {Vector3} [b]
	 * @param {Vector3} [c]
	 */
	constructor(a = new Vector3(), b = new Vector3(), c = new Vector3()) {
		this.#a = a.clone();
		this.#b = b.clone();
		this.#c = c.clone();
	}

	/** @returns {Vector3} */
	get a() {
		return this.#a;
	}

	/** @param {Vector3} value */
	set a(value) {
		this.#a.copy(value);
	}

	/** @returns {Vector3} */
	get b() {
		return this.#b;
	}

	/** @param {Vector3} value */
	set b(value) {
		this.#b.copy(value);
	}

	/** @returns {Vector3} */
	get c() {
		return this.#c;
	}

	/** @param {Vector3} value */
	set c(value) {
		this.#c.copy(value);
	}

	/**
	 * @param {Vector3} a
	 * @param {Vector3} b
	 * @param {Vector3} c
	 * @returns {this}
	 */
	set(a, b, c) {
		this.#a.copy(a);
		this.#b.copy(b);
		this.#c.copy(c);
		return this;
	}

	/** @returns {Triangle} */
	clone() {
		return new Triangle(this.#a, this.#b, this.#c);
	}

	/**
	 * @param {Triangle} triangle
	 * @returns {this}
	 */
	copy(triangle) {
		this.#a.copy(triangle.a);
		this.#b.copy(triangle.b);
		this.#c.copy(triangle.c);
		return this;
	}

	/** @returns {number} */
	getArea() {
		_v0.copy(this.#c).sub(this.#b);
		_v1.copy(this.#b).sub(this.#a);
		return _v0.cross(_v1).length * 0.5;
	}

	/**
	 * Computes barycentric coordinates of point relative to triangle (a, b, c).
	 * Returns null if point is not coplanar or triangle is degenerate.
	 * @param {Vector3} point
	 * @param {Vector3} a
	 * @param {Vector3} b
	 * @param {Vector3} c
	 * @param {Vector3} [target]
	 * @returns {Vector3|null}
	 */
	static getBarycoord(point, a, b, c, target = new Vector3()) {
		_v0.copy(c).sub(a);
		_v1.copy(b).sub(a);
		_v2.copy(point).sub(a);

		const dot00 = _v0.dot(_v0);
		const dot01 = _v0.dot(_v1);
		const dot02 = _v0.dot(_v2);
		const dot11 = _v1.dot(_v1);
		const dot12 = _v1.dot(_v2);

		const denom = dot00 * dot11 - dot01 * dot01;
		if (denom === 0) return null;

		const invDenom = 1 / denom;
		const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
		const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
		return target.set(1 - u - v, v, u);
	}

	/**
	 * @param {Vector3} point
	 * @param {Vector3} [target]
	 * @returns {Vector3|null}
	 */
	getBarycoord(point, target = new Vector3()) {
		return Triangle.getBarycoord(point, this.#a, this.#b, this.#c, target);
	}

	/**
	 * @param {Vector3} point
	 * @param {Vector3} a
	 * @param {Vector3} b
	 * @param {Vector3} c
	 * @returns {boolean}
	 */
	static containsPoint(point, a, b, c) {
		const bary = Triangle.getBarycoord(point, a, b, c, _v3);
		if (bary === null) return false;
		return bary.x >= 0 && bary.y >= 0 && bary.x + bary.y <= 1;
	}

	/**
	 * @param {Vector3} point
	 * @returns {boolean}
	 */
	containsPoint(point) {
		return Triangle.containsPoint(point, this.#a, this.#b, this.#c);
	}

	/**
	 * @param {Vector3} point
	 * @param {Vector3} [target]
	 * @returns {Vector3}
	 */
	closestPointToPoint(point, target = new Vector3()) {
		const a = this.#a;
		const b = this.#b;
		const c = this.#c;

		_v0.copy(b).sub(a);
		_v1.copy(c).sub(a);
		_v2.copy(point).sub(a);

		const dot00 = _v0.dot(_v0);
		const dot01 = _v0.dot(_v1);
		const dot02 = _v0.dot(_v2);
		const dot11 = _v1.dot(_v1);
		const dot12 = _v1.dot(_v2);

		const denom = dot00 * dot11 - dot01 * dot01;
		const v = denom === 0 ? 0 : (dot11 * dot02 - dot01 * dot12) / denom;
		const w = denom === 0 ? 0 : (dot00 * dot12 - dot01 * dot02) / denom;

		if (v < 0 || w < 0 || v + w > 1) {
			return _closestOnEdges(a, b, c, point, target);
		}

		return target.copy(a).add(_v0.mulScalar(v)).add(_v1.mulScalar(w));
	}

	/**
	 * @param {Triangle} triangle
	 * @returns {boolean}
	 */
	equals(triangle) {
		return (
			triangle.a.equals(this.#a) &&
			triangle.b.equals(this.#b) &&
			triangle.c.equals(this.#c)
		);
	}

	/**
	 * Interpolates v1, v2, v3 at the barycentric coordinate of point in triangle (a,b,c).
	 * @param {Vector3} point
	 * @param {Vector3} a
	 * @param {Vector3} b
	 * @param {Vector3} c
	 * @param {Vector3} v1
	 * @param {Vector3} v2
	 * @param {Vector3} v3
	 * @param {Vector3} [target]
	 * @returns {Vector3|null}
	 */
	static getInterpolation(point, a, b, c, v1, v2, v3, target = new Vector3()) {
		const bary = Triangle.getBarycoord(point, a, b, c, _v3);
		if (bary === null) return null;
		target.set(0, 0, 0);
		target.x += v1.x * bary.x + v2.x * bary.y + v3.x * bary.z;
		target.y += v1.y * bary.x + v2.y * bary.y + v3.y * bary.z;
		target.z += v1.z * bary.x + v2.z * bary.y + v3.z * bary.z;
		return target;
	}

	/**
	 * @param {Vector3} point
	 * @param {Vector3} v1
	 * @param {Vector3} v2
	 * @param {Vector3} v3
	 * @param {Vector3} [target]
	 * @returns {Vector3|null}
	 */
	getInterpolation(point, v1, v2, v3, target = new Vector3()) {
		return Triangle.getInterpolation(
			point,
			this.#a,
			this.#b,
			this.#c,
			v1,
			v2,
			v3,
			target,
		);
	}

	/**
	 * @param {Vector3} [target]
	 * @returns {Vector3}
	 */
	getMidpoint(target = new Vector3()) {
		return target
			.copy(this.#a)
			.add(this.#b)
			.add(this.#c)
			.mulScalar(1 / 3);
	}

	/**
	 * Computes the normal of triangle (a, b, c) into target.
	 * @param {Vector3} a
	 * @param {Vector3} b
	 * @param {Vector3} c
	 * @param {Vector3} [target]
	 * @returns {Vector3}
	 */
	static getNormal(a, b, c, target = new Vector3()) {
		target.copy(c).sub(b);
		_v0.copy(b).sub(a);
		target.cross(_v0);
		const tLen = target.lengthSq;
		return tLen > 0
			? target.mulScalar(1 / Math.sqrt(tLen))
			: target.set(0, 0, 0);
	}

	/**
	 * @param {Vector3} [target]
	 * @returns {Vector3}
	 */
	getNormal(target = new Vector3()) {
		return Triangle.getNormal(this.#a, this.#b, this.#c, target);
	}

	/**
	 * @param {Plane} [target]
	 * @returns {Plane}
	 */
	getPlane(target = new Plane()) {
		return target.setFromCoplanarPoints(this.#a, this.#b, this.#c);
	}

	/**
	 * @param {{ min: Vector3, max: Vector3, intersectsTriangle?: (tri: Triangle) => boolean }} box
	 * @returns {boolean}
	 */
	intersectsBox(box) {
		return box.intersectsTriangle ? box.intersectsTriangle(this) : false;
	}

	/**
	 * Returns true if triangle (a,b,c) is front-facing relative to direction.
	 * @param {Vector3} a
	 * @param {Vector3} b
	 * @param {Vector3} c
	 * @param {Vector3} direction
	 * @returns {boolean}
	 */
	static isFrontFacing(a, b, c, direction) {
		_v0.copy(c).sub(b);
		_v1.copy(b).sub(a);
		return _v0.cross(_v1).dot(direction) < 0;
	}

	/**
	 * @param {Vector3} direction
	 * @returns {boolean}
	 */
	isFrontFacing(direction) {
		return Triangle.isFrontFacing(this.#a, this.#b, this.#c, direction);
	}
}
