import { Matrix4 } from "../math/Matrix4.js";

/** Bone hierarchy with inverse bind matrices for skinning. */
export class Skeleton {
	/** @type {*[]} */
	#bones;

	/** @type {Matrix4[]} */
	#boneInverses;

	/** @type {Float32Array} */
	#boneMatrices;

	/**
	 * @param {*[]} [bones=[]]
	 * @param {Matrix4[]} [boneInverses=[]]
	 */
	constructor(bones = [], boneInverses = []) {
		this.#bones = bones.slice();
		this.#boneInverses = boneInverses.slice();
		this.#boneMatrices = new Float32Array(bones.length * 16);

		if (boneInverses.length === 0) {
			this.calculateInverses();
		}
	}

	/** @returns {*[]} */
	get bones() {
		return this.#bones;
	}

	/** @returns {Matrix4[]} */
	get boneInverses() {
		return this.#boneInverses;
	}

	/** @returns {Float32Array} */
	get boneMatrices() {
		return this.#boneMatrices;
	}

	/** @returns {void} */
	calculateInverses() {
		this.#boneInverses = [];
		for (const bone of this.#bones) {
			const inverse = new Matrix4();
			inverse.copy(bone.matrixWorld).invert();
			this.#boneInverses.push(inverse);
		}
	}

	/** @returns {void} */
	pose() {
		for (let i = 0; i < this.#bones.length; i++) {
			const bone = this.#bones[i];
			const inverse = this.#boneInverses[i];
			if (inverse) {
				bone.matrixWorld.copy(inverse).invert();
			}
		}
	}

	/** @returns {void} */
	update() {
		const bones = this.#bones;
		const boneInverses = this.#boneInverses;
		const boneMatrices = this.#boneMatrices;

		const _mat = new Matrix4();

		for (let i = 0; i < bones.length; i++) {
			_mat.mulMatrices(bones[i].matrixWorld, boneInverses[i]);
			const te = _mat.elements;
			const offset = i * 16;
			for (let j = 0; j < 16; j++) {
				boneMatrices[offset + j] = te[j];
			}
		}
	}

	/**
	 * @param {string} name
	 * @returns {*|undefined}
	 */
	getBoneByName(name) {
		return this.#bones.find((bone) => bone.name === name);
	}

	/** @returns {Skeleton} */
	clone() {
		return new Skeleton(
			this.#bones.map((b) => b.clone()),
			this.#boneInverses.map((m) => m.clone()),
		);
	}

	/** @returns {void} */
	dispose() {
		this.#bones = [];
		this.#boneInverses = [];
		this.#boneMatrices = new Float32Array(0);
	}
}
