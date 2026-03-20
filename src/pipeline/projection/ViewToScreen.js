import { MathUtils } from "../../math/MathUtils.js";

/** Projects view-space coordinates to screen-space pixel positions. */
export class ViewToScreen {
	#width;
	#height;

	/**
	 * @param {number} width
	 * @param {number} height
	 */
	constructor(width, height) {
		this.#width = width;
		this.#height = height;
	}

	/** @returns {number} */
	get width() {
		return this.#width;
	}

	/** @returns {number} */
	get height() {
		return this.#height;
	}

	/**
	 * @param {number} width
	 * @param {number} height
	 * @returns {void}
	 */
	setSize(width, height) {
		this.#width = width;
		this.#height = height;
	}

	/**
	 * Projects NDC coordinates to integer screen-space pixel coordinates.
	 * @param {number} ndcX
	 * @param {number} ndcY
	 * @param {number} ndcZ
	 * @param {{ set: (x: number, y: number, z: number) => * }} target
	 * @returns {{ set: (x: number, y: number, z: number) => * }}
	 */
	project(ndcX, ndcY, ndcZ, target) {
		const screenX = MathUtils.fastTrunc(((ndcX + 1) * this.#width) >> 1);
		const screenY = MathUtils.fastTrunc(((1 - ndcY) * this.#height) >> 1);
		const clampedX = MathUtils.clamp(screenX, 0, this.#width - 1);
		const clampedY = MathUtils.clamp(screenY, 0, this.#height - 1);
		return target.set(clampedX, clampedY, ndcZ);
	}

	/**
	 * Convenience wrapper: projects a point's x/y/z via project().
	 * @param {{ x: number, y: number, z: number }} point
	 * @param {{ set: (x: number, y: number, z: number) => * }} target
	 * @returns {{ set: (x: number, y: number, z: number) => * }}
	 */
	projectPoint(point, target) {
		return this.project(point.x, point.y, point.z, target);
	}
}
