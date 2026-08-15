import { Matrix4 } from "../math/Matrix4.ts";
import { Bone } from "./Bone.ts";

const _offsetMatrix = new Matrix4();
const _localMatrix = new Matrix4();

/** Bone list, inverse bind matrices, and flattened CPU skinning transforms. */
export class Skeleton {
  /** Stable identity used by animation and serialization callers. */
  readonly uuid: string = crypto.randomUUID();

  #bones: readonly Bone[];

  #boneInverses: readonly Matrix4[];

  #boneMatrices: Float32Array;

  /** Constructs a skeleton from bones and optional inverse bind matrices. */
  constructor(
    bones: readonly Bone[] = [],
    boneInverses: readonly Matrix4[] = [],
  ) {
    assertBones(bones);
    assertBoneInverses(boneInverses, bones.length);
    this.#bones = freezeList(bones);
    this.#boneInverses = freezeList(boneInverses);
    this.#boneMatrices = new Float32Array(0);
    this.init();
  }

  /** Read-only bones participating in this skeleton. */
  get bones(): readonly Bone[] {
    return this.#bones;
  }

  /** Read-only inverse bind matrices aligned with `bones`. */
  get boneInverses(): readonly Matrix4[] {
    return this.#boneInverses;
  }

  /** Packed column-major bone matrices consumed by CPU skinning. */
  get boneMatrices(): Float32Array {
    return this.#boneMatrices;
  }

  /** Initializes derived matrix storage and missing inverse bind matrices. */
  init(): this {
    this.#boneMatrices = new Float32Array(this.#bones.length * 16);
    if (this.#boneInverses.length === 0) this.calculateInverses();
    return this;
  }

  /** Calculates inverse bind matrices from prepared bone world matrices. */
  calculateInverses(): void {
    const inverses: Matrix4[] = [];
    for (const bone of this.#bones) {
      const inverse = new Matrix4();
      inverse.copy(bone.matrixWorld).invert();
      inverses.push(inverse);
    }
    this.#boneInverses = freezeList(inverses);
    if (this.#boneMatrices.length !== this.#bones.length * 16) {
      this.#boneMatrices = new Float32Array(this.#bones.length * 16);
    }
  }

  /** Restores the bind pose and local transforms without scene-wide polling. */
  pose(): void {
    for (let index = 0; index < this.#bones.length; index++) {
      const bone = this.#bones[index];
      const inverse = this.#boneInverses[index];
      if (inverse === undefined) continue;
      bone.matrixWorld.copy(inverse).invert();
    }

    for (const bone of this.#bones) {
      if (bone.parent instanceof Bone) {
        _localMatrix
          .copy(bone.parent.matrixWorld)
          .invert()
          .multiply(bone.matrixWorld);
        bone.matrix.copy(_localMatrix);
      } else {
        bone.matrix.copy(bone.matrixWorld);
      }
      bone.matrix.decompose(bone.position, bone.quaternion, bone.scale);
      bone.rotation.setFromQuaternion(bone.quaternion);
      bone.matrixWorldNeedsUpdate = false;
    }
  }

  /** Updates flattened CPU skinning matrices from current bone worlds. */
  update(): void {
    const bones = this.#bones;
    const boneInverses = this.#boneInverses;
    const boneMatrices = this.#boneMatrices;

    for (let index = 0; index < bones.length; index++) {
      const inverse = boneInverses[index];
      if (inverse === undefined) continue;
      _offsetMatrix.multiplyMatrices(bones[index]?.matrixWorld, inverse);
      boneMatrices.set(_offsetMatrix.elements, index * 16);
    }
  }

  /** Finds a bone by its public `name`, if present. */
  getBoneByName(name: string): Bone | undefined {
    return this.#bones.find((bone) => bone.name === name);
  }

  /** Returns an independent copy with cloned mutable state. */
  clone(): Skeleton {
    return new Skeleton(
      this.#bones.map((bone) => bone.clone()),
      this.#boneInverses.map((inverse) => inverse.clone()),
    );
  }

  /** Releases CPU matrix storage and clears the owned bone lists. */
  dispose(): void {
    this.#bones = freezeList([]);
    this.#boneInverses = freezeList([]);
    this.#boneMatrices = new Float32Array(0);
  }
}

function assertBones(bones: readonly Bone[]): void {
  if (!Array.isArray(bones)) {
    throw new TypeError("Skeleton.bones must be an array of Bone objects.");
  }
  for (const bone of bones) {
    if (!(bone instanceof Bone)) {
      throw new TypeError("Skeleton.bones must contain only Bone objects.");
    }
  }
}

function assertBoneInverses(
  boneInverses: readonly Matrix4[],
  boneCount: number,
): void {
  if (!Array.isArray(boneInverses)) {
    throw new TypeError(
      "Skeleton.boneInverses must be an array of Matrix4 objects.",
    );
  }
  if (boneInverses.length > 0 && boneInverses.length !== boneCount) {
    throw new RangeError(
      "Skeleton.boneInverses must be empty or match the bone count.",
    );
  }
  for (const inverse of boneInverses) {
    if (!(inverse instanceof Matrix4)) {
      throw new TypeError(
        "Skeleton.boneInverses must contain only Matrix4 objects.",
      );
    }
  }
}

function freezeList<T>(values: readonly T[]): readonly T[] {
  return Object.freeze(values.slice());
}
