import type { Material } from "../materials/Material.ts";
import { Frustum } from "../math/Frustum.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Vector3 } from "../math/Vector3.ts";
import type { DrawCall } from "./DrawCall.ts";
import type { LineBuffer } from "./LineBuffer.ts";
import type { TriangleBuffer } from "./TriangleBuffer.ts";

// Scratch matrices reused across traversal calls.
/** Model-view-projection matrix assembled for the current node. */
export const _mvp = new Matrix4();
/** Combined projection and camera-view matrix used for culling. */
export const _vp = new Matrix4();
/** World-to-camera matrix used to calculate camera-space depth. */
export const _viewWorld = new Matrix4();
/** Reusable world-space center for bounding-sphere calculations. */
export const _bsCenter = new Vector3();
/** Reusable camera frustum for scene-node visibility tests. */
export const _frustum = new Frustum();

// Empty typed arrays used as fallbacks.
/** Empty normal data used when a mesh has no normal attribute. */
export const _emptyNormals = new Float32Array(0);
/** Empty projected-vertex data used for unavailable geometry output. */
export const _emptyProjectedVerts = new Float32Array(0);
/** Empty homogeneous clipping data used when no clipped vertices exist. */
export const _emptyClipVerts = new Float32Array(0);
/** Empty shaded-color data used when lighting produces no vertex colors. */
export const _emptyShadedColors = new Float32Array(0);
/** Empty UV data used when a geometry has no texture coordinates. */
export const _emptyUvs = new Float32Array(0);
/** Empty vertex-color data used when per-vertex colors are unavailable. */
export const _emptyVertexColors = new Float32Array(0);
/** Empty world-position data used by unlit projection paths. */
export const _emptyWorldPositions = new Float32Array(0);
/** Empty view-depth data used when fog depth is not requested. */
export const _emptyViewDepths = new Float32Array(0);
/** Empty index data returned for draw ranges with no elements. */
export const _emptyIndices = new Uint32Array(0);

/** Cartesian three-component coordinates used by camera and lighting inputs. */
export interface Vec3 {
  /** Horizontal coordinate in the associated three-dimensional space. */
  x: number;
  /** Vertical coordinate in the associated three-dimensional space. */
  y: number;
  /** Depth coordinate in the associated three-dimensional space. */
  z: number;
}

/** Minimal typed-array attribute shape consumed by the traversal pipeline. */
export interface AttributeLike {
  /** Numeric storage containing the attribute's component values. */
  array: ArrayLike<number>;
  /** Number of components belonging to each attribute item. */
  itemSize?: number;
}

/** Minimal geometry contract shared by mesh and line assembly. */
export interface GeometryLike {
  /** Optional local-space sphere used for frustum and fog culling. */
  boundingSphere?: { centre: Vector3; radius: number };
  /** Looks up a named geometry attribute for projection or shading. */
  getAttribute: (name: string) => AttributeLike | undefined;
  /** Optional indexed geometry data in an attribute or direct array form. */
  index?: { array: ArrayLike<number> } | ArrayLike<number>;
  /** Optional subrange of index data selected for drawing. */
  drawRange?: { start: number; count: number };
  /** Cached sequential indices generated for non-indexed geometry. */
  _sequentialIndices?: Uint32Array;
  /** Cached two-component UV data prepared for texture assembly. */
  _uvCache?: Float32Array;
}

/** Array representations accepted for indexed draw-call assembly. */
export type IndexArray = number[] | Uint16Array | Uint32Array;

/** Scene-node fields required by traversal and draw-call assembly. */
export interface SceneNode {
  /** Runtime node type used to select mesh, line, point, or light handling. */
  type?: string;
  /** Whether traversal should visit this node and its descendants. */
  visible: boolean;
  /** Child nodes visited after the current node's own draw work. */
  children: SceneNode[];
  /** Geometry submitted for mesh, point, or line assembly. */
  geometry?: GeometryLike;
  /** Material that controls the node's shading and rasterization path. */
  material?: Material;
  /** World transform applied to the node's local geometry. */
  matrixWorld: Matrix4;
  /** Whether the node's bounding sphere participates in frustum culling. */
  frustumCulled?: boolean;
  /** Cached projected coordinates laid out with {@link VERT_STRIDE} components. */
  _projectedVerts?: Float32Array;
  /** Cached positive camera-space depths used by fog calculations. */
  _viewDepths?: Float32Array;
  /** Cached world-space positions used by lighting and assembly. */
  _worldPositions?: Float32Array;
  /** Cached normals transformed into world space. */
  _worldNormalCache?: Float32Array;
  /** Matrix components used to validate the cached world normals. */
  _worldNormalCacheKey?: Float32Array;
  /** Reusable triangle storage owned by the node's assembly path. */
  _triangleBuffer?: TriangleBuffer;
  /** Cached draw call updated for the node's next traversal. */
  _drawCall?: DrawCall;
  /** Reusable line storage owned by the node's line assembly path. */
  _lineBuffer?: LineBuffer;
  /** Cached homogeneous coordinates used while clipping line segments. */
  _lineClipVerts?: Float32Array;
  /** Additional runtime-specific fields carried by scene objects. */
  [k: string]: unknown;
}

/** Camera transform fields required to project and cull scene nodes. */
export interface CameraLike {
  /** Inverse world transform that converts coordinates into camera space. */
  matrixWorldInverse: Matrix4;
  /** Projection transform that converts camera coordinates to clip space. */
  projectionMatrix: Matrix4;
  /** Camera position used for distance-based fog culling. */
  position: Vec3;
}

/** Scene fields required by traversal for visibility and fog setup. */
export interface SceneLike {
  /** Root-level nodes visited by the traversal. */
  children: SceneNode[];
  /** Whether the scene root is eligible for traversal. */
  visible: boolean;
  /** Optional fog configuration and its prepared lookup table. */
  fog?:
    | {
        near: number;
        far: number;
        color: { r: number; g: number; b: number };
        lut: Float32Array;
        mode?: "linear" | "exponential-squared";
        lutNeedsUpdate?: boolean;
      }
    | undefined;
}

/** Number of packed values reserved for each projected vertex. */
export const VERT_STRIDE = 4;

/** Prepared fog parameters shared by mesh and line assembly. */
export interface FogState {
  /** Whether fog should be applied to assembled primitives. */
  hasFog: boolean;
  /** Prepared opacity lookup table, when fog is enabled. */
  fogLut: Float32Array | undefined;
  /** Near distance used by linear fog interpolation. */
  fogNear: number;
  /** Far distance defining the fog lookup domain. */
  fogFar: number;
  /** Multiplier converting fog depth into a 0-to-255 LUT coordinate. */
  fogLutScale: number;
  /** Formula used to interpret depth while sampling the fog LUT. */
  fogMode: "linear" | "exponential-squared";
}

/** Applies a three.js-style draw range without mutating geometry index data. */
export function sliceDrawRange(
  indices: IndexArray,
  drawRange: { start: number; count: number } | undefined,
): IndexArray {
  if (!drawRange) return indices;

  // WebGL clamps the draw interval to the available element count before
  // issuing the draw. Flooring at the final boundary keeps CPU indexing
  // deterministic for the fractional values that WebGL would coerce.
  const start = Math.max(0, drawRange.start);
  const end = Math.min(indices.length, start + drawRange.count);
  const drawCount = end - start;
  if (!(drawCount > 0)) return _emptyIndices;

  const first = Math.floor(start);
  const last = Math.min(indices.length, first + Math.floor(drawCount));
  if (last <= first) return _emptyIndices;
  if (first === 0 && last === indices.length) return indices;

  if (Array.isArray(indices)) return indices.slice(first, last);
  return indices.subarray(first, last);
}

/** Samples the prepared fog LUT for positive camera-space depth. */
export function fogOpacityAt(state: FogState, depth: number): number {
  const lut = state.fogLut;
  if (!lut) return 0;

  const index =
    state.fogMode === "exponential-squared"
      ? depth * state.fogLutScale
      : (depth - state.fogNear) * state.fogLutScale;
  if (index <= 0) return lut[0];
  if (index >= 255) return lut[255];

  const lower = Math.floor(index);
  const upper = lower + 1;
  const weight = index - lower;
  return lut[lower] + (lut[upper] - lut[lower]) * weight;
}
