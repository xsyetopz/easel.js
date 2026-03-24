import { Matrix4 } from "../math/Matrix4.ts";
import { Mesh } from "./Mesh.js";

const _boneMatrix = new Matrix4();
const _result = new Matrix4();

/** Mesh deformed by a Skeleton via vertex skinning. */
export class SkinnedMesh extends Mesh {
	/** @override @type {string} */
	type = "SkinnedMesh";

	/** @type {'attached'|'detached'} */
	bindMode = "attached";

	/** @type {Matrix4} */
	#bindMatrix = new Matrix4();

	/** @type {Matrix4} */
	#bindMatrixInverse = new Matrix4();

	/** @type {*|undefined} */
	#skeleton = undefined;

	/**
	 * @param {*} [geometry]
	 * @param {*} [material]
	 */
	constructor(geometry = undefined, material = undefined) {
		super(geometry, material);
	}

	/** @returns {Matrix4} */
	get bindMatrix() {
		return this.#bindMatrix;
	}

	/** @returns {Matrix4} */
	get bindMatrixInverse() {
		return this.#bindMatrixInverse;
	}

	/** @returns {*|undefined} */
	get skeleton() {
		return this.#skeleton;
	}

	/**
	 * @param {*} skeleton
	 * @param {Matrix4} [bindMatrix]
	 * @returns {void}
	 */
	bind(skeleton, bindMatrix) {
		this.#skeleton = skeleton;
		if (bindMatrix !== undefined) {
			this.#bindMatrix.copy(bindMatrix);
		}
		this.#bindMatrixInverse.copy(this.#bindMatrix).invert();
	}

	/** @returns {void} */
	pose() {
		this.#skeleton?.pose();
	}

	/** @returns {void} */
	normalizeSkinWeights() {
		const geometry = this.geometry;
		if (!geometry) return;

		const skinWeight = geometry.getAttribute("skinWeight");
		if (!skinWeight) return;

		const { array, itemSize } = skinWeight;
		for (let i = 0; i < array.length; i += itemSize) {
			let sum = 0;
			for (let j = 0; j < itemSize; j++) sum += array[i + j];
			if (sum !== 0) {
				for (let j = 0; j < itemSize; j++) array[i + j] /= sum;
			}
		}
	}

	/**
	 * @param {number} index
	 * @param {*} target
	 * @returns {void}
	 */
	boneTransform(index, target) {
		const skeleton = this.#skeleton;
		if (!skeleton) return;

		const geometry = this.geometry;
		if (!geometry) return;

		const skinIndex = geometry.getAttribute("skinIndex");
		const skinWeight = geometry.getAttribute("skinWeight");
		const position = geometry.getAttribute("position");
		if (!(skinIndex && skinWeight && position)) return;

		const si = skinIndex.itemSize;
		const sw = skinWeight.itemSize;

		_result.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

		for (let j = 0; j < si; j++) {
			const weight = skinWeight.array[index * sw + j];
			if (weight === 0) continue;

			const boneIndex = skinIndex.array[index * si + j];
			_boneMatrix.elements.set(
				skeleton.boneMatrices.subarray(boneIndex * 16, boneIndex * 16 + 16),
			);
			const te = _boneMatrix.elements;
			const re = _result.elements;
			for (let k = 0; k < 16; k++) re[k] += te[k] * weight;
		}

		const px = position.array[index * position.itemSize + 0];
		const py = position.array[index * position.itemSize + 1];
		const pz = position.array[index * position.itemSize + 2];

		const re = _result.elements;
		target.x = re[0] * px + re[4] * py + re[8] * pz + re[12];
		target.y = re[1] * px + re[5] * py + re[9] * pz + re[13];
		target.z = re[2] * px + re[6] * py + re[10] * pz + re[14];
	}

	/**
	 * @override
	 * @returns {SkinnedMesh}
	 */
	clone() {
		return new SkinnedMesh().copy(this);
	}

	/**
	 * @override
	 * @param {SkinnedMesh} source
	 * @param {boolean} [recursive=true]
	 * @returns {this}
	 */
	copy(source, recursive = true) {
		super.copy(source, recursive);
		this.bindMode = source.bindMode;
		this.#bindMatrix.copy(source.bindMatrix);
		this.#bindMatrixInverse.copy(source.bindMatrixInverse);
		this.#skeleton = source.skeleton;
		return this;
	}
}
