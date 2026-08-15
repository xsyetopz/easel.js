import type { Node } from "../core/Node.ts";
import type { Matrix4 } from "../math/Matrix4.ts";
import { Mesh } from "../objects/Mesh.ts";
import { buildMesh as buildMeshData } from "./_VOXMeshing.ts";
import { buildVoxelVolume as buildVoxelVolumeData } from "./_VOXVoxelVolume.ts";
import { VOXLoader as VOXLoaderClass } from "./_VOXLoader.ts";

/** Loader class for MagicaVoxel VOX 150/200 assets and CPU scene data. */
export const VOXLoader: typeof VOXLoaderClass = VOXLoaderClass;

/** Integer dimensions of a MagicaVoxel model in source voxel coordinates. */
export interface VOXSize {
  /** Number of voxels along the source X axis. */
  readonly x: number;
  /** Number of voxels along the source Y axis. */
  readonly y: number;
  /** Number of voxels along the source Z axis. */
  readonly z: number;
}

/** Source translation stored by a VOX transform frame. */
export interface VOXTranslation {
  /** Source X translation. */
  readonly x: number;
  /** Source Y translation. */
  readonly y: number;
  /** Source Z translation. */
  readonly z: number;
}

/** One animation/static transform frame from an nTRN node. */
export interface VOXFrame {
  /** Rotation converted to the EASEL Y-up coordinate system. */
  readonly rotation: Matrix4 | undefined;
  /** Translation in VOX coordinates, before Y-up conversion. */
  readonly translation: VOXTranslation | undefined;
  /** Source frame attributes copied from the VOX dictionary. */
  readonly attributes: Readonly<Record<string, string>>;
}

/** CPU voxel model chunk decoded from a SIZE/XYZI pair. */
export interface VOXChunk {
  /** Model dimensions in source X/Y/Z order. */
  readonly size: VOXSize;
  /** Packed voxel records, four bytes per voxel: x, y, z, palette index. */
  readonly data: Uint8Array;
  /** Palette entries packed as 0xAABBGGRR, indexed by voxel color. */
  readonly palette: readonly number[];
}

/** Transform node in the CPU representation of a VOX scene graph. */
export interface VOXTransformNode {
  /** Node kind discriminator. */
  readonly type: "transform";
  /** Source node identifier. */
  readonly id: number;
  /** Source transform-node attributes. */
  readonly attributes: Readonly<Record<string, string>>;
  /** Child node identifier. */
  readonly childNodeId: number;
  /** Source layer identifier. */
  readonly layerId: number;
  /** Transform frames; the first frame is used for static CPU scenes. */
  readonly frames: readonly VOXFrame[];
}

/** Group node in the CPU representation of a VOX scene graph. */
export interface VOXGroupNode {
  /** Node kind discriminator. */
  readonly type: "group";
  /** Source node identifier. */
  readonly id: number;
  /** Source group-node attributes. */
  readonly attributes: Readonly<Record<string, string>>;
  /** Child node identifiers in source order. */
  readonly childIds: readonly number[];
}

/** Shape node in the CPU representation of a VOX scene graph. */
export interface VOXShapeNode {
  /** Node kind discriminator. */
  readonly type: "shape";
  /** Source node identifier. */
  readonly id: number;
  /** Source shape-node attributes. */
  readonly attributes: Readonly<Record<string, string>>;
  /** Model references and per-model attributes in source order. */
  readonly models: readonly VOXModelReference[];
}

/** One model reference stored by an nSHP shape node. */
export interface VOXModelReference {
  /** Zero-based model index into {@link VOXLoaderResult.chunks}. */
  readonly modelId: number;
  /** Source model attributes. */
  readonly attributes: Readonly<Record<string, string>>;
}

/** Union of supported VOX scene-graph node kinds. */
export type VOXNode = VOXTransformNode | VOXGroupNode | VOXShapeNode;

/** Parsed VOX asset with CPU chunks and an optional EASEL scene graph. */
export interface VOXLoaderResult {
  /** CPU voxel model chunks in source order. */
  readonly chunks: readonly VOXChunk[];
  /** Root EASEL node built from node id zero, or `null` when absent. */
  readonly scene: Node | null;
  /** Parsed scene-graph nodes keyed by source node id. */
  readonly nodes: Readonly<Record<number, VOXNode>>;
  /** Global palette applied to every decoded chunk. */
  readonly palette: readonly number[];
}

/** CPU occupancy and color volume derived from a VOX model chunk. */
export interface VOXVoxelVolume {
  /** Model dimensions in source X/Y/Z order. */
  readonly size: VOXSize;
  /** One byte per voxel: zero for empty, 255 for occupied. */
  readonly occupancy: Uint8Array;
  /** One byte palette index per voxel, or zero for empty. */
  readonly colors: Uint8Array;
  /** Palette used by the color-index volume. */
  readonly palette: readonly number[];
}

/** Builds a greedy-meshed CPU EASEL mesh from a decoded VOX chunk. */
export function buildMesh(chunk: VOXChunk): Mesh {
  return buildMeshData(chunk);
}

/** Builds an occupancy and color-index volume without creating a GPU texture. */
export function buildVoxelVolume(chunk: VOXChunk): VOXVoxelVolume {
  return buildVoxelVolumeData(chunk);
}

/** CPU compatibility wrapper matching THREE.VOXMesh without GPU resources.
 * @deprecated Use {@link buildMesh} when a named helper is preferable.
 */
export class VOXMesh extends Mesh {
  /** Constructs a mesh from one decoded VOX chunk. */
  constructor(chunk: VOXChunk) {
    const mesh = buildMesh(chunk);
    super(mesh.geometry, mesh.material);
  }
}
