import type { Node } from "../core/Node.ts";
import { Matrix4 } from "../math/Matrix4.ts";

/** Bone hierarchy with inverse bind matrices for skinning. */
export class Skeleton {
	#bones: Node[];

	#boneInverses: Matrix4[];

	#boneMatrices: Float32Array;

	constructor(bones: Node[] = [], boneInverses: Matrix4[] = []) {
		this.#bones = bones.slice();
		this.#boneInverses = boneInverses.slice();
		this.#boneMatrices = new Float32Array(bones.length * 16);

		if (boneInverses.length === 0) {
			this.calculateInverses();
		}
	}

	get bones(): Node[] {
		return this.#bones;
	}

	get boneInverses(): Matrix4[] {
		return this.#boneInverses;
	}

	get boneMatrices(): Float32Array {
		return this.#boneMatrices;
	}

	calculateInverses(): void {
		this.#boneInverses = [];
		for (const bone of this.#bones) {
			const inverse = new Matrix4();
			inverse.copy(bone.matrixWorld).invert();
			this.#boneInverses.push(inverse);
		}
	}

	pose(): void {
		for (let i = 0; i < this.#bones.length; i++) {
			const bone = this.#bones[i];
			const inverse = this.#boneInverses[i];
			if (inverse) {
				bone.matrixWorld.copy(inverse).invert();
			}
		}
	}

	update(): void {
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

	getBoneByName(name: string): Node | undefined {
		return this.#bones.find((bone) => bone.name === name);
	}

	clone(): Skeleton {
		return new Skeleton(
			this.#bones.map((b) => b.clone()),
			this.#boneInverses.map((m) => m.clone()),
		);
	}

	dispose(): void {
		this.#bones = [];
		this.#boneInverses = [];
		this.#boneMatrices = new Float32Array(0);
	}
}
