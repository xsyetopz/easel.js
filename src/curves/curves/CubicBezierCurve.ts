import { Vector2 } from "../../math/Vector2.ts";
import { Curve } from "../Curve.ts";

/** 2D cubic Bezier curve with four control points. */
export class CubicBezierCurve extends Curve {
	override type = "CubicBezierCurve";
	#v0: Vector2;
	#v1: Vector2;
	#v2: Vector2;
	#v3: Vector2;

	constructor(
		v0: Vector2 = new Vector2(),
		v1: Vector2 = new Vector2(),
		v2: Vector2 = new Vector2(),
		v3: Vector2 = new Vector2(),
	) {
		super();
		this.#v0 = v0.clone();
		this.#v1 = v1.clone();
		this.#v2 = v2.clone();
		this.#v3 = v3.clone();
	}

	get v0(): Vector2 {
		return this.#v0;
	}

	get v1(): Vector2 {
		return this.#v1;
	}

	get v2(): Vector2 {
		return this.#v2;
	}

	get v3(): Vector2 {
		return this.#v3;
	}

	/**
	 * Returns B(t) = (1-t)^3*v0 + 3*(1-t)^2*t*v1 + 3*(1-t)*t^2*v2 + t^3*v3.
	 */
	override getPoint(t: number, target: Vector2 = new Vector2()): Vector2 {
		const mt = 1 - t;
		const mt2 = mt * mt;
		const t2 = t * t;
		const x =
			mt2 * mt * this.#v0.x +
			3 * mt2 * t * this.#v1.x +
			3 * mt * t2 * this.#v2.x +
			t2 * t * this.#v3.x;
		const y =
			mt2 * mt * this.#v0.y +
			3 * mt2 * t * this.#v1.y +
			3 * mt * t2 * this.#v2.y +
			t2 * t * this.#v3.y;
		return target.set(x, y);
	}

	override clone(): CubicBezierCurve {
		return new CubicBezierCurve(this.#v0, this.#v1, this.#v2, this.#v3);
	}

	override copy(source: CubicBezierCurve): this {
		super.copy(source);
		this.#v0.copy(source.v0);
		this.#v1.copy(source.v1);
		this.#v2.copy(source.v2);
		this.#v3.copy(source.v3);
		return this;
	}
}
