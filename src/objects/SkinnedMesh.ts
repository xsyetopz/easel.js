import type { Attribute } from "../geometry/Attribute.ts";
import type { Geometry } from "../geometry/Geometry.ts";
import type { Material } from "../materials/Material.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Mesh } from "./Mesh.ts";

const _boneMatrix = new Matrix4();
const _result = new Matrix4();

interface Skeleton {
  pose: () => void;
  boneMatrices: Float32Array;
}

interface TargetVec3 {
  x: number;
  y: number;
  z: number;
}

/** Mesh deformed by a Skeleton via vertex skinning. */
export class SkinnedMesh extends Mesh {
  override type = "SkinnedMesh";

  bindMode: "attached" | "detached" = "attached";

  #bindMatrix = new Matrix4();

  #bindMatrixInverse = new Matrix4();

  #skeleton: Skeleton | undefined = undefined;

  constructor(
    geometry: Geometry | undefined = void 0,
    material: Material | undefined = void 0,
  ) {
    super(geometry, material);
  }

  get bindMatrix(): Matrix4 {
    return this.#bindMatrix;
  }

  get bindMatrixInverse(): Matrix4 {
    return this.#bindMatrixInverse;
  }

  get skeleton(): Skeleton | undefined {
    return this.#skeleton;
  }

  bind(skeleton: Skeleton, bindMatrix?: Matrix4): void {
    this.#skeleton = skeleton;
    if (bindMatrix !== undefined) {
      this.#bindMatrix.copy(bindMatrix);
    }
    this.#bindMatrixInverse.copy(this.#bindMatrix).invert();
  }

  pose(): void {
    this.#skeleton?.pose();
  }

  normalizeSkinWeights(): void {
    const geometry = this.geometry;
    if (!geometry) return;

    const skinWeight = geometry.getAttribute("skinWeight") as
      | (Attribute & { array: Float32Array; itemSize: number })
      | undefined;
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

  boneTransform(index: number, target: TargetVec3): void {
    const skeleton = this.#skeleton;
    if (!skeleton) return;

    const geometry = this.geometry;
    if (!geometry) return;

    const skinIndex = geometry.getAttribute("skinIndex") as
      | (Attribute & { array: Float32Array; itemSize: number })
      | undefined;
    const skinWeight = geometry.getAttribute("skinWeight") as
      | (Attribute & { array: Float32Array; itemSize: number })
      | undefined;
    const position = geometry.getAttribute("position") as
      | (Attribute & { array: Float32Array; itemSize: number })
      | undefined;
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

  override clone(): SkinnedMesh {
    return new SkinnedMesh().copy(this);
  }

  override copy(source: SkinnedMesh, recursive = true): this {
    super.copy(source, recursive);
    this.bindMode = source.bindMode;
    this.#bindMatrix.copy(source.bindMatrix);
    this.#bindMatrixInverse.copy(source.bindMatrixInverse);
    this.#skeleton = source.skeleton;
    return this;
  }
}
