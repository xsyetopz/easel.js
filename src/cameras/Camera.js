import { Node } from "../core/Node.js";
import { Matrix4 } from "../math/Matrix4.js";

/**
 * Abstract base class for all camera types.
 * Subclasses must override {@link updateProjectionMatrix}.
 */
export class Camera extends Node {
	/** @override @type {string} */
	type = "Camera";

	projectionMatrix = new Matrix4();
	matrixWorldInverse = new Matrix4();

	#near;
	#far;
	#tileSize;

	/**
	 * @param {object} [options]
	 * @param {number} [options.near=0.1]
	 * @param {number} [options.far=2000]
	 * @param {number} [options.tileSize=1] World units per tile. Used for sort distance and fog culling.
	 */
	constructor({ near = 0.1, far = 2000, tileSize = 1 } = {}) {
		super();
		this.#near = near;
		this.#far = far;
		this.#tileSize = tileSize;
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
		// Subclasses override this to rebuild projectionMatrix.
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
	 * @abstract
	 * @override
	 * @returns {Camera}
	 */
	clone() {
		throw new Error(
			"Camera.clone: use OrthographicCamera or PerspectiveCamera",
		);
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
		this.#near = source.near;
		this.#far = source.far;
		this.#tileSize = source.tileSize;
		return this;
	}
}
