import { Vector3 } from "./Vector3.ts";

/** Bounding sphere defined by center and radius. */
export class Sphere {
	#centre = new Vector3();
	#radius = 1;

	constructor(centre = new Vector3(), radius = 1) {
		this.#centre = centre.clone();
		this.#radius = radius;
	}

	get centre(): Vector3 {
		return this.#centre;
	}

	set centre(value: Vector3) {
		this.#centre.copy(value);
	}

	get radius(): number {
		return this.#radius;
	}

	set radius(value: number) {
		this.#radius = value;
	}

	clone(): Sphere {
		return new Sphere(this.centre, this.radius);
	}

	containsPoint(point: Vector3): boolean {
		return point.clone().sub(this.centre).lengthSq <= this.radius * this.radius;
	}

	copy(sphere: Sphere): Sphere {
		this.centre.copy(sphere.centre);
		this.radius = sphere.radius;
		return this;
	}

	distanceToPoint(point: Vector3): number {
		return point.clone().sub(this.centre).length - this.radius;
	}

	equals(sphere: Sphere): boolean {
		return (
			sphere.centre.x === this.centre.x &&
			sphere.centre.y === this.centre.y &&
			sphere.centre.z === this.centre.z &&
			sphere.radius === this.radius
		);
	}

	intersectsSphere(sphere: Sphere): boolean {
		const r = this.radius + sphere.radius;
		return this.centre.clone().sub(sphere.centre).lengthSq <= r * r;
	}

	translate(offset: Vector3): Sphere {
		this.centre.add(offset);
		return this;
	}

	/**
	 * Sets this sphere to tightly bound the given points. If optionalCenter is
	 * provided it is used as the sphere centre; otherwise the centroid is used.
	 */
	setFromPoints(points: Vector3[], optionalCenter?: Vector3): this {
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
	 */
	expandByPoint(point: Vector3): this {
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
