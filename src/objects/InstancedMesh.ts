import type { Geometry } from "../geometry/Geometry.ts";
import type { Material } from "../materials/Material.ts";
import type { Matrix4 } from "../math/Matrix4.ts";
import { Mesh } from "./Mesh.ts";

interface ColorLike {
  r: number;
  g: number;
  b: number;
}

/** Mesh rendered multiple times with per-instance transforms. */
export class InstancedMesh extends Mesh {
  override type = "InstancedMesh";

  #count: number;

  #instanceMatrix: Float32Array;

  #instanceColor: Float32Array | undefined = undefined;

  override frustumCulled = true;

  constructor(
    geometry: Geometry | undefined = void 0,
    material: Material | undefined = void 0,
    count = 0,
  ) {
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

  get count(): number {
    return this.#count;
  }

  set count(value: number) {
    this.#count = value;
  }

  get instanceMatrix(): Float32Array {
    return this.#instanceMatrix;
  }

  get instanceColor(): Float32Array | undefined {
    return this.#instanceColor;
  }

  set instanceColor(value: Float32Array | undefined) {
    this.#instanceColor = value;
  }

  getMatrixAt(index: number, matrix: Matrix4): void {
    const offset = index * 16;
    const te = matrix.elements;
    for (let i = 0; i < 16; i++) {
      te[i] = this.#instanceMatrix[offset + i];
    }
  }

  setMatrixAt(index: number, matrix: Matrix4): void {
    const offset = index * 16;
    const te = matrix.elements;
    for (let i = 0; i < 16; i++) {
      this.#instanceMatrix[offset + i] = te[i];
    }
  }

  getColorAt(index: number, color: ColorLike): void {
    if (this.#instanceColor === undefined) return;
    const offset = index * 3;
    color.r = this.#instanceColor[offset + 0];
    color.g = this.#instanceColor[offset + 1];
    color.b = this.#instanceColor[offset + 2];
  }

  setColorAt(index: number, color: ColorLike): void {
    if (this.#instanceColor === undefined) {
      this.#instanceColor = new Float32Array(this.#count * 3);
    }
    const offset = index * 3;
    this.#instanceColor[offset + 0] = color.r;
    this.#instanceColor[offset + 1] = color.g;
    this.#instanceColor[offset + 2] = color.b;
  }

  override clone(): InstancedMesh {
    const cloned = new InstancedMesh(this.geometry, this.material, this.#count);
    cloned.copy(this);
    cloned.#instanceMatrix = this.#instanceMatrix.slice();
    if (this.#instanceColor !== undefined) {
      cloned.#instanceColor = this.#instanceColor.slice();
    }
    return cloned;
  }

  dispose(): void {
    this.#instanceMatrix = new Float32Array(0);
    this.#instanceColor = undefined;
  }
}
