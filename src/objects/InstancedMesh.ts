import type { Intersection, Raycaster } from "../core/Raycaster.ts";
import type { Geometry } from "../geometry/Geometry.ts";
import type { Material } from "../materials/Material.ts";
import { Box3 } from "../math/Box3.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Sphere } from "../math/Sphere.ts";
import { Mesh } from "./Mesh.ts";
import { raycastMeshGeometry } from "./raycast.ts";

interface ColorLike {
  r: number;
  g: number;
  b: number;
}

const _identity = new Matrix4();
const _instanceLocalMatrix = new Matrix4();
const _instanceBox = new Box3();
const _instanceSphere = new Sphere();
const _instanceWorldMatrix = new Matrix4();

/** Mesh with CPU-side per-instance transforms and optional RGB colors. */
export class InstancedMesh extends Mesh {
  /** Serialization discriminator for this runtime type. */
  override type: string = "InstancedMesh";

  /** Type guard identifying this concrete object type. */
  get isInstancedMesh(): true {
    return true;
  }

  #count: number;

  #capacity: number;

  #instanceMatrix: Float32Array;

  #instanceColor: Float32Array | undefined = undefined;

  /** Whether frustum culling is enabled for the instance set. */
  override frustumCulled: boolean = true;

  /** Cached local-space box enclosing active instances, when computed. */
  boundingBox: Box3 | undefined = undefined;

  /** Cached local-space sphere enclosing active instances, when computed. */
  boundingSphere: Sphere | undefined = undefined;

  /** Constructs an instance set with preallocated transform storage. */
  constructor(
    geometry: Geometry | undefined = void 0,
    material: Material | undefined = void 0,
    count: number = 0,
  ) {
    super(geometry, material);
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new RangeError(
        "InstancedMesh.count must be a non-negative safe integer.",
      );
    }
    this.#count = count;
    this.#capacity = count;
    this.#instanceMatrix = new Float32Array(count * 16);

    for (let i = 0; i < count; i++) {
      this.#instanceMatrix.set(_identity.elements, i * 16);
    }
  }

  /** Number of active instances; cannot exceed allocated capacity. */
  override get count(): number {
    return this.#count;
  }

  /** Changes the active instance count without reallocating storage. */
  override set count(value: number) {
    if (!Number.isSafeInteger(value) || value < 0 || value > this.#capacity) {
      throw new RangeError(
        `InstancedMesh.count must be between 0 and ${this.#capacity}.`,
      );
    }
    this.#count = value;
    this.boundingBox = undefined;
    this.boundingSphere = undefined;
  }

  /** Packed column-major transform matrices for all allocated instances. */
  get instanceMatrix(): Float32Array {
    return this.#instanceMatrix;
  }

  /** Optional packed RGB color for each allocated instance. */
  get instanceColor(): Float32Array | undefined {
    return this.#instanceColor;
  }

  /** Assigns optional packed RGB storage for the allocated instances. */
  set instanceColor(value: Float32Array | undefined) {
    if (value !== undefined && value.length < this.#count * 3) {
      throw new RangeError("InstancedMesh.instanceColor is too short.");
    }
    this.#instanceColor = value;
  }

  /** Computes a local-space box enclosing every active instance. */
  computeBoundingBox(): void {
    const geometry = this.geometry;
    const box = this.boundingBox ?? new Box3();
    box.makeEmpty();
    if (geometry === undefined) {
      this.boundingBox = box;
      return;
    }
    if (geometry.boundingBox === undefined) geometry.computeBoundingBox();
    const source = geometry.boundingBox;
    if (source === undefined) {
      this.boundingBox = box;
      return;
    }
    for (let index = 0; index < this.#count; index++) {
      this.getMatrixAt(index, _instanceLocalMatrix);
      _instanceBox.copy(source).applyMatrix4(_instanceLocalMatrix);
      box.union(_instanceBox);
    }
    this.boundingBox = box;
  }

  /** Computes a local-space sphere enclosing every active instance. */
  computeBoundingSphere(): void {
    const geometry = this.geometry;
    const sphere = this.boundingSphere ?? new Sphere().makeEmpty();
    sphere.makeEmpty();
    if (geometry === undefined) {
      this.boundingSphere = sphere;
      return;
    }
    if (geometry.boundingSphere === undefined) geometry.computeBoundingSphere();
    const source = geometry.boundingSphere;
    if (source === undefined) {
      this.boundingSphere = sphere;
      return;
    }
    for (let index = 0; index < this.#count; index++) {
      this.getMatrixAt(index, _instanceLocalMatrix);
      _instanceSphere.copy(source).applyMatrix4(_instanceLocalMatrix);
      sphere.union(_instanceSphere);
    }
    this.boundingSphere = sphere;
  }

  /** Appends CPU ray intersections for every active instance. */
  override raycast(raycaster: Raycaster, intersects: Intersection[]): void {
    if (this.geometry === undefined || this.material === undefined) return;
    for (let index = 0; index < this.#count; index++) {
      this.getMatrixAt(index, _instanceLocalMatrix);
      _instanceWorldMatrix.multiplyMatrices(
        this.matrixWorld,
        _instanceLocalMatrix,
      );
      const offset = intersects.length;
      raycastMeshGeometry(
        this,
        this.geometry,
        _instanceWorldMatrix,
        raycaster,
        intersects,
      );
      for (let hitIndex = offset; hitIndex < intersects.length; hitIndex++) {
        const hit = intersects[hitIndex] as Intersection & {
          instanceId?: number;
        };
        hit.instanceId = index;
      }
    }
  }

  /** Reads an active instance transform into `matrix`. */
  getMatrixAt(index: number, matrix: Matrix4): Matrix4 {
    assertInstanceIndex(index, this.#count, "getMatrixAt");
    matrix.elements.set(
      this.#instanceMatrix.subarray(index * 16, index * 16 + 16),
    );
    return matrix;
  }

  /** Stores an instance transform and invalidates instance bounds. */
  setMatrixAt(index: number, matrix: Matrix4): this {
    assertInstanceIndex(index, this.#capacity, "setMatrixAt");
    this.#instanceMatrix.set(matrix.elements, index * 16);
    this.boundingBox = undefined;
    this.boundingSphere = undefined;
    return this;
  }

  /** Reads an active instance color, returning white when no color buffer exists. */
  getColorAt<T extends ColorLike>(index: number, color: T): T {
    assertInstanceIndex(index, this.#count, "getColorAt");
    if (this.#instanceColor === undefined) {
      color.r = 1;
      color.g = 1;
      color.b = 1;
      return color;
    }
    const offset = index * 3;
    color.r = this.#instanceColor[offset] ?? 1;
    color.g = this.#instanceColor[offset + 1] ?? 1;
    color.b = this.#instanceColor[offset + 2] ?? 1;
    return color;
  }

  /** Stores an instance color and returns this mesh for chaining. */
  setColorAt(index: number, color: ColorLike): this {
    assertInstanceIndex(index, this.#capacity, "setColorAt");
    if (this.#instanceColor === undefined) {
      this.#instanceColor = new Float32Array(this.#capacity * 3).fill(1);
    }
    const offset = index * 3;
    this.#instanceColor[offset] = color.r;
    this.#instanceColor[offset + 1] = color.g;
    this.#instanceColor[offset + 2] = color.b;
    return this;
  }

  /** Returns an independent copy with cloned mutable state. */
  override clone(): InstancedMesh {
    return new InstancedMesh(this.geometry, this.material, this.#capacity).copy(
      this,
    );
  }

  /** Copies instance transforms, colors, bounds, and inherited mesh state. */
  override copy(source: InstancedMesh, recursive: boolean = true): this {
    this.#capacity = source.#capacity;
    if (this.#instanceMatrix.length !== source.#instanceMatrix.length) {
      this.#instanceMatrix = new Float32Array(source.#instanceMatrix.length);
    }
    super.copy(source, recursive);
    this.#capacity = source.#capacity;
    this.#count = source.#count;
    this.#instanceMatrix = source.#instanceMatrix.slice();
    this.#instanceColor = source.#instanceColor?.slice();
    this.boundingBox = source.boundingBox?.clone();
    this.boundingSphere = source.boundingSphere?.clone();
    return this;
  }

  /** Releases transform, color, and computed-bound storage for all instances. */
  dispose(): void {
    this.#count = 0;
    this.#capacity = 0;
    this.#instanceMatrix = new Float32Array(0);
    this.#instanceColor = undefined;
    this.boundingBox = undefined;
    this.boundingSphere = undefined;
  }
}

function assertInstanceIndex(
  index: number,
  count: number,
  operation: string,
): void {
  if (!Number.isSafeInteger(index) || index < 0 || index >= count) {
    throw new RangeError(
      `InstancedMesh.${operation}: index must be an integer from 0 through ${Math.max(0, count - 1)}.`,
    );
  }
}
