export class Curve {
	type = "Curve";
	arcLengthDivisions = 200;

	/** @type {number[]|null} */
	#cacheArcLengths = null;
	#needsUpdate = false;

	/**
	 * Returns the point on the curve at parameter t.
	 * Abstract — subclasses must override.
	 * @param {number} _t Parameter in [0, 1]
	 * @param {*} [_target] Optional target object to receive the result
	 * @returns {*|null}
	 */
	getPoint(_t, _target) {
		console.warn("Curve: .getPoint() not implemented.");
		return null;
	}

	/**
	 * Returns the point on the curve at arc-length fraction u.
	 * @param {number} u Arc-length fraction in [0, 1]
	 * @param {*} [target]
	 * @returns {*}
	 */
	getPointAt(u, target) {
		const t = this.getUtoTmapping(u);
		return this.getPoint(t, target);
	}

	/**
	 * Returns an array of (divisions + 1) points evenly spaced by parameter.
	 * @param {number} [divisions=5]
	 * @returns {Array<*>}
	 */
	getPoints(divisions = 5) {
		const points = [];
		for (let d = 0; d <= divisions; d++) {
			points.push(this.getPoint(d / divisions, undefined));
		}
		return points;
	}

	/**
	 * Returns an array of (divisions + 1) points evenly spaced by arc length.
	 * @param {number} [divisions=5]
	 * @returns {Array<*>}
	 */
	getSpacedPoints(divisions = 5) {
		const points = [];
		for (let d = 0; d <= divisions; d++) {
			points.push(this.getPointAt(d / divisions));
		}
		return points;
	}

	/**
	 * Returns the total arc length of the curve.
	 * @returns {number}
	 */
	getLength() {
		const lengths = this.getLengths();
		return lengths[lengths.length - 1];
	}

	/**
	 * Computes and caches cumulative arc lengths at each subdivision.
	 * @param {number} [divisions]
	 * @returns {number[]}
	 */
	getLengths(divisions = this.arcLengthDivisions) {
		if (
			this.#cacheArcLengths !== null &&
			this.#cacheArcLengths.length === divisions + 1 &&
			!this.#needsUpdate
		) {
			return this.#cacheArcLengths;
		}

		this.#needsUpdate = false;

		const cache = [];
		let current;
		let last = this.getPoint(0, undefined);
		let sum = 0;

		cache.push(0);

		for (let p = 1; p <= divisions; p++) {
			current = this.getPoint(p / divisions, undefined);
			const dx = current.x - last.x;
			const dy = current.y - last.y;
			const dz = current.z === undefined ? 0 : current.z - last.z;
			sum += Math.sqrt(dx * dx + dy * dy + dz * dz);
			cache.push(sum);
			last = current;
		}

		this.#cacheArcLengths = cache;
		return cache;
	}

	/**
	 * Invalidates the arc length cache, forcing recomputation on next call.
	 * @returns {void}
	 */
	updateArcLengths() {
		this.#needsUpdate = true;
		this.#cacheArcLengths = null;
	}

	/**
	 * Maps a uniform arc-length fraction u (or absolute distance) to curve parameter t.
	 * @param {number} u Fraction in [0, 1]
	 * @param {number} [distance] Absolute arc-length distance (overrides u)
	 * @returns {number}
	 */
	getUtoTmapping(u, distance) {
		const arcLengths = this.getLengths();
		const il = arcLengths.length;
		const totalLength = arcLengths[il - 1];

		const targetArcLength = distance === undefined ? u * totalLength : distance;

		// Binary search
		let lo = 0;
		let hi = il - 1;

		while (lo <= hi) {
			const mid = Math.floor((lo + hi) / 2);
			const comparison = arcLengths[mid] - targetArcLength;
			if (comparison < 0) {
				lo = mid + 1;
			} else if (comparison > 0) {
				hi = mid - 1;
			} else {
				return mid / (il - 1);
			}
		}

		const i = hi;
		const lengthBefore = arcLengths[i];
		const lengthAfter = arcLengths[i + 1];
		const segmentLength = lengthAfter - lengthBefore;
		const segmentFraction =
			segmentLength === 0
				? 0
				: (targetArcLength - lengthBefore) / segmentLength;

		return (i + segmentFraction) / (il - 1);
	}

	/**
	 * Returns the unit tangent vector at parameter t using numerical differentiation.
	 * @param {number} t Parameter in [0, 1]
	 * @param {*} [target]
	 * @returns {*}
	 */
	getTangent(t, target) {
		const delta = 1e-4;
		const t1 = Math.max(0, t - delta);
		const t2 = Math.min(1, t + delta);

		const pt1 = this.getPoint(t1, undefined);
		const pt2 = this.getPoint(t2, undefined);

		if (target) {
			return _normalizeTangentInto(pt1, pt2, target);
		}

		return _normalizeTangent(pt1, pt2);
	}

	/**
	 * Returns the unit tangent vector at arc-length fraction u.
	 * @param {number} u Arc-length fraction in [0, 1]
	 * @param {*} [target]
	 * @returns {*}
	 */
	getTangentAt(u, target) {
		const t = this.getUtoTmapping(u);
		return this.getTangent(t, target);
	}

	/**
	 * Returns a new Curve with the same properties.
	 * @returns {Curve}
	 */
	clone() {
		/** @type {new () => Curve} */
		const Ctor = /** @type {any} */ (this.constructor);
		return new Ctor().copy(this);
	}

	/**
	 * Copies properties from source into this curve.
	 * @param {Curve} source
	 * @returns {this}
	 */
	copy(source) {
		this.arcLengthDivisions = source.arcLengthDivisions;
		return this;
	}

	/**
	 * Returns a plain JSON representation of this curve.
	 * @returns {Object}
	 */
	toJSON() {
		return {
			type: this.type,
			arcLengthDivisions: this.arcLengthDivisions,
		};
	}

	/**
	 * Restores this curve from a plain JSON object.
	 * @param {Record<string, *>} json
	 * @returns {this}
	 */
	fromJSON(json) {
		this.arcLengthDivisions = /** @type {number} */ (
			json["arcLengthDivisions"]
		);
		return this;
	}
}

/**
 * @param {*} pt1
 * @param {*} pt2
 * @param {*} target
 * @returns {*}
 */
function _normalizeTangentInto(pt1, pt2, target) {
	target.x = pt2.x - pt1.x;
	target.y = pt2.y - pt1.y;
	if (pt2.z !== undefined) target.z = pt2.z - pt1.z;
	const len = Math.sqrt(
		target.x * target.x +
			target.y * target.y +
			(target.z === undefined ? 0 : target.z * target.z),
	);
	if (len > 0) {
		target.x /= len;
		target.y /= len;
		if (target.z !== undefined) target.z /= len;
	}
	return target;
}

/**
 * @param {*} pt1
 * @param {*} pt2
 * @returns {*}
 */
function _normalizeTangent(pt1, pt2) {
	const dx = pt2.x - pt1.x;
	const dy = pt2.y - pt1.y;
	const dz = pt2.z === undefined ? undefined : pt2.z - pt1.z;
	const len = Math.sqrt(dx * dx + dy * dy + (dz === undefined ? 0 : dz * dz));
	if (len > 0) {
		return dz === undefined
			? { x: dx / len, y: dy / len }
			: { x: dx / len, y: dy / len, z: dz / len };
	}
	return dz === undefined ? { x: 0, y: 0 } : { x: 0, y: 0, z: 0 };
}
