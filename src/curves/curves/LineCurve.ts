import { Vector2 } from "../../math/Vector2.ts";
import { Curve } from "../Curve.ts";

/** 2D straight line segment between two points. */
export class LineCurve extends Curve {
	override type = "LineCurve";
	#v1: Vector2;
	#v2: Vector2;

	constructor(v1: Vector2 = new Vector2(), v2: Vector2 = new Vector2()) {
		super();
		this.#v1 = v1.clone();
		this.#v2 = v2.clone();
	}

	get v1(): Vector2 {
		return this.#v1;
	}

	get v2(): Vector2 {
		return this.#v2;
	}

	/** Returns the point on the line at parameter t. */
	override getPoint(t: number, target: Vector2 = new Vector2()): Vector2 {
		if (t === 1) return target.copy(this.#v2);
		target.copy(this.#v2).sub(this.#v1).mulScalar(t).add(this.#v1);
		return target;
	}

	/** Returns the unit tangent vector (constant along a line). */
	override getTangent(_t: number, target: Vector2 = new Vector2()): Vector2 {
		target.copy(this.#v2).sub(this.#v1);
		const len = Math.sqrt(target.x * target.x + target.y * target.y);
		if (len > 0) target.mulScalar(1 / len);
		return target;
	}

	override clone(): LineCurve {
		return new LineCurve(this.#v1, this.#v2);
	}

	override copy(source: LineCurve): this {
		super.copy(source);
		this.#v1.copy(source.v1);
		this.#v2.copy(source.v2);
		return this;
	}
}
