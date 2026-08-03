import type { Node } from "../core/Node.ts";
import type { Material } from "../materials/Material.ts";
import { Vector3 } from "../math/Vector3.ts";

export interface Centroid {
  x: number;
  y: number;
  z: number;
}

const _pos = new Vector3();

/** Single polygon draw operation with material, depth, and vertex data. */
export class DrawCall {
  mesh: Node;

  /**
   * Flat Float32Array of projected vertex data, stride 4.
   * Layout per vertex: [x, y, z, w] (NDC xyz, clip-space w).
   */
  projectedVerts: Float32Array = new Float32Array(0);

  vertCount = 0;

  material: Material;

  faceIndices: number[] | Uint16Array | Uint32Array = [];

  centroid: Centroid = { x: 0, y: 0, z: 0 };

  triangles: unknown = undefined;

  worldPositions: Float32Array = new Float32Array(0);

  /**
   * Flat typed array for baked shading colors.
   * Flat shading: stride 3 (r,g,b per face). Gouraud: stride 9 (r,g,b x 3 vertices).
   */
  shadedColorData: Float32Array = new Float32Array(0);

  /**
   * Raw geometry RGB vertex colors. The array is shared with the geometry and
   * is never copied into the draw call or triangle buffer.
   */
  vertexColorData: ArrayLike<number> = [];

  /** Number of values between successive geometry vertex colors (3 for RGB). */
  vertexColorItemSize = 0;

  /** Stride into shadedColorData: 3 for flat, 9 for gouraud, 0 when unset. */
  shadedColorStride = 0;

  _tileDistance = 0;

  constructor(
    mesh: Node,
    material: Material,
    centroidX?: number,
    centroidY?: number,
    centroidZ?: number,
  ) {
    this.mesh = mesh;
    this.material = material;
    if (
      centroidX !== undefined &&
      centroidY !== undefined &&
      centroidZ !== undefined
    ) {
      this.centroid.x = centroidX;
      this.centroid.y = centroidY;
      this.centroid.z = centroidZ;
    } else {
      this.#computeCentroid();
    }
  }

  /**
   * Computes the draw call's centroid from the mesh's bounding sphere
   * center (world-space). Falls back to mesh origin when no bounding
   * sphere is available.
   */
  #computeCentroid(): void {
    const mesh = this.mesh as Node & {
      geometry?: { boundingSphere?: { centre: Vector3 } };
    };
    const bs = mesh.geometry?.boundingSphere;
    if (bs) {
      _pos.copy(bs.centre).applyMatrix4(this.mesh.matrixWorld);
    } else {
      _pos.setFromMatrixPosition(this.mesh.matrixWorld);
    }
    this.centroid.x = _pos.x;
    this.centroid.y = _pos.y;
    this.centroid.z = _pos.z;
  }
}
