/** Point-like object with x, y and optional z components. */
interface CurvePoint {
	x: number;
	y: number;
	z?: number;
	equals?(other: CurvePoint): boolean;
}

/** Abstract base class for parametric curves. */
export class Curve {
	type = "Curve";
	arcLengthDivisions = 200;
	#cacheArcLengths: number[] | undefined = undefined;
	#needsUpdate = false;

	/**
	 * Returns the point on the curve at parameter t.
	 * Abstract - subclasses must override.
	 */
	getPoint(_t: number, _target?: CurvePoint): CurvePoint | undefined {
		console.warn("Curve: .getPoint() not implemented.");
		return undefined;
	}

	/** Returns the point on the curve at arc-length fraction u. */
	getPointAt(u: number, target?: CurvePoint): CurvePoint | undefined {
		const t = this.getUtoTmapping(u);
		return this.getPoint(t, target);
	}

	/** Returns an array of (divisions + 1) points evenly spaced by parameter. */
	getPoints(divisions = 5): Array<CurvePoint | undefined> {
		const points: Array<CurvePoint | undefined> = [];
		for (let d = 0; d <= divisions; d++) {
			points.push(this.getPoint(d / divisions, undefined));
		}
		return points;
	}

	/** Returns an array of (divisions + 1) points evenly spaced by arc length. */
	getSpacedPoints(divisions = 5): Array<CurvePoint | undefined> {
		const points: Array<CurvePoint | undefined> = [];
		for (let d = 0; d <= divisions; d++) {
			points.push(this.getPointAt(d / divisions));
		}
		return points;
	}

	/** Returns the total arc length of the curve. */
	getLength(): number {
		const lengths = this.getLengths();
		return lengths[lengths.length - 1];
	}

	/** Computes and caches cumulative arc lengths at each subdivision. */
	getLengths(divisions = this.arcLengthDivisions): number[] {
		if (
			this.#cacheArcLengths !== undefined &&
			this.#cacheArcLengths.length === divisions + 1 &&
			!this.#needsUpdate
		) {
			return this.#cacheArcLengths;
		}

		this.#needsUpdate = false;

		const cache: number[] = [];
		let current: CurvePoint | undefined;
		const first = this.getPoint(0, undefined);
		if (!first) return [0];
		let last = first;
		let sum = 0;

		cache.push(0);

		for (let p = 1; p <= divisions; p++) {
			current = this.getPoint(p / divisions, undefined);
			if (!current) continue;
			const dx = current.x - last.x;
			const dy = current.y - last.y;
			const dz = current.z === undefined ? 0 : current.z - (last.z ?? 0);
			sum += Math.sqrt(dx * dx + dy * dy + dz * dz);
			cache.push(sum);
			last = current;
		}

		this.#cacheArcLengths = cache;
		return cache;
	}

	/** Invalidates the arc length cache, forcing recomputation on next call. */
	updateArcLengths(): void {
		this.#needsUpdate = true;
		this.#cacheArcLengths = undefined;
	}

	/** Maps a uniform arc-length fraction u (or absolute distance) to curve parameter t. */
	getUtoTmapping(u: number, distance?: number): number {
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

	/** Returns the unit tangent vector at parameter t using numerical differentiation. */
	getTangent(t: number, target?: CurvePoint): CurvePoint | undefined {
		const delta = 1e-4;
		const t1 = Math.max(0, t - delta);
		const t2 = Math.min(1, t + delta);

		const pt1 = this.getPoint(t1, undefined);
		const pt2 = this.getPoint(t2, undefined);
		if (!(pt1 && pt2)) return undefined;

		if (target) {
			return _normalizeTangentInto(pt1, pt2, target);
		}

		return _normalizeTangent(pt1, pt2);
	}

	/** Returns the unit tangent vector at arc-length fraction u. */
	getTangentAt(u: number, target?: CurvePoint): CurvePoint | undefined {
		const t = this.getUtoTmapping(u);
		return this.getTangent(t, target);
	}

	/** Returns a new Curve with the same properties. */
	clone(): Curve {
		const Ctor = this.constructor as new () => Curve;
		return new Ctor().copy(this);
	}

	/** Copies properties from source into this curve. */
	copy(source: Curve): this {
		this.arcLengthDivisions = source.arcLengthDivisions;
		return this;
	}

	/** Returns a plain JSON representation of this curve. */
	toJSON(): Record<string, unknown> {
		return {
			type: this.type,
			arcLengthDivisions: this.arcLengthDivisions,
		};
	}

	/** Restores this curve from a plain JSON object. */
	fromJSON(json: Record<string, unknown>): this {
		this.arcLengthDivisions = json["arcLengthDivisions"] as number;
		return this;
	}
}

function _normalizeTangentInto(
	pt1: CurvePoint,
	pt2: CurvePoint,
	target: CurvePoint,
): CurvePoint {
	target.x = pt2.x - pt1.x;
	target.y = pt2.y - pt1.y;
	if (pt2.z !== undefined) target.z = pt2.z - (pt1.z ?? 0);
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

function _normalizeTangent(pt1: CurvePoint, pt2: CurvePoint): CurvePoint {
	const dx = pt2.x - pt1.x;
	const dy = pt2.y - pt1.y;
	const dz = pt2.z === undefined ? undefined : pt2.z - (pt1.z ?? 0);
	const len = Math.sqrt(dx * dx + dy * dy + (dz === undefined ? 0 : dz * dz));
	if (len > 0) {
		return dz === undefined
			? { x: dx / len, y: dy / len }
			: { x: dx / len, y: dy / len, z: dz / len };
	}
	return dz === undefined ? { x: 0, y: 0 } : { x: 0, y: 0, z: 0 };
}
