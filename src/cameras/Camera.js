import { Node } from "../core/Node.js";
import { Matrix4 } from "../math/Matrix4.js";

/**
 * Orthographic camera. The only camera type — no PerspectiveCamera exists
 * because the rasterizer performs affine UV interpolation with no W divide,
 * which is only geometrically coherent under orthographic projection.
 */
export class Camera extends Node {
	/** @override @type {string} */
	type = "Camera";

	projectionMatrix = new Matrix4();
	matrixWorldInverse = new Matrix4();

	#left;
	#right;
	#top;
	#bottom;
	#near;
	#far;
	#tileSize;

	/**
	 * @param {object} [options]
	 * @param {number} [options.left=-1]
	 * @param {number} [options.right=1]
	 * @param {number} [options.top=1]
	 * @param {number} [options.bottom=-1]
	 * @param {number} [options.near=0.1]
	 * @param {number} [options.far=2000]
	 * @param {number} [options.tileSize=1] World units per tile. Used for sort distance and fog culling.
	 */
	constructor({
		left = -1,
		right = 1,
		top = 1,
		bottom = -1,
		near = 0.1,
		far = 2000,
		tileSize = 1,
	} = {}) {
		super();
		this.#left = left;
		this.#right = right;
		this.#top = top;
		this.#bottom = bottom;
		this.#near = near;
		this.#far = far;
		this.#tileSize = tileSize;
		this.updateProjectionMatrix();
	}

	/** @returns {number} */
	get left() {
		return this.#left;
	}

	/** @param {number} value */
	set left(value) {
		this.#left = value;
	}

	/** @returns {number} */
	get right() {
		return this.#right;
	}

	/** @param {number} value */
	set right(value) {
		this.#right = value;
	}

	/** @returns {number} */
	get top() {
		return this.#top;
	}

	/** @param {number} value */
	set top(value) {
		this.#top = value;
	}

	/** @returns {number} */
	get bottom() {
		return this.#bottom;
	}

	/** @param {number} value */
	set bottom(value) {
		this.#bottom = value;
	}

	/** @returns {number} */
	get near() {
		return this.#near;
	}

	/** @param {number} value */
	set near(value) {
		this.#near = value;
	}

	/** @returns {number} */
	get far() {
		return this.#far;
	}

	/** @param {number} value */
	set far(value) {
		this.#far = value;
	}

	/** @returns {number} */
	get tileSize() {
		return this.#tileSize;
	}

	/** @param {number} value */
	set tileSize(value) {
		this.#tileSize = value;
	}

	/** @returns {void} */
	updateProjectionMatrix() {
		this.projectionMatrix.makeOrthographic(
			this.#left,
			this.#right,
			this.#top,
			this.#bottom,
			this.#near,
			this.#far,
		);
	}

	/**
	 * @override
	 * @param {boolean} [force=false]
	 * @returns {void}
	 */
	updateMatrixWorld(force = false) {
		super.updateMatrixWorld(force, false);
		this.matrixWorldInverse.copy(this.matrixWorld).invert();
	}

	/**
	 * @override
	 * @returns {Camera}
	 */
	clone() {
		return new Camera({
			left: this.#left,
			right: this.#right,
			top: this.#top,
			bottom: this.#bottom,
			near: this.#near,
			far: this.#far,
			tileSize: this.#tileSize,
		});
	}

	/**
	 * @override
	 * @param {Camera} source
	 * @param {boolean} [recursive=true]
	 * @returns {this}
	 */
	copy(source, recursive = true) {
		super.copy(source, recursive);

		this.projectionMatrix.copy(source.projectionMatrix);
		this.matrixWorldInverse.copy(source.matrixWorldInverse);
		this.#left = source.left;
		this.#right = source.right;
		this.#top = source.top;
		this.#bottom = source.bottom;
		this.#near = source.near;
		this.#far = source.far;
		this.#tileSize = source.tileSize;
		return this;
	}
}
