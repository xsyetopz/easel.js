import { Mesh } from "./Mesh.js";

export class InstancedMesh extends Mesh {
	/** @override @type {string} */
	type = "InstancedMesh";

	/** @type {number} */
	#count;

	/** @type {Float32Array} */
	#instanceMatrix;

	/** @type {Float32Array|undefined} */
	#instanceColor = undefined;

	/** @override */
	frustumCulled = false;

	/**
	 * @param {import('../geometry/Geometry.js').Geometry} [geometry]
	 * @param {import('../materials/Material.js').Material} [material]
	 * @param {number} [count=0]
	 */
	constructor(geometry = undefined, material = undefined, count = 0) {
		super(geometry, material);
		this.#count = count;
		this.#instanceMatrix = new Float32Array(count * 16);

		for (let i = 0; i < count; i++) {
			const offset = i * 16;
			this.#instanceMatrix[offset + 0] = 1;
			this.#instanceMatrix[offset + 5] = 1;
			this.#instanceMatrix[offset + 10] = 1;
			this.#instanceMatrix[offset + 15] = 1;
		}
	}

	/** @returns {number} */
	get count() {
		return this.#count;
	}

	/** @param {number} value */
	set count(value) {
		this.#count = value;
	}

	/** @returns {Float32Array} */
	get instanceMatrix() {
		return this.#instanceMatrix;
	}

	/** @returns {Float32Array|undefined} */
	get instanceColor() {
		return this.#instanceColor;
	}

	/** @param {Float32Array|undefined} value */
	set instanceColor(value) {
		this.#instanceColor = value;
	}

	/**
	 * @param {number} index
	 * @param {import('../math/Matrix4.js').Matrix4} matrix
	 * @returns {void}
	 */
	getMatrixAt(index, matrix) {
		const offset = index * 16;
		const te = matrix.elements;
		for (let i = 0; i < 16; i++) {
			te[i] = this.#instanceMatrix[offset + i];
		}
	}

	/**
	 * @param {number} index
	 * @param {import('../math/Matrix4.js').Matrix4} matrix
	 * @returns {void}
	 */
	setMatrixAt(index, matrix) {
		const offset = index * 16;
		const te = matrix.elements;
		for (let i = 0; i < 16; i++) {
			this.#instanceMatrix[offset + i] = te[i];
		}
	}

	/**
	 * @param {number} index
	 * @param {import('../math/Color.js').Color} color
	 * @returns {void}
	 */
	getColorAt(index, color) {
		if (this.#instanceColor === undefined) return;
		const offset = index * 3;
		color.r = this.#instanceColor[offset + 0];
		color.g = this.#instanceColor[offset + 1];
		color.b = this.#instanceColor[offset + 2];
	}

	/**
	 * @param {number} index
	 * @param {import('../math/Color.js').Color} color
	 * @returns {void}
	 */
	setColorAt(index, color) {
		if (this.#instanceColor === undefined) {
			this.#instanceColor = new Float32Array(this.#count * 3);
		}
		const offset = index * 3;
		this.#instanceColor[offset + 0] = color.r;
		this.#instanceColor[offset + 1] = color.g;
		this.#instanceColor[offset + 2] = color.b;
	}

	/**
	 * @override
	 * @returns {InstancedMesh}
	 */
	clone() {
		const cloned = new InstancedMesh(this.geometry, this.material, this.#count);
		cloned.copy(this);
		cloned.#instanceMatrix = this.#instanceMatrix.slice();
		if (this.#instanceColor !== undefined) {
			cloned.#instanceColor = this.#instanceColor.slice();
		}
		return cloned;
	}

	/** @returns {void} */
	dispose() {
		this.#instanceMatrix = new Float32Array(0);
		this.#instanceColor = undefined;
	}
}
