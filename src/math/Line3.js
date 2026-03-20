import { MathUtils } from "./MathUtils.js";
import { Vector3 } from "./Vector3.js";

/** Finite line segment between two 3D points. */
export class Line3 {
	#start = new Vector3();
	#end = new Vector3();

	/**
	 * @param {Vector3} [start]
	 * @param {Vector3} [end]
	 */
	constructor(start = new Vector3(), end = new Vector3()) {
		this.#start = start.clone();
		this.#end = end.clone();
	}

	/** @returns {Vector3} */
	get start() {
		return this.#start;
	}

	/** @param {Vector3} value */
	set start(value) {
		this.#start.copy(value);
	}

	/** @returns {Vector3} */
	get end() {
		return this.#end;
	}

	/** @param {Vector3} value */
	set end(value) {
		this.#end.copy(value);
	}

	/** @returns {Vector3} */
	get delta() {
		return this.#end.clone().sub(this.#start);
	}

	/** @returns {number} */
	get length() {
		return this.#start.distanceTo(this.#end);
	}

	/** @returns {number} */
	get lengthSq() {
		return this.#start.distanceSqTo(this.#end);
	}

	/**
	 * @param {import("./Matrix4.js").Matrix4} m
	 * @returns {Line3}
	 */
	applyMatrix4(m) {
		this.#start.applyMatrix4(m);
		this.#end.applyMatrix4(m);
		return this;
	}

	/**
	 * @param {number} t
	 * @param {Vector3} [target]
	 * @returns {Vector3}
	 */
	at(t, target = new Vector3()) {
		return target.copy(this.delta).mulScalar(t).add(this.#start);
	}

	/** @returns {Line3} */
	clone() {
		return new Line3(this.#start, this.#end);
	}

	/**
	 * @param {Vector3} point
	 * @param {boolean} [clampToLine]
	 * @param {Vector3} [target]
	 * @returns {Vector3}
	 */
	closestPointToPoint(point, clampToLine = true, target = new Vector3()) {
		const t = this.closestPointToPointParameter(point, clampToLine);
		return this.at(t, target);
	}

	/**
	 * @param {Vector3} point
	 * @param {boolean} [clampToLine]
	 * @returns {number}
	 */
	closestPointToPointParameter(point, clampToLine = true) {
		const startPoint = point.clone().sub(this.#start);
		const dir = this.delta;
		const dirLengthSq = dir.lengthSq;
		if (dirLengthSq === 0) return 0;
		const t = startPoint.dot(dir) / dirLengthSq;
		return clampToLine ? MathUtils.clamp(t, 0, 1) : t;
	}

	/**
	 * @param {Line3} line
	 * @returns {Line3}
	 */
	copy(line) {
		this.#start.copy(line.start);
		this.#end.copy(line.end);
		return this;
	}

	/**
	 * @param {Line3} line
	 * @returns {boolean}
	 */
	equals(line) {
		return this.#start.equals(line.start) && this.#end.equals(line.end);
	}

	/**
	 * @param {Vector3} [target]
	 * @returns {Vector3}
	 */
	getCenter(target = new Vector3()) {
		return target.copy(this.#start).add(this.#end).mulScalar(0.5);
	}

	/**
	 * @param {Vector3} start
	 * @param {Vector3} end
	 * @returns {Line3}
	 */
	set(start, end) {
		this.#start.copy(start);
		this.#end.copy(end);
		return this;
	}
}
