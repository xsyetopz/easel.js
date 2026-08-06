import type { Material } from "../materials/Material.ts";
import { Frustum } from "../math/Frustum.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Vector3 } from "../math/Vector3.ts";
import { DrawCall } from "./DrawCall.ts";
import { LineBuffer } from "./LineBuffer.ts";
import { TriangleBuffer } from "./TriangleBuffer.ts";

// Scratch matrices reused across traversal calls.
export const _mvp = new Matrix4();
export const _vp = new Matrix4();
export const _viewWorld = new Matrix4();
export const _bsCenter = new Vector3();
export const _frustum = new Frustum();

// Empty typed arrays used as fallbacks.
export const _emptyNormals = new Float32Array(0);
export const _emptyProjectedVerts = new Float32Array(0);
export const _emptyClipVerts = new Float32Array(0);
export const _emptyShadedColors = new Float32Array(0);
export const _emptyUvs = new Float32Array(0);
export const _emptyVertexColors = new Float32Array(0);
export const _emptyWorldPositions = new Float32Array(0);
export const _emptyViewDepths = new Float32Array(0);
export const _emptyIndices = new Uint32Array(0);

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface AttributeLike {
  array: ArrayLike<number>;
  itemSize?: number;
}

export interface GeometryLike {
  boundingSphere?: { centre: Vector3; radius: number };
  getAttribute: (name: string) => AttributeLike | undefined;
  index?: { array: ArrayLike<number> } | ArrayLike<number>;
  drawRange?: { start: number; count: number };
  _sequentialIndices?: Uint32Array;
  _uvCache?: Float32Array;
}

export type IndexArray = number[] | Uint16Array | Uint32Array;

export interface SceneNode {
  type?: string;
  visible: boolean;
  children: SceneNode[];
  geometry?: GeometryLike;
  material?: Material;
  matrixWorld: Matrix4;
  frustumCulled?: boolean;
  _projectedVerts?: Float32Array;
  _viewDepths?: Float32Array;
  _worldPositions?: Float32Array;
  _worldNormalCache?: Float32Array;
  _worldNormalCacheKey?: Float32Array;
  _triangleBuffer?: TriangleBuffer;
  _drawCall?: DrawCall;
  _lineBuffer?: LineBuffer;
  _lineClipVerts?: Float32Array;
  [k: string]: unknown;
}

export interface CameraLike {
  matrixWorldInverse: Matrix4;
  projectionMatrix: Matrix4;
  position: Vec3;
}

export interface SceneLike {
  children: SceneNode[];
  visible: boolean;
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

export const VERT_STRIDE = 4;

export interface FogState {
  hasFog: boolean;
  fogLut: Float32Array | undefined;
  fogNear: number;
  fogFar: number;
  fogLutScale: number;
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
