import { Vector3 } from "../../math/Vector3.ts";
import { Curve } from "../Curve.ts";

/** 3D straight line segment between two points. */
export class LineCurve3 extends Curve {
	override type = "LineCurve3";
	#v1: Vector3;
	#v2: Vector3;

	constructor(v1: Vector3 = new Vector3(), v2: Vector3 = new Vector3()) {
		super();
		this.#v1 = v1.clone();
		this.#v2 = v2.clone();
	}

	get v1(): Vector3 {
		return this.#v1;
	}

	get v2(): Vector3 {
		return this.#v2;
	}

	/** Returns the point on the line at parameter t. */
	override getPoint(t: number, target: Vector3 = new Vector3()): Vector3 {
		if (t === 1) return target.copy(this.#v2);
		target.copy(this.#v2).sub(this.#v1).mulScalar(t).add(this.#v1);
		return target;
	}

	/** Returns the unit tangent vector (constant along a line). */
	override getTangent(_t: number, target: Vector3 = new Vector3()): Vector3 {
		return target.copy(this.#v2).sub(this.#v1).normalize();
	}

	override clone(): LineCurve3 {
		return new LineCurve3(this.#v1, this.#v2);
	}

	override copy(source: LineCurve3): this {
		super.copy(source);
		this.#v1.copy(source.v1);
		this.#v2.copy(source.v2);
		return this;
	}
}
