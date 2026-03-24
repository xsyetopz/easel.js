import { Vector3 } from "../../math/Vector3.ts";
import { Curve } from "../Curve.js";

/**
 * Catmull-Rom basis evaluation for one component.
 * @param {number} p0
 * @param {number} p1
 * @param {number} p2
 * @param {number} p3
 * @param {number} t
 * @returns {number}
 */
function catmullRom(p0, p1, p2, p3, t) {
	const t2 = t * t;
	const t3 = t2 * t;
	return (
		0.5 *
		(2 * p1 +
			(-p0 + p2) * t +
			(2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
			(-p0 + 3 * p1 - 3 * p2 + p3) * t3)
	);
}

/**
 * Computes knot interval for centripetal/chordal parameterization.
 * @param {Vector3} p0
 * @param {Vector3} p1
 * @param {number} alpha
 * @returns {number}
 */
function knotInterval(p0, p1, alpha) {
	const dx = p1.x - p0.x;
	const dy = p1.y - p0.y;
	const dz = p1.z - p0.z;
	return (dx * dx + dy * dy + dz * dz) ** (0.5 * alpha);
}

/** Centripetal Catmull-Rom spline through 3D control points. */
export class CatmullRomCurve3 extends Curve {
	/** @override */
	type = "CatmullRomCurve3";
	#points;
	#closed;
	#curveType;
	#tension;

	/**
	 * @param {Vector3[]} [points=[]]
	 * @param {boolean} [closed=false]
	 * @param {'centripetal'|'chordal'|'catmullrom'} [curveType='centripetal']
	 * @param {number} [tension=0.5]
	 */
	constructor(
		points = [],
		closed = false,
		curveType = "centripetal",
		tension = 0.5,
	) {
		super();
		this.#points = points;
		this.#closed = closed;
		this.#curveType = curveType;
		this.#tension = tension;
	}

	/** @returns {Vector3[]} */
	get points() {
		return this.#points;
	}

	/** @returns {boolean} */
	get closed() {
		return this.#closed;
	}

	/** @returns {'centripetal'|'chordal'|'catmullrom'} */
	get curveType() {
		return this.#curveType;
	}

	/** @returns {number} */
	get tension() {
		return this.#tension;
	}

	/**
	 * Returns the point on the spline at parameter t.
	 * @override
	 * @param {number} t Parameter in [0, 1]
	 * @param {Vector3} [target=new Vector3()]
	 * @returns {Vector3}
	 */
	getPoint(t, target = new Vector3()) {
		const points = this.#points;
		const l = points.length;
		const p = (l - (this.#closed ? 0 : 1)) * t;
		let intPoint = Math.floor(p);
		let weight = p - intPoint;

		if (this.#closed) {
			intPoint +=
				intPoint > 0 ? 0 : (Math.floor(Math.abs(intPoint) / l) + 1) * l;
		} else if (weight === 0 && intPoint === l - 1) {
			intPoint = l - 2;
			weight = 1;
		}

		let p0;
		let p3;
		if (this.#closed) {
			p0 = points[(intPoint - 1 + l) % l];
			p3 = points[(intPoint + 2) % l];
		} else {
			p0 = points[Math.max(0, intPoint - 1)];
			p3 = points[Math.min(intPoint + 2, l - 1)];
		}

		const p1 = points[this.#closed ? intPoint % l : intPoint];
		const p2 =
			points[this.#closed ? (intPoint + 1) % l : Math.min(intPoint + 1, l - 1)];

		if (this.#curveType === "catmullrom") {
			const x = catmullRom(p0.x, p1.x, p2.x, p3.x, weight);
			const y = catmullRom(p0.y, p1.y, p2.y, p3.y, weight);
			const z = catmullRom(p0.z, p1.z, p2.z, p3.z, weight);
			return target.set(x, y, z);
		}

		const alpha = this.#curveType === "chordal" ? 0.5 : 0.25;

		const dt0 = knotInterval(p0, p1, alpha);
		const dt1 = knotInterval(p1, p2, alpha);
		const dt2 = knotInterval(p2, p3, alpha);

		const t1 = weight * dt1;

		const px = nonuniformCatmullRom(p0.x, p1.x, p2.x, p3.x, dt0, dt1, dt2, t1);
		const py = nonuniformCatmullRom(p0.y, p1.y, p2.y, p3.y, dt0, dt1, dt2, t1);
		const pz = nonuniformCatmullRom(p0.z, p1.z, p2.z, p3.z, dt0, dt1, dt2, t1);

		return target.set(px, py, pz);
	}

	/**
	 * @override
	 * @returns {CatmullRomCurve3}
	 */
	clone() {
		return new CatmullRomCurve3(
			this.#points.map((p) => p.clone()),
			this.#closed,
			this.#curveType,
			this.#tension,
		);
	}

	/**
	 * @override
	 * @param {CatmullRomCurve3} source
	 * @returns {this}
	 */
	copy(source) {
		super.copy(source);
		this.#points = source.points.map((p) => p.clone());
		this.#closed = source.closed;
		this.#curveType = /** @type {'centripetal'|'chordal'|'catmullrom'} */ (
			source.curveType
		);
		this.#tension = source.tension;
		return this;
	}
}

/**
 * Non-uniform Catmull-Rom interpolation for centripetal/chordal types.
 * @param {number} p0
 * @param {number} p1
 * @param {number} p2
 * @param {number} p3
 * @param {number} dt0
 * @param {number} dt1
 * @param {number} dt2
 * @param {number} t
 * @returns {number}
 */
function nonuniformCatmullRom(p0, p1, p2, p3, dt0, dt1, dt2, t) {
	let t1 = (p1 - p0) / dt0 - (p2 - p0) / (dt0 + dt1) + (p2 - p1) / dt1;
	let t2 = (p2 - p1) / dt1 - (p3 - p1) / (dt1 + dt2) + (p3 - p2) / dt2;

	if (dt0 < 1e-4) t1 = 0;
	if (dt2 < 1e-4) t2 = 0;

	const c0 = p1;
	const c1 = t1;
	const c2 = -3 * p1 + 3 * p2 - 2 * t1 * dt1 - t2 * dt1;
	const c3 = 2 * p1 - 2 * p2 + t1 * dt1 + t2 * dt1;
	const u = t / dt1;
	return c0 + c1 * u + c2 * u * u + c3 * u * u * u;
}
