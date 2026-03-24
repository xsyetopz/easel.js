import { MathUtils } from "../math/MathUtils.ts";
import { Camera } from "./Camera.js";

/**
 * Perspective projection camera. Produces the non-unit W values that make
 * affine UV interpolation visibly incorrect - the classic RuneTek 3 artifact.
 */
export class PerspectiveCamera extends Camera {
	/** @override @type {string} */
	type = "PerspectiveCamera";

	#fov;
	#aspect;

	/**
	 * @param {object} [options]
	 * @param {number} [options.fov=45] Vertical field of view in degrees.
	 * @param {number} [options.aspect=1] Viewport width / height.
	 * @param {number} [options.near=0.1]
	 * @param {number} [options.far=2000]
	 * @param {number} [options.tileSize=1]
	 */
	constructor({
		fov = 45,
		aspect = 1,
		near = 0.1,
		far = 2000,
		tileSize = 1,
	} = {}) {
		super({ near, far, tileSize });
		this.#fov = fov;
		this.#aspect = aspect;
		this.updateProjectionMatrix();
	}

	/** @returns {number} */
	get fov() {
		return this.#fov;
	}

	/** @param {number} value */
	set fov(value) {
		this.#fov = value;
	}

	/** @returns {number} */
	get aspect() {
		return this.#aspect;
	}

	/** @param {number} value */
	set aspect(value) {
		this.#aspect = value;
	}

	/** @override @returns {void} */
	updateProjectionMatrix() {
		this.projectionMatrix.makePerspective(
			MathUtils.toRadians(this.#fov),
			this.#aspect,
			this.near,
			this.far,
		);
	}

	/** @override @returns {PerspectiveCamera} */
	clone() {
		return new PerspectiveCamera({
			fov: this.#fov,
			aspect: this.#aspect,
			near: this.near,
			far: this.far,
			tileSize: this.tileSize,
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
		if (!(source instanceof PerspectiveCamera)) return this;
		this.#fov = source.fov;
		this.#aspect = source.aspect;
		return this;
	}
}
