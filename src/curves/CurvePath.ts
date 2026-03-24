import type { Vector2 } from "../math/Vector2.ts";
import { Curve } from "./Curve.ts";
import { LineCurve } from "./curves/LineCurve.ts";

/** Ordered sequence of connected curves forming a path. */
export class CurvePath extends Curve {
	override type = "CurvePath";
	#curves: Curve[] = [];
	#autoClose = false;

	get curves(): Curve[] {
		return this.#curves;
	}

	get autoClose(): boolean {
		return this.#autoClose;
	}

	set autoClose(value: boolean) {
		this.#autoClose = value;
	}

	/** Appends a curve to the path. */
	add(curve: Curve): void {
		this.#curves.push(curve);
	}

	/** Closes the path by appending a LineCurve from the last point to the first. */
	closePath(): void {
		const startPoint = this.#curves[0].getPoint(0) as Vector2;
		const endPoint = this.#curves[this.#curves.length - 1].getPoint(
			1,
		) as Vector2;
		if (!startPoint.equals(endPoint)) {
			this.#curves.push(new LineCurve(endPoint, startPoint));
		}
	}

	/** Returns the point on the path at parameter t, mapping across sub-curves. */
	override getPoint(
		t: number,
		target?: { x: number; y: number; z?: number },
	): { x: number; y: number; z?: number } | undefined {
		const d = t * this.getLength();
		const curveLengths = this.getCurveLengths();
		let i = 0;
		while (i < curveLengths.length) {
			if (curveLengths[i] >= d) {
				const diff = curveLengths[i] - d;
				const curve = this.#curves[i];
				const segmentLength = curve.getLength();
				const u = segmentLength === 0 ? 0 : 1 - diff / segmentLength;
				return curve.getPointAt(u, target);
			}
			i++;
		}
		return undefined;
	}

	/** Returns the total arc length of the path. */
	override getLength(): number {
		const lengths = this.getCurveLengths();
		return lengths[lengths.length - 1];
	}

	/** Returns an array of cumulative arc lengths for each sub-curve. */
	getCurveLengths(): number[] {
		if (this.#curves.length === 0) return [0];
		const lengths: number[] = [];
		let sum = 0;
		for (const curve of this.#curves) {
			sum += curve.getLength();
			lengths.push(sum);
		}
		return lengths;
	}

	/** Returns an array of (divisions + 1) points evenly spaced by parameter. */
	override getPoints(
		divisions = 12,
	): Array<{ x: number; y: number; z?: number } | undefined> {
		const points: Array<{ x: number; y: number; z?: number } | undefined> = [];
		for (let d = 0; d <= divisions; d++) {
			points.push(this.getPoint(d / divisions, undefined));
		}
		return points;
	}

	/** Returns an array of (divisions + 1) points evenly spaced by arc length. */
	override getSpacedPoints(
		divisions = 40,
	): Array<{ x: number; y: number; z?: number } | undefined> {
		const points: Array<{ x: number; y: number; z?: number } | undefined> = [];
		for (let d = 0; d <= divisions; d++) {
			points.push(this.getPointAt(d / divisions));
		}
		return points;
	}

	override clone(): CurvePath {
		const Ctor = this.constructor as new () => CurvePath;
		return new Ctor().copy(this);
	}

	override copy(source: CurvePath): this {
		super.copy(source);
		this.#curves = source.curves.map((c) => c.clone());
		this.#autoClose = source.autoClose;
		return this;
	}
}
