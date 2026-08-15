import { BindMode, type BindMode as BindModeValue } from "../core/Constants.ts";
import type { Attribute } from "../geometry/Attribute.ts";
import type { Geometry } from "../geometry/Geometry.ts";
import type { Material } from "../materials/Material.ts";
import { Box3 } from "../math/Box3.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Sphere } from "../math/Sphere.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Mesh } from "./Mesh.ts";
import { Skeleton } from "./Skeleton.ts";

const _boneMatrix = new Matrix4();
const _basePosition = new Vector3();
const _transformedPosition = new Vector3();
const _boundsPosition = new Vector3();

interface TargetVec3 {
  x: number;
  y: number;
  z: number;
}

/** Mesh whose vertices are deformed by CPU skinning against a `Skeleton`. */
export class SkinnedMesh extends Mesh {
  /** Serialization discriminator for this runtime type. */
  override type: string = "SkinnedMesh";

  /** Type guard identifying this concrete object type. */
  get isSkinnedMesh(): true {
    return true;
  }

  /** Whether bind matrices follow the mesh or remain detached. */
  bindMode: BindModeValue = BindMode.Attached;

  readonly #bindMatrix = new Matrix4();

  readonly #bindMatrixInverse = new Matrix4();

  #skeleton: Skeleton | undefined = undefined;

  /** Computed local-space bounds of the deformed vertices. */
  boundingBox: Box3 | undefined = undefined;

  /** Computed local-space sphere of the deformed vertices. */
  boundingSphere: Sphere | undefined = undefined;

  /** Constructs a CPU-skinned mesh with optional geometry and material. */
  constructor(geometry: Geometry | undefined = void 0, material?: Material) {
    super(geometry, material);
  }

  /** Matrix that maps mesh vertices into skeleton bind space. */
  get bindMatrix(): Matrix4 {
    return this.#bindMatrix;
  }

  /** Copies a bind matrix used to enter skeleton space. */
  set bindMatrix(value: Matrix4) {
    this.#bindMatrix.copy(value);
  }

  /** Inverse of the matrix used to leave skeleton bind space. */
  get bindMatrixInverse(): Matrix4 {
    return this.#bindMatrixInverse;
  }

  /** Copies an inverse bind matrix used to leave skeleton space. */
  set bindMatrixInverse(value: Matrix4) {
    this.#bindMatrixInverse.copy(value);
  }

  /** Skeleton supplying bone transforms for CPU skinning. */
  get skeleton(): Skeleton | undefined {
    return this.#skeleton;
  }

  /** Attaches a skeleton reference used for CPU vertex deformation. */
  set skeleton(value: Skeleton | undefined) {
    if (value !== undefined && !(value instanceof Skeleton)) {
      throw new TypeError(
        "SkinnedMesh.skeleton must be a Skeleton or undefined.",
      );
    }
    this.#skeleton = value;
  }

  /** Binds a skeleton and captures its bind transform. */
  bind(skeleton: Skeleton, bindMatrix?: Matrix4): void {
    this.skeleton = skeleton;
    if (bindMatrix === undefined) {
      this.updateMatrixWorld(true, false);
      skeleton.calculateInverses();
      this.#bindMatrix.copy(this.matrixWorld);
    } else {
      this.#bindMatrix.copy(bindMatrix);
    }
    this.#bindMatrixInverse.copy(this.#bindMatrix).invert();
  }

  /** Restores the skeleton bind pose. */
  pose(): void {
    this.#skeleton?.pose();
  }

  /** Keeps the inverse bind matrix synchronized for attached skeletons. */
  override updateMatrixWorld(
    updateParents: boolean = false,
    updateChildren: boolean = true,
    force: boolean = false,
  ): void {
    super.updateMatrixWorld(updateParents, updateChildren, force);
    if (this.bindMode === BindMode.Attached) {
      this.#bindMatrixInverse.copy(this.matrixWorld).invert();
    } else if (this.bindMode === BindMode.Detached) {
      this.#bindMatrixInverse.copy(this.#bindMatrix).invert();
    }
  }

  /** Normalizes skin weights, using a deterministic first-bone fallback. */
  normalizeSkinWeights(): void {
    const geometry = this.geometry;
    if (!geometry) return;

    const skinWeight = geometry.getAttribute("skinWeight") as
      | (Attribute & { array: ArrayLike<number>; itemSize: number })
      | undefined;
    if (!skinWeight) return;

    const { itemSize } = skinWeight;
    for (let index = 0; index < skinWeight.count; index++) {
      let sum = 0;
      for (let component = 0; component < itemSize; component++) {
        sum += skinWeight.getComponent(index, component);
      }
      if (sum === 0) {
        skinWeight.setComponent(index, 0, 1);
        for (let component = 1; component < itemSize; component++) {
          skinWeight.setComponent(index, component, 0);
        }
      } else {
        for (let component = 0; component < itemSize; component++) {
          skinWeight.setComponent(
            index,
            component,
            skinWeight.getComponent(index, component) / sum,
          );
        }
      }
    }
  }

  /** Computes deformed local vertex position for the supplied index. */
  override getVertexPosition(index: number, target: Vector3): Vector3 {
    super.getVertexPosition(index, target);
    this.#applyBoneTransform(index, target);
    return target;
  }

  /** Computes bounds from deformed CPU vertex positions. */
  computeBoundingBox(): void {
    const geometry = this.geometry;
    const position = geometry?.getAttribute("position");
    const box = this.boundingBox ?? new Box3();
    box.makeEmpty();
    if (position === undefined) {
      this.boundingBox = box;
      return;
    }
    for (let index = 0; index < position.count; index++) {
      this.getVertexPosition(index, _boundsPosition);
      box.expandByPoint(_boundsPosition);
    }
    this.boundingBox = box;
  }

  /** Computes a sphere from deformed CPU vertex positions. */
  computeBoundingSphere(): void {
    const geometry = this.geometry;
    const position = geometry?.getAttribute("position");
    const points: Vector3[] = [];
    if (position !== undefined) {
      for (let index = 0; index < position.count; index++) {
        points.push(this.getVertexPosition(index, _boundsPosition).clone());
      }
    }
    const sphere = this.boundingSphere ?? new Sphere();
    sphere.setFromPoints(points);
    this.boundingSphere = sphere;
  }

  /** Applies weighted bone matrices to one local vertex position. */
  boneTransform(index: number, target: TargetVec3): void {
    const geometry = this.geometry;
    const position = geometry?.getAttribute("position");
    if (position === undefined) return;
    _basePosition.set(
      position.getX(index),
      position.getY(index),
      position.getZ(index),
    );
    this.#applyBoneTransform(index, _basePosition);
    target.x = _basePosition.x;
    target.y = _basePosition.y;
    target.z = _basePosition.z;
  }

  #applyBoneTransform(index: number, target: Vector3): void {
    const skeleton = this.#skeleton;
    const geometry = this.geometry;
    if (!(skeleton && geometry)) return;

    const skinIndex = geometry.getAttribute("skinIndex");
    const skinWeight = geometry.getAttribute("skinWeight");
    if (!(skinIndex && skinWeight)) return;

    _basePosition.copy(target).applyMatrix4(this.#bindMatrix);
    _transformedPosition.set(0, 0, 0);

    const influenceCount = Math.min(skinIndex.itemSize, skinWeight.itemSize);
    for (let component = 0; component < influenceCount; component++) {
      const weight = skinWeight.getComponent(index, component);
      if (weight === 0) continue;
      const boneIndex = Math.trunc(skinIndex.getComponent(index, component));
      const bone = skeleton.bones[boneIndex];
      const inverse = skeleton.boneInverses[boneIndex];
      if (bone === undefined || inverse === undefined) continue;
      _boneMatrix.multiplyMatrices(bone.matrixWorld, inverse);
      _boundsPosition.copy(_basePosition).applyMatrix4(_boneMatrix);
      _transformedPosition.x += _boundsPosition.x * weight;
      _transformedPosition.y += _boundsPosition.y * weight;
      _transformedPosition.z += _boundsPosition.z * weight;
    }

    target.copy(_transformedPosition).applyMatrix4(this.#bindMatrixInverse);
  }

  /** Returns an independent copy with cloned mutable state. */
  override clone(): SkinnedMesh {
    return new SkinnedMesh(this.geometry, this.material).copy(this);
  }

  /** Copies bind matrices, skeleton reference, and computed deformed bounds. */
  override copy(source: SkinnedMesh, recursive: boolean = true): this {
    super.copy(source, recursive);
    this.bindMode = source.bindMode;
    this.#bindMatrix.copy(source.bindMatrix);
    this.#bindMatrixInverse.copy(source.bindMatrixInverse);
    this.#skeleton = source.skeleton;
    this.boundingBox = source.boundingBox?.clone();
    this.boundingSphere = source.boundingSphere?.clone();
    return this;
  }
}
