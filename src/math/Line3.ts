import { MathUtils } from "./MathUtils.ts";
import type { Matrix4 } from "./Matrix4.ts";
import { Vector3 } from "./Vector3.ts";

/** Finite line segment between two 3D points. */
export class Line3 {
	#start = new Vector3();
	#end = new Vector3();

	constructor(start = new Vector3(), end = new Vector3()) {
		this.#start = start.clone();
		this.#end = end.clone();
	}

	get start(): Vector3 {
		return this.#start;
	}

	set start(value: Vector3) {
		this.#start.copy(value);
	}

	get end(): Vector3 {
		return this.#end;
	}

	set end(value: Vector3) {
		this.#end.copy(value);
	}

	get delta(): Vector3 {
		return this.#end.clone().sub(this.#start);
	}

	get length(): number {
		return this.#start.distanceTo(this.#end);
	}

	get lengthSq(): number {
		return this.#start.distanceSqTo(this.#end);
	}

	applyMatrix4(m: Matrix4): Line3 {
		this.#start.applyMatrix4(m);
		this.#end.applyMatrix4(m);
		return this;
	}

	at(t: number, target = new Vector3()): Vector3 {
		return target.copy(this.delta).mulScalar(t).add(this.#start);
	}

	clone(): Line3 {
		return new Line3(this.#start, this.#end);
	}

	closestPointToPoint(
		point: Vector3,
		clampToLine = true,
		target = new Vector3(),
	): Vector3 {
		const t = this.closestPointToPointParameter(point, clampToLine);
		return this.at(t, target);
	}

	closestPointToPointParameter(point: Vector3, clampToLine = true): number {
		const startPoint = point.clone().sub(this.#start);
		const dir = this.delta;
		const dirLengthSq = dir.lengthSq;
		if (dirLengthSq === 0) return 0;
		const t = startPoint.dot(dir) / dirLengthSq;
		return clampToLine ? MathUtils.clamp(t, 0, 1) : t;
	}

	copy(line: Line3): Line3 {
		this.#start.copy(line.start);
		this.#end.copy(line.end);
		return this;
	}

	equals(line: Line3): boolean {
		return this.#start.equals(line.start) && this.#end.equals(line.end);
	}

	getCenter(target = new Vector3()): Vector3 {
		return target.copy(this.#start).add(this.#end).mulScalar(0.5);
	}

	set(start: Vector3, end: Vector3): Line3 {
		this.#start.copy(start);
		this.#end.copy(end);
		return this;
	}
}
