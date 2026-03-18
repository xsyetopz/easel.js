import { MathUtils } from "./MathUtils.js";
import { Vector3 } from "./Vector3.js";

/**
 * @typedef {{ type: string, matrixWorld: *, updateWorldMatrix: Function, geometry?: { attributes?: { position?: { array: ArrayLike<number>, itemSize: number } } }, children: SceneNode[], visible?: boolean }} SceneNode
 */

export class Box3 {
	#min;
	#max;

	/**
	 * @param {Vector3} [min]
	 * @param {Vector3} [max]
	 */
	constructor(min, max) {
		this.#min = min
			? min.clone()
			: new Vector3(
					Number.POSITIVE_INFINITY,
					Number.POSITIVE_INFINITY,
					Number.POSITIVE_INFINITY,
				);
		this.#max = max
			? max.clone()
			: new Vector3(
					Number.NEGATIVE_INFINITY,
					Number.NEGATIVE_INFINITY,
					Number.NEGATIVE_INFINITY,
				);
	}

	/** @returns {Vector3} */
	get min() {
		return this.#min;
	}

	/** @param {Vector3} value */
	set min(value) {
		this.#min.copy(value);
	}

	/** @returns {Vector3} */
	get max() {
		return this.#max;
	}

	/** @param {Vector3} value */
	set max(value) {
		this.#max.copy(value);
	}

	/** @returns {Vector3} */
	get centre() {
		return this.#min.clone().add(this.#max).mulScalar(0.5);
	}

	/** @returns {Vector3} */
	get size() {
		return this.#max.clone().sub(this.#min);
	}

	/** @returns {number} */
	get width() {
		return this.#max.x - this.#min.x;
	}

	/** @returns {number} */
	get height() {
		return this.#max.y - this.#min.y;
	}

	/** @returns {number} */
	get depth() {
		return this.#max.z - this.#min.z;
	}

	/** @returns {Vector3[]} */
	get corners() {
		const { x, y, z } = this.#min;
		const { x: x2, y: y2, z: z2 } = this.#max;

		return [
			new Vector3(x, y, z) /* 0: bottom-left-back */,
			new Vector3(x2, y, z) /* 1: bottom-right-back */,
			new Vector3(x, y2, z) /* 2: top-left-back */,
			new Vector3(x2, y2, z) /* 3: top-right-back */,
			new Vector3(x, y, z2) /* 4: bottom-left-front */,
			new Vector3(x2, y, z2) /* 5: bottom-right-front */,
			new Vector3(x, y2, z2) /* 6: top-left-front */,
			new Vector3(x2, y2, z2) /* 7: top-right-front */,
		];
	}

	/** @returns {boolean} */
	get isEmpty() {
		return (
			this.#max.x < this.#min.x ||
			this.#max.y < this.#min.y ||
			this.#max.z < this.#min.z
		);
	}

	/** @returns {Box3} */
	clone() {
		return new Box3(this.#min.clone(), this.#max.clone());
	}

	/**
	 * @param {Box3} box
	 * @returns {boolean}
	 */
	containsBox(box) {
		return (
			this.#min.x <= box.min.x &&
			this.#max.x >= box.max.x &&
			this.#min.y <= box.min.y &&
			this.#max.y >= box.max.y &&
			this.#min.z <= box.min.z &&
			this.#max.z >= box.max.z
		);
	}

	/**
	 * @param {Vector3} point
	 * @returns {boolean}
	 */
	containsPoint(point) {
		return (
			point.x >= this.#min.x &&
			point.x <= this.#max.x &&
			point.y >= this.#min.y &&
			point.y <= this.#max.y &&
			point.z >= this.#min.z &&
			point.z <= this.#max.z
		);
	}

	/**
	 * @param {Box3} box
	 * @returns {this}
	 */
	copy(box) {
		this.#min.copy(box.min);
		this.#max.copy(box.max);
		return this;
	}

	/**
	 * @param {Box3} box
	 * @returns {boolean}
	 */
	equals(box) {
		return box.min.equals(this.#min) && box.max.equals(this.#max);
	}

	/**
	 * @param {Vector3} point
	 * @returns {this}
	 */
	expandByPoint(point) {
		const { x, y, z } = this.#min;
		const { x: x2, y: y2, z: z2 } = this.#max;
		const { x: px, y: py, z: pz } = point;

		this.#min.x = MathUtils.fastMin(x, px);
		this.#min.y = MathUtils.fastMin(y, py);
		this.#min.z = MathUtils.fastMin(z, pz);
		this.#max.x = MathUtils.fastMax(x2, px);
		this.#max.y = MathUtils.fastMax(y2, py);
		this.#max.z = MathUtils.fastMax(z2, pz);
		return this;
	}

	/**
	 * @param {number} scalar
	 * @returns {this}
	 */
	expandByScalar(scalar) {
		this.#min.x -= scalar;
		this.#min.y -= scalar;
		this.#min.z -= scalar;
		this.#max.x += scalar;
		this.#max.y += scalar;
		this.#max.z += scalar;
		return this;
	}

	/**
	 * @param {Vector3} v
	 * @returns {this}
	 */
	expandByVector3(v) {
		this.#min.sub(v);
		this.#max.add(v);
		return this;
	}

	/**
	 * @param {Vector3} out
	 * @returns {Vector3}
	 */
	getCentre(out) {
		return out.copy(this.#min).add(this.#max).mulScalar(0.5);
	}

	/**
	 * @param {Box3} box
	 * @returns {boolean}
	 */
	intersectsBox(box) {
		return (
			this.#max.x >= box.min.x &&
			this.#min.x <= box.max.x &&
			this.#max.y >= box.min.y &&
			this.#min.y <= box.max.y &&
			this.#max.z >= box.min.z &&
			this.#min.z <= box.max.z
		);
	}

	/**
	 * @param {{ centre: Vector3, radius: number }} sphere
	 * @returns {boolean}
	 */
	intersectsSphere(sphere) {
		const closestPoint = new Vector3();
		closestPoint.x = MathUtils.fastMin(
			MathUtils.fastMax(sphere.centre.x, this.#min.x),
			this.#max.x,
		);
		closestPoint.y = MathUtils.fastMin(
			MathUtils.fastMax(sphere.centre.y, this.#min.y),
			this.#max.y,
		);
		closestPoint.z = MathUtils.fastMin(
			MathUtils.fastMax(sphere.centre.z, this.#min.z),
			this.#max.z,
		);
		return (
			closestPoint.clone().sub(sphere.centre).lengthSq <=
			sphere.radius * sphere.radius
		);
	}

	/** @returns {this} */
	makeEmpty() {
		this.#min.set(
			Number.POSITIVE_INFINITY,
			Number.POSITIVE_INFINITY,
			Number.POSITIVE_INFINITY,
		);
		this.#max.set(
			Number.NEGATIVE_INFINITY,
			Number.NEGATIVE_INFINITY,
			Number.NEGATIVE_INFINITY,
		);
		return this;
	}

	/**
	 * @param {Vector3} centre
	 * @param {Vector3} size
	 * @returns {this}
	 */
	setFromCentreAndSize(centre, size) {
		const halfSize = size.clone().mulScalar(0.5);
		this.#min.copy(centre).sub(halfSize);
		this.#max.copy(centre).add(halfSize);
		return this;
	}

	/**
	 * Computes the world-space bounding box of an object and its visible
	 * children. Accesses vertex positions via `object.geometry?.attributes?.position`
	 * for Mesh nodes; will be refined once Geometry is implemented.
	 *
	 * @param {SceneNode} object
	 * @returns {this}
	 */
	setFromObject(object) {
		this.makeEmpty();
		object.updateWorldMatrix(true, false);
		this.#expandFromObject(object);
		return this;
	}

	/**
	 * @param {SceneNode} obj
	 */
	#expandFromObject(obj) {
		if (obj.type === "Mesh") {
			const posAttr = obj.geometry?.attributes?.position;
			if (posAttr && posAttr.array.length > 0) {
				obj.updateWorldMatrix(false, false);
				const arr = posAttr.array;
				const itemSize = posAttr.itemSize ?? 3;
				const count = arr.length / itemSize;
				for (let i = 0; i < count; i++) {
					const vertex = new Vector3(
						arr[i * itemSize],
						arr[i * itemSize + 1],
						arr[i * itemSize + 2],
					);
					this.expandByPoint(vertex.applyMatrix4(obj.matrixWorld));
				}
			}
		}
		for (const child of obj.children) {
			if (child.visible) this.#expandFromObject(child);
		}
	}

	/**
	 * @param {Vector3[]} points
	 * @returns {this}
	 */
	setFromPoints(points) {
		this.makeEmpty();
		for (const point of points) {
			this.expandByPoint(point);
		}
		return this;
	}

	/**
	 * @param {Vector3} offset
	 * @returns {this}
	 */
	translate(offset) {
		this.#min.add(offset);
		this.#max.add(offset);
		return this;
	}

	/**
	 * @param {Box3} box
	 * @returns {this}
	 */
	union(box) {
		const { x, y, z } = this.#min;
		const { x: x2, y: y2, z: z2 } = this.#max;
		const { x: px, y: py, z: pz } = box.min;
		const { x: px2, y: py2, z: pz2 } = box.max;

		this.#min.x = MathUtils.fastMin(x, px);
		this.#min.y = MathUtils.fastMin(y, py);
		this.#min.z = MathUtils.fastMin(z, pz);
		this.#max.x = MathUtils.fastMax(x2, px2);
		this.#max.y = MathUtils.fastMax(y2, py2);
		this.#max.z = MathUtils.fastMax(z2, pz2);
		return this;
	}
}
