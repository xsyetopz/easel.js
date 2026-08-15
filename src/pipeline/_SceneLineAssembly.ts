import type { Node } from "../core/Node.ts";
import type { Material } from "../materials/Material.ts";
import type { Matrix4 } from "../math/Matrix4.ts";
import { LineLoop } from "../objects/LineLoop.ts";
import { LineSegments } from "../objects/LineSegments.ts";
import { DrawCall } from "./DrawCall.ts";
import { LineBuffer } from "./LineBuffer.ts";
import {
  type CameraLike,
  type FogState,
  type GeometryLike,
  type IndexArray,
  type SceneNode,
  VERT_STRIDE,
  _emptyClipVerts,
  _emptyProjectedVerts,
  _emptyShadedColors,
  _emptyVertexColors,
  _emptyViewDepths,
  _emptyWorldPositions,
  _mvp,
  _viewWorld,
  _vp,
  fogOpacityAt,
  sliceDrawRange,
} from "./_SceneTraversalShared.ts";

/** Mutable state reused while projecting and clipping line primitives. */
export interface LineAssemblyState extends FogState {
  /** Lower interpolation bound of the line currently being clipped. */
  clipLower: number;
  /** Upper interpolation bound of the line currently being clipped. */
  clipUpper: number;
  /** X coordinate of the node's latest bounding-sphere center. */
  lastBsCenterX: number;
  /** Y coordinate of the node's latest bounding-sphere center. */
  lastBsCenterY: number;
  /** Z coordinate of the node's latest bounding-sphere center. */
  lastBsCenterZ: number;
}

/** Builds or updates a draw call containing projected line segments. */
export function buildLineDrawCall(
  state: LineAssemblyState,
  node: SceneNode & {
    matrixWorld: Matrix4;
    geometry: GeometryLike;
    material: Material;
  },
  camera: CameraLike,
  width: number,
  height: number,
): DrawCall {
  let drawCall = node._drawCall;
  if (drawCall) {
    drawCall.mesh = node as unknown as Node;
    drawCall.material = node.material;
    drawCall.centroid.x = state.lastBsCenterX;
    drawCall.centroid.y = state.lastBsCenterY;
    drawCall.centroid.z = state.lastBsCenterZ;
  } else {
    drawCall = new DrawCall(
      node as unknown as Node,
      node.material,
      state.lastBsCenterX,
      state.lastBsCenterY,
      state.lastBsCenterZ,
    );
    node._drawCall = drawCall;
  }

  drawCall.primitive = "lines";
  drawCall.triangles = undefined;
  drawCall.shadedColorData = _emptyShadedColors;
  drawCall.shadedColorStride = 0;
  drawCall.worldPositions = _emptyWorldPositions;

  _mvp.copy(_vp).multiply(node.matrixWorld);
  const viewWorld =
    state.hasFog && state.fogLut
      ? _viewWorld.copy(camera.matrixWorldInverse).multiply(node.matrixWorld)
      : undefined;
  const viewDepths = projectLineVertices(node, drawCall, viewWorld);

  const colorAttr = node.geometry.getAttribute("color");
  if (
    node.material.vertexColors !== false &&
    colorAttr?.itemSize === 3 &&
    colorAttr.array.length === drawCall.vertCount * 3
  ) {
    drawCall.vertexColorData = colorAttr.array;
    drawCall.vertexColorItemSize = 3;
  } else {
    drawCall.vertexColorData = _emptyVertexColors;
    drawCall.vertexColorItemSize = 0;
  }

  const index = node.geometry.index;
  let faceIndices: IndexArray;
  if (index) {
    faceIndices = ((index as { array: ArrayLike<number> }).array ?? index) as
      | number[]
      | Uint16Array
      | Uint32Array;
  } else {
    if (
      !node.geometry._sequentialIndices ||
      node.geometry._sequentialIndices.length !== drawCall.vertCount
    ) {
      node.geometry._sequentialIndices = Uint32Array.from(
        { length: drawCall.vertCount },
        (_, i) => i,
      );
    }
    faceIndices = node.geometry._sequentialIndices;
  }
  drawCall.faceIndices = sliceDrawRange(faceIndices, node.geometry.drawRange);

  let lineBuffer = node._lineBuffer;
  if (!lineBuffer) {
    lineBuffer = new LineBuffer(
      Math.max(0, Math.floor(drawCall.faceIndices.length / 2)),
    );
    node._lineBuffer = lineBuffer;
  }
  lineBuffer.reset();
  const estimatedSegments =
    node instanceof LineSegments
      ? Math.floor(drawCall.faceIndices.length / 2)
      : Math.max(0, drawCall.faceIndices.length);
  lineBuffer.ensureCapacity(estimatedSegments);

  const indices = drawCall.faceIndices;
  const isLineSegments = node instanceof LineSegments;

  if (isLineSegments) {
    for (let i = 0; i + 1 < indices.length; i += 2) {
      appendIndexedLineSegment(
        state,
        lineBuffer,
        drawCall.clipVerts,
        viewDepths,
        indices[i],
        indices[i + 1],
        drawCall.vertCount,
        width,
        height,
        false,
      );
    }
  } else {
    for (let i = 0; i + 1 < indices.length; i++) {
      appendIndexedLineSegment(
        state,
        lineBuffer,
        drawCall.clipVerts,
        viewDepths,
        indices[i],
        indices[i + 1],
        drawCall.vertCount,
        width,
        height,
        i > 0,
      );
    }
    if (node instanceof LineLoop && indices.length >= 2) {
      const lastIndex = indices.at(-1);
      if (lastIndex !== undefined) {
        appendIndexedLineSegment(
          state,
          lineBuffer,
          drawCall.clipVerts,
          viewDepths,
          lastIndex,
          indices[0],
          drawCall.vertCount,
          width,
          height,
          true,
        );
      }
    }
  }

  drawCall.lines = lineBuffer;
  return drawCall;
}

function appendIndexedLineSegment(
  state: LineAssemblyState,
  lineBuffer: LineBuffer,
  clipVerts: Float32Array,
  viewDepths: Float32Array,
  vertex0: number,
  vertex1: number,
  vertexCount: number,
  width: number,
  height: number,
  continuesPrevious: boolean,
): void {
  if (
    !(
      isValidLineIndex(vertex0, vertexCount) &&
      isValidLineIndex(vertex1, vertexCount)
    )
  ) {
    return;
  }
  appendLineSegment(
    state,
    lineBuffer,
    clipVerts,
    viewDepths,
    vertex0,
    vertex1,
    width,
    height,
    continuesPrevious,
  );
}

function projectLineVertices(
  node: SceneNode & { matrixWorld: Matrix4; geometry: GeometryLike },
  drawCall: DrawCall,
  viewWorld: Matrix4 | undefined,
): Float32Array {
  const posAttr = node.geometry.getAttribute("position");
  if (!posAttr) {
    drawCall.projectedVerts = _emptyProjectedVerts;
    drawCall.clipVerts = _emptyClipVerts;
    drawCall.vertCount = 0;
    return _emptyViewDepths;
  }

  const arr = posAttr.array;
  const itemSize = posAttr.itemSize ?? 3;
  const count = Math.floor(arr.length / itemSize);
  const needed = count * VERT_STRIDE;
  let clip = node._lineClipVerts;
  if (!clip || clip.length !== needed) {
    clip = new Float32Array(needed);
    node._lineClipVerts = clip;
  }
  drawCall.projectedVerts = _emptyProjectedVerts;
  drawCall.clipVerts = clip;
  drawCall.vertCount = count;

  let viewDepths: Float32Array = _emptyViewDepths;
  const viewElements = viewWorld?.elements;
  if (viewElements) {
    let cached = node._viewDepths;
    if (!cached || cached.length !== count) {
      cached = new Float32Array(count);
      node._viewDepths = cached;
    }
    viewDepths = cached;
  }

  const me = _mvp.elements;
  for (let i = 0; i < count; i++) {
    const lx = arr[i * itemSize];
    const ly = arr[i * itemSize + 1];
    const lz = arr[i * itemSize + 2];
    const cx = me[0] * lx + me[4] * ly + me[8] * lz + me[12];
    const cy = me[1] * lx + me[5] * ly + me[9] * lz + me[13];
    const cz = me[2] * lx + me[6] * ly + me[10] * lz + me[14];
    const cw = me[3] * lx + me[7] * ly + me[11] * lz + me[15];
    const cb = i * VERT_STRIDE;
    clip[cb] = cx;
    clip[cb + 1] = cy;
    clip[cb + 2] = cz;
    clip[cb + 3] = cw;
    if (viewElements) {
      const viewZ =
        viewElements[2] * lx +
        viewElements[6] * ly +
        viewElements[10] * lz +
        viewElements[14];
      viewDepths[i] = viewZ < 0 ? -viewZ : 0;
    }
  }
  return viewDepths;
}

function appendLineSegment(
  state: LineAssemblyState,
  lineBuffer: LineBuffer,
  clipVerts: Float32Array,
  viewDepths: Float32Array,
  vertex0: number,
  vertex1: number,
  width: number,
  height: number,
  continuesPrevious: boolean,
): void {
  const b0 = vertex0 * VERT_STRIDE;
  const b1 = vertex1 * VERT_STRIDE;
  const x0 = clipVerts[b0];
  const y0 = clipVerts[b0 + 1];
  const z0 = clipVerts[b0 + 2];
  const w0 = clipVerts[b0 + 3];
  const x1 = clipVerts[b1];
  const y1 = clipVerts[b1 + 1];
  const z1 = clipVerts[b1 + 2];
  const w1 = clipVerts[b1 + 3];
  if (
    !(
      Number.isFinite(x0) &&
      Number.isFinite(y0) &&
      Number.isFinite(z0) &&
      Number.isFinite(w0) &&
      Number.isFinite(x1) &&
      Number.isFinite(y1) &&
      Number.isFinite(z1) &&
      Number.isFinite(w1)
    )
  ) {
    return;
  }

  const epsilon = 1e-7;
  state.clipLower = 0;
  state.clipUpper = 1;
  if (!clipPlane(state, x0 + w0, x1 + w1)) return;
  if (!clipPlane(state, -x0 + w0, -x1 + w1)) return;
  if (!clipPlane(state, y0 + w0, y1 + w1)) return;
  if (!clipPlane(state, -y0 + w0, -y1 + w1)) return;
  if (!clipPlane(state, z0 + w0, z1 + w1)) return;
  if (!clipPlane(state, -z0 + w0, -z1 + w1)) return;
  if (!clipPlane(state, w0 - epsilon, w1 - epsilon)) return;

  const lower = state.clipLower;
  const upper = state.clipUpper;

  const c0x = x0 + (x1 - x0) * lower;
  const c0y = y0 + (y1 - y0) * lower;
  const c0z = z0 + (z1 - z0) * lower;
  const c0w = w0 + (w1 - w0) * lower;
  const c1x = x0 + (x1 - x0) * upper;
  const c1y = y0 + (y1 - y0) * upper;
  const c1z = z0 + (z1 - z0) * upper;
  const c1w = w0 + (w1 - w0) * upper;
  if (c0w <= epsilon || c1w <= epsilon) return;
  const n0x = c0x / c0w;
  const n0y = c0y / c0w;
  const n0z = c0z / c0w;
  const n1x = c1x / c1w;
  const n1y = c1y / c1w;
  const n1z = c1z / c1w;
  if (
    !(
      Number.isFinite(n0x) &&
      Number.isFinite(n0y) &&
      Number.isFinite(n0z) &&
      Number.isFinite(n1x) &&
      Number.isFinite(n1y) &&
      Number.isFinite(n1z)
    )
  ) {
    return;
  }

  const sx0 = pixelX(n0x, width);
  const sy0 = pixelY(n0y, height);
  const sx1 = pixelX(n1x, width);
  const sy1 = pixelY(n1y, height);
  let dashPhase = 0;
  if (w0 !== 0 && w1 !== 0) {
    const rawNdcX0 = x0 / w0;
    const rawNdcY0 = y0 / w0;
    const rawScreenX0 = unboundedPixelX(rawNdcX0, width);
    const rawScreenY0 = unboundedPixelY(rawNdcY0, height);
    if (
      Number.isFinite(rawScreenX0) &&
      Number.isFinite(rawScreenY0) &&
      lower > 0
    ) {
      dashPhase = Math.max(
        Math.abs(sx0 - rawScreenX0),
        Math.abs(sy0 - rawScreenY0),
      );
    }
  }
  const fog0 =
    viewDepths.length > vertex0 ? fogOpacityAt(state, viewDepths[vertex0]) : 0;
  const fog1 =
    viewDepths.length > vertex1 ? fogOpacityAt(state, viewDepths[vertex1]) : 0;
  lineBuffer.append(
    sx0,
    sy0,
    sx1,
    sy1,
    n0z,
    n1z,
    fog0 + (fog1 - fog0) * lower,
    fog0 + (fog1 - fog0) * upper,
    vertex0,
    vertex1,
    lower,
    upper,
    dashPhase,
    continuesPrevious,
  );
}

/** Clips one homogeneous half-space without allocating a plane tuple. */
function clipPlane(state: LineAssemblyState, f0: number, f1: number): boolean {
  if (f0 < 0 && f1 < 0) return false;
  if (f0 < 0 || f1 < 0) {
    const t = f0 / (f0 - f1);
    if (f0 < 0) state.clipLower = Math.max(state.clipLower, t);
    else state.clipUpper = Math.min(state.clipUpper, t);
  }
  return state.clipLower <= state.clipUpper;
}

function isValidLineIndex(value: number, vertexCount: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < vertexCount;
}

function pixelX(ndc: number, width: number): number {
  const value = Math.round((ndc + 1) * 0.5 * (width - 1));
  if (value < 0) return 0;
  if (value >= width) return width - 1;
  return value;
}

function pixelY(ndc: number, height: number): number {
  const value = Math.round((1 - ndc) * 0.5 * (height - 1));
  if (value < 0) return 0;
  if (value >= height) return height - 1;
  return value;
}

function unboundedPixelX(ndc: number, width: number): number {
  return Math.round((ndc + 1) * 0.5 * (width - 1));
}

function unboundedPixelY(ndc: number, height: number): number {
  return Math.round((1 - ndc) * 0.5 * (height - 1));
}
