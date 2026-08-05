import type { Node } from "../core/Node.ts";
import type { Material } from "../materials/Material.ts";
import { Vector3 } from "../math/Vector3.ts";
import type { LineBuffer } from "./LineBuffer.ts";

/** World-space centroid used to order draw calls by tile distance. */
export interface Centroid {
  /** World-space centroid X coordinate used for tile sorting. */
  x: number;
  /** World-space centroid Y coordinate used for tile sorting. */
  y: number;
  /** World-space centroid Z coordinate used for tile sorting. */
  z: number;
}

const _pos = new Vector3();

/** Single visible-object draw operation with material, depth, and projected vertex data. */
export class DrawCall {
  /** Source mesh instance represented by this draw call. */
  mesh: Node;

  /** Internal primitive discriminator; lines never enter the triangle path. */
  primitive: "triangles" | "lines" = "triangles";

  /**
   * Flat Float32Array of projected vertex data, stride 4.
   * Layout per vertex: [x, y, z, w] (NDC xyz, clip-space w).
   */
  projectedVerts: Float32Array = new Float32Array(0);

  /** Number of vertices referenced by this draw call. */
  vertCount: number = 0;

  /** Material state used when rasterizing this draw call. */
  material: Material;

  /** Per-instance red multiplier prepared once per draw call. */
  instanceColorR: number = 1;

  /** Per-instance green multiplier prepared once per draw call. */
  instanceColorG: number = 1;

  /** Per-instance blue multiplier prepared once per draw call. */
  instanceColorB: number = 1;

  /** Triangle index data into the geometry vertex arrays. */
  faceIndices: number[] | Uint16Array | Uint32Array = [];

  /** World-space centroid used for tile-distance sorting. */
  centroid: Centroid = { x: 0, y: 0, z: 0 };

  /** Reusable projected triangle storage for this draw call. */
  triangles: unknown = undefined;

  /** Reusable CPU segment storage for line primitives. */
  lines: LineBuffer | undefined;

  /** Optional raw clip-space cache used while clipping line endpoints. */
  clipVerts: Float32Array = new Float32Array(0);

  /** Projected world-space positions for the draw-call vertices. */
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
  vertexColorItemSize: number = 0;

  /** Stride into shadedColorData: 3 for flat, 9 for gouraud, 0 when unset. */
  shadedColorStride: number = 0;

  /** Manhattan tile distance from the active camera. */
  tileDistance: number = 0;

  /** Constructs reusable draw-call storage for one visible object. */
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
