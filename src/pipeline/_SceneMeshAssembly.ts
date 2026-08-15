import { Shading, Side } from "../core/Constants.ts";
import type { Node } from "../core/Node.ts";
import type { Material } from "../materials/Material.ts";
import type { Matrix4 } from "../math/Matrix4.ts";
import { DrawCall } from "./DrawCall.ts";
import { TriangleBuffer } from "./TriangleBuffer.ts";
import {
  type CameraLike,
  type FogState,
  type GeometryLike,
  type IndexArray,
  type SceneNode,
  VERT_STRIDE,
  _emptyNormals,
  _emptyUvs,
  _emptyVertexColors,
  _emptyViewDepths,
  _emptyWorldPositions,
  _mvp,
  _viewWorld,
  _vp,
  fogOpacityAt,
  sliceDrawRange,
} from "./_SceneTraversalShared.ts";

/** Mutable fog and bounding-sphere state shared while assembling mesh draw calls. */
export interface MeshAssemblyState extends FogState {
  /** World-space bounding-sphere center cached by scene traversal on the x axis. */
  lastBsCenterX: number;
  /** World-space bounding-sphere center cached by scene traversal on the y axis. */
  lastBsCenterY: number;
  /** World-space bounding-sphere center cached by scene traversal on the z axis. */
  lastBsCenterZ: number;
}

/** Optional timing hooks for measuring mesh projection and primitive assembly. */
export interface Profiler {
  /** Returns the current timestamp used to measure a pipeline phase. */
  now: () => number;
  /** Receives the elapsed time spent projecting mesh vertices. */
  onProject: (dt: number) => void;
  /** Receives the elapsed time spent assembling mesh primitives. */
  onAssemble: (dt: number) => void;
}

type MeshNode = SceneNode & {
  matrixWorld: Matrix4;
  geometry: GeometryLike;
  material: Material;
};
type TriangleNode = {
  _triangleBuffer?: TriangleBuffer;
  [key: string]: unknown;
};
type BuildDrawCallArgs = [
  state: MeshAssemblyState,
  node: MeshNode,
  camera: CameraLike,
  width: number,
  height: number,
  profiler?: Profiler | undefined,
];
type PointArgs = [
  state: MeshAssemblyState,
  indices: ArrayLike<number>,
  verts: Float32Array,
  viewDepths: Float32Array,
  width: number,
  height: number,
  node: TriangleNode,
];
type TriangleArgs = [
  state: MeshAssemblyState,
  indices: ArrayLike<number>,
  verts: Float32Array,
  viewDepths: Float32Array,
  worldNormals: Float32Array,
  uvs: Float32Array,
  width: number,
  height: number,
  material: Material,
  node: TriangleNode,
];

function measure<T>(
  profiler: Profiler | undefined,
  work: () => T,
  done: (dt: number) => void,
): T {
  if (!profiler) return work();
  const start = profiler.now();
  const result = work();
  done(profiler.now() - start);
  return result;
}

function materialHasTexture(material: Material): boolean {
  return Boolean(
    (material as unknown as { map?: { data?: unknown } }).map?.data,
  );
}

function updateDrawCall(node: MeshNode, state: MeshAssemblyState): DrawCall {
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
  return drawCall;
}

function drawIndices(geometry: GeometryLike, count: number): IndexArray {
  const index = geometry.index;
  if (index) {
    return ((index as { array: ArrayLike<number> }).array ??
      index) as IndexArray;
  }
  if (
    !geometry._sequentialIndices ||
    geometry._sequentialIndices.length !== count
  ) {
    geometry._sequentialIndices = Uint32Array.from(
      { length: count },
      (_, i) => i,
    );
  }
  return geometry._sequentialIndices;
}

interface AssemblyInput {
  state: MeshAssemblyState;
  drawCall: DrawCall;
  faceIndices: IndexArray;
  viewDepths: Float32Array;
  width: number;
  height: number;
  node: MeshNode;
  isPoints: boolean;
  isUnlit: boolean;
  hasTexture: boolean;
}

function assembleGeometry(input: AssemblyInput): TriangleBuffer {
  const { state, drawCall, faceIndices, viewDepths, width, height, node } =
    input;
  if (input.isPoints) {
    return assemblePoints(
      state,
      faceIndices,
      drawCall.projectedVerts,
      viewDepths,
      width,
      height,
      node,
    );
  }
  const normals = input.isUnlit ? _emptyNormals : buildWorldNormals(node);
  const uvs = input.hasTexture ? buildUvs(node) : _emptyUvs;
  return assembleTriangles(
    state,
    faceIndices,
    drawCall.projectedVerts,
    viewDepths,
    normals,
    uvs,
    width,
    height,
    node.material,
    node,
  );
}

/** Projects a mesh and assembles its indexed geometry into a reusable draw call. */
export function buildDrawCall(...args: BuildDrawCallArgs): DrawCall {
  const [state, node, camera, width, height, profiler] = args;
  const drawCall = updateDrawCall(node, state);
  drawCall.primitive = "triangles";
  drawCall.lines = undefined;
  _mvp.copy(_vp).multiply(node.matrixWorld);

  const material = node.material as Material & {
    points?: boolean;
    type?: string;
  };
  const isPoints = material.points === true;
  const isUnlit =
    material.type === "BasicMaterial" || material.type === "PointsMaterial";
  const viewWorld =
    state.hasFog && state.fogLut
      ? _viewWorld.copy(camera.matrixWorldInverse).multiply(node.matrixWorld)
      : undefined;
  const viewDepths = measure(
    profiler,
    () => projectVertices(node, drawCall, !isUnlit, viewWorld),
    (dt) => profiler?.onProject(dt),
  );

  const colorAttr = node.geometry.getAttribute("color");
  if (
    material.vertexColors !== false &&
    colorAttr?.itemSize === 3 &&
    colorAttr.array.length === drawCall.vertCount * 3
  ) {
    drawCall.vertexColorData = colorAttr.array;
    drawCall.vertexColorItemSize = 3;
  } else {
    drawCall.vertexColorData = _emptyVertexColors;
    drawCall.vertexColorItemSize = 0;
  }

  const faceIndices = sliceDrawRange(
    drawIndices(node.geometry, drawCall.vertCount),
    node.geometry.drawRange,
  );
  drawCall.faceIndices = faceIndices;
  drawCall.triangles = measure(
    profiler,
    () =>
      assembleGeometry({
        state,
        drawCall,
        faceIndices,
        viewDepths,
        width,
        height,
        node,
        isPoints,
        isUnlit,
        hasTexture: materialHasTexture(node.material),
      }),
    (dt) => profiler?.onAssemble(dt),
  );
  return drawCall;
}

interface ProjectionContext {
  arr: ArrayLike<number>;
  itemSize: number;
  matrix: ArrayLike<number>;
  projected: Float32Array;
  view: ArrayLike<number> | undefined;
  depths: Float32Array;
  world: Float32Array | undefined;
  worldMatrix: ArrayLike<number> | undefined;
}

function projectVertex(context: ProjectionContext, index: number): void {
  const { arr, itemSize, matrix, projected, view, depths, world, worldMatrix } =
    context;
  const lx = arr[index * itemSize];
  const ly = arr[index * itemSize + 1];
  const lz = arr[index * itemSize + 2];
  const px = matrix[0] * lx + matrix[4] * ly + matrix[8] * lz + matrix[12];
  const py = matrix[1] * lx + matrix[5] * ly + matrix[9] * lz + matrix[13];
  const pz = matrix[2] * lx + matrix[6] * ly + matrix[10] * lz + matrix[14];
  const pw = matrix[3] * lx + matrix[7] * ly + matrix[11] * lz + matrix[15];
  const base = index * VERT_STRIDE;
  const inverseW = 1 / pw;
  projected[base] = px * inverseW;
  projected[base + 1] = py * inverseW;
  projected[base + 2] = pz * inverseW;
  projected[base + 3] = pw;
  if (view) {
    const viewZ = view[2] * lx + view[6] * ly + view[10] * lz + view[14];
    depths[index] = viewZ < 0 ? -viewZ : 0;
  }
  if (world && worldMatrix) {
    const worldBase = index * 3;
    world[worldBase] =
      worldMatrix[0] * lx +
      worldMatrix[4] * ly +
      worldMatrix[8] * lz +
      worldMatrix[12];
    world[worldBase + 1] =
      worldMatrix[1] * lx +
      worldMatrix[5] * ly +
      worldMatrix[9] * lz +
      worldMatrix[13];
    world[worldBase + 2] =
      worldMatrix[2] * lx +
      worldMatrix[6] * ly +
      worldMatrix[10] * lz +
      worldMatrix[14];
  }
}

function resizedArray(
  value: Float32Array | undefined,
  length: number,
): Float32Array {
  return value?.length === length ? value : new Float32Array(length);
}

/**
 * Projects local-space vertex positions to NDC and world space.
 */
export function projectVertices(
  node: SceneNode & { matrixWorld: Matrix4; geometry: GeometryLike },
  drawCall: DrawCall,
  writeWorldPositions: boolean,
  viewWorld: Matrix4 | undefined,
): Float32Array {
  const posAttr = node.geometry.getAttribute("position");
  if (!posAttr) return _emptyViewDepths;
  const arr = posAttr.array;
  const itemSize = posAttr.itemSize ?? 3;
  const count = arr.length / itemSize;
  const projected = resizedArray(node._projectedVerts, count * VERT_STRIDE);
  node._projectedVerts = projected;
  drawCall.projectedVerts = projected;
  drawCall.vertCount = count;

  const view = viewWorld?.elements;
  const depths = view
    ? resizedArray(node._viewDepths, count)
    : _emptyViewDepths;
  if (view) node._viewDepths = depths;
  const world = writeWorldPositions
    ? resizedArray(node._worldPositions, count * 3)
    : _emptyWorldPositions;
  if (writeWorldPositions) node._worldPositions = world;
  drawCall.worldPositions = world;

  const context: ProjectionContext = {
    arr,
    itemSize,
    matrix: _mvp.elements,
    projected,
    view,
    depths,
    world: writeWorldPositions ? world : undefined,
    worldMatrix: writeWorldPositions ? node.matrixWorld.elements : undefined,
  };
  for (let i = 0; i < count; i++) projectVertex(context, i);
  return depths;
}

function normalKeyMatches(
  key: Float32Array | undefined,
  matrix: ArrayLike<number>,
): boolean {
  return Boolean(
    key &&
      key[0] === matrix[0] &&
      key[1] === matrix[1] &&
      key[2] === matrix[2] &&
      key[3] === matrix[4] &&
      key[4] === matrix[5] &&
      key[5] === matrix[6] &&
      key[6] === matrix[8] &&
      key[7] === matrix[9] &&
      key[8] === matrix[10],
  );
}

function writeNormalKey(key: Float32Array, matrix: ArrayLike<number>): void {
  key[0] = matrix[0];
  key[1] = matrix[1];
  key[2] = matrix[2];
  key[3] = matrix[4];
  key[4] = matrix[5];
  key[5] = matrix[6];
  key[6] = matrix[8];
  key[7] = matrix[9];
  key[8] = matrix[10];
}

/**
 * Caches world normals on the geometry keyed by the 3x3 rotation submatrix.
 */
export function buildWorldNormals(
  node: SceneNode & { matrixWorld: Matrix4; geometry: GeometryLike },
): Float32Array {
  const normalAttr = node.geometry.getAttribute("normal");
  if (!normalAttr) return _emptyNormals;
  const values = normalAttr.array;
  const itemSize = normalAttr.itemSize ?? 3;
  const count = values.length / itemSize;
  const matrix = node.matrixWorld.elements;
  if (
    node._worldNormalCache &&
    normalKeyMatches(node._worldNormalCacheKey, matrix)
  ) {
    return node._worldNormalCache;
  }
  if (node._worldNormalCacheKey) {
    writeNormalKey(node._worldNormalCacheKey, matrix);
  } else {
    node._worldNormalCacheKey = new Float32Array([
      matrix[0],
      matrix[1],
      matrix[2],
      matrix[4],
      matrix[5],
      matrix[6],
      matrix[8],
      matrix[9],
      matrix[10],
    ]);
  }

  const result = resizedArray(node._worldNormalCache, count * 3);
  node._worldNormalCache = result;
  for (let i = 0; i < count; i++) {
    const nx = values[i * itemSize];
    const ny = values[i * itemSize + 1];
    const nz = values[i * itemSize + 2];
    const x = matrix[0] * nx + matrix[4] * ny + matrix[8] * nz;
    const y = matrix[1] * nx + matrix[5] * ny + matrix[9] * nz;
    const z = matrix[2] * nx + matrix[6] * ny + matrix[10] * nz;
    const length = Math.sqrt(x * x + y * y + z * z) || 1;
    result[i * 3] = x / length;
    result[i * 3 + 1] = y / length;
    result[i * 3 + 2] = z / length;
  }
  return result;
}

/** Caches the UV buffer on the geometry since UVs are intrinsic and never change. */
export function buildUvs(
  node: SceneNode | { geometry: GeometryLike },
): Float32Array {
  const geometry = (node as { geometry: GeometryLike }).geometry;
  if (geometry._uvCache) return geometry._uvCache;
  const uvAttr = geometry.getAttribute("uv");
  if (!uvAttr) return _emptyUvs;
  const values = uvAttr.array;
  const itemSize = uvAttr.itemSize ?? 2;
  const result = new Float32Array((values.length / itemSize) * 2);
  for (let i = 0; i < values.length / itemSize; i++) {
    result[i * 2] = values[i * itemSize];
    result[i * 2 + 1] = values[i * itemSize + 1];
  }
  geometry._uvCache = result;
  return result;
}

function triangleBuffer(node: TriangleNode, capacity: number): TriangleBuffer {
  let buffer = node._triangleBuffer;
  if (!buffer) {
    buffer = new TriangleBuffer(capacity || 64);
    node._triangleBuffer = buffer;
  }
  return buffer;
}

interface PointContext {
  state: MeshAssemblyState;
  verts: Float32Array;
  depths: Float32Array;
  halfW: number;
  halfH: number;
  hasFog: boolean;
  buffer: TriangleBuffer;
  out: number;
  maxVi: number;
  triZ: number;
  lastSlot: number;
  lastZ: number;
  lastFog: number;
  lastVi: number;
}

function appendPoint(context: PointContext, vi: number): void {
  const { verts, buffer } = context;
  const base = vi * VERT_STRIDE;
  const point = context.out % 3;
  const tri = (context.out / 3) | 0;
  const slot = tri * 3 + point;
  if (point === 0) {
    context.triZ = 0;
    buffer.faceNormalX[tri] = 0;
    buffer.faceNormalY[tri] = 1;
    buffer.faceNormalZ[tri] = 0;
  }
  const x = verts[base];
  const y = verts[base + 1];
  const z = verts[base + 2];
  buffer.screenX[slot] = ((x + 1) * context.halfW + 0.5) | 0;
  buffer.screenY[slot] = ((1 - y) * context.halfH + 0.5) | 0;
  buffer.ndcZ[slot] = z;
  buffer.vertNormalX[slot] = 0;
  buffer.vertNormalY[slot] = 1;
  buffer.vertNormalZ[slot] = 0;
  const fog =
    context.hasFog && context.depths.length > vi
      ? fogOpacityAt(context.state, context.depths[vi])
      : 0;
  if (context.hasFog) buffer.fogFactor[slot] = fog;
  buffer.vertexIndex[slot] = vi;
  context.maxVi = Math.max(context.maxVi, vi);
  context.triZ += z;
  if (point === 2) buffer.centroidZ[tri] = context.triZ * 0.3333333333333333;
  context.lastSlot = slot;
  context.lastZ = z;
  context.lastFog = fog;
  context.lastVi = vi;
  context.out++;
}

function copyPoint(context: PointContext, target: number): void {
  const { buffer } = context;
  buffer.screenX[target] = buffer.screenX[context.lastSlot];
  buffer.screenY[target] = buffer.screenY[context.lastSlot];
  buffer.ndcZ[target] = context.lastZ;
  buffer.vertNormalX[target] = 0;
  buffer.vertNormalY[target] = 1;
  buffer.vertNormalZ[target] = 0;
  if (context.hasFog) buffer.fogFactor[target] = context.lastFog;
  buffer.vertexIndex[target] = context.lastVi;
  context.triZ += context.lastZ;
}

function padPoints(context: PointContext): void {
  if (context.out === 0 || context.out % 3 === 0) return;
  const tri = ((context.out - 1) / 3) | 0;
  const remainder = context.out % 3;
  for (let slot = tri * 3 + remainder; slot < tri * 3 + 3; slot++) {
    copyPoint(context, slot);
  }
  context.buffer.centroidZ[tri] = context.triZ * 0.3333333333333333;
}

/** Converts projected point indices into padded triangle-buffer records for rasterization. */
export function assemblePoints(...args: PointArgs): TriangleBuffer {
  const [state, indices, verts, viewDepths, width, height, node] = args;
  const buffer = triangleBuffer(node, Math.ceil(indices.length / 3));
  buffer.reset();
  buffer.ensureCapacity(Math.ceil(indices.length / 3));
  const context: PointContext = {
    state,
    verts,
    depths: viewDepths,
    halfW: width * 0.5,
    halfH: height * 0.5,
    hasFog: state.hasFog,
    buffer,
    out: 0,
    maxVi: 0,
    triZ: 0,
    lastSlot: 0,
    lastZ: 0,
    lastFog: 0,
    lastVi: 0,
  };
  for (let i = 0; i < indices.length; i++) {
    const vi = indices[i];
    if (verts[vi * VERT_STRIDE + 3] > 0) appendPoint(context, vi);
  }
  padPoints(context);
  buffer.length = Math.ceil(context.out / 3);
  buffer.maxVertexIndex = context.maxVi;
  return buffer;
}

interface TriangleContext {
  state: MeshAssemblyState;
  indices: ArrayLike<number>;
  verts: Float32Array;
  depths: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  buffer: TriangleBuffer;
  side: number;
  halfW: number;
  halfH: number;
  fog: boolean;
  flat: boolean;
  texture: boolean;
  normalLength: number;
  uvLength: number;
  out: number;
  maxVi: number;
  ff0: number;
  ff1: number;
  ff2: number;
  fnx: number;
  fny: number;
  fnz: number;
  vn0x: number;
  vn0y: number;
  vn0z: number;
  vn1x: number;
  vn1y: number;
  vn1z: number;
  vn2x: number;
  vn2y: number;
  vn2z: number;
}

function visibleTriangle(side: number, cross: number): boolean {
  if (side === Side.Front) return cross < 0;
  if (side === Side.Back) return cross > 0;
  return true;
}

function setTriangleFog(
  context: TriangleContext,
  i0: number,
  i1: number,
  i2: number,
): void {
  context.ff0 = 0;
  context.ff1 = 0;
  context.ff2 = 0;
  if (
    context.fog &&
    context.depths.length > i0 &&
    context.depths.length > i1 &&
    context.depths.length > i2
  ) {
    context.ff0 = fogOpacityAt(context.state, context.depths[i0]);
    context.ff1 = fogOpacityAt(context.state, context.depths[i1]);
    context.ff2 = fogOpacityAt(context.state, context.depths[i2]);
  }
}

function setTriangleNormals(
  context: TriangleContext,
  i0: number,
  i1: number,
  i2: number,
): void {
  context.fnx = 0;
  context.fny = 1;
  context.fnz = 0;
  if (context.flat && context.normalLength > 0) {
    const a = i0 * 3;
    const b = i1 * 3;
    const c = i2 * 3;
    const x =
      (context.normals[a] + context.normals[b] + context.normals[c]) / 3;
    const y =
      (context.normals[a + 1] +
        context.normals[b + 1] +
        context.normals[c + 1]) /
      3;
    const z =
      (context.normals[a + 2] +
        context.normals[b + 2] +
        context.normals[c + 2]) /
      3;
    const length = Math.sqrt(x * x + y * y + z * z) || 1;
    context.fnx = x / length;
    context.fny = y / length;
    context.fnz = z / length;
  }
  if (context.normalLength === 0) {
    context.vn0x = context.fnx;
    context.vn0y = context.fny;
    context.vn0z = context.fnz;
    context.vn1x = context.fnx;
    context.vn1y = context.fny;
    context.vn1z = context.fnz;
    context.vn2x = context.fnx;
    context.vn2y = context.fny;
    context.vn2z = context.fnz;
    return;
  }
  const a = i0 * 3;
  const b = i1 * 3;
  const c = i2 * 3;
  context.vn0x = context.normals[a];
  context.vn0y = context.normals[a + 1];
  context.vn0z = context.normals[a + 2];
  context.vn1x = context.normals[b];
  context.vn1y = context.normals[b + 1];
  context.vn1z = context.normals[b + 2];
  context.vn2x = context.normals[c];
  context.vn2y = context.normals[c + 1];
  context.vn2z = context.normals[c + 2];
}

function setTriangleUvs(
  context: TriangleContext,
  i0: number,
  i1: number,
  i2: number,
  offset: number,
): void {
  if (!context.texture) return;
  if (context.uvLength === 0) {
    context.buffer.uvU[offset] = 0;
    context.buffer.uvV[offset] = 0;
    context.buffer.uvU[offset + 1] = 0;
    context.buffer.uvV[offset + 1] = 0;
    context.buffer.uvU[offset + 2] = 0;
    context.buffer.uvV[offset + 2] = 0;
    return;
  }
  const a = i0 * 2;
  const b = i1 * 2;
  const c = i2 * 2;
  context.buffer.uvU[offset] = context.uvs[a];
  context.buffer.uvV[offset] = context.uvs[a + 1];
  context.buffer.uvU[offset + 1] = context.uvs[b];
  context.buffer.uvV[offset + 1] = context.uvs[b + 1];
  context.buffer.uvU[offset + 2] = context.uvs[c];
  context.buffer.uvV[offset + 2] = context.uvs[c + 1];
}

function appendTriangle(
  context: TriangleContext,
  i0: number,
  i1: number,
  i2: number,
): void {
  const { verts, buffer } = context;
  const b0 = i0 * VERT_STRIDE;
  const b1 = i1 * VERT_STRIDE;
  const b2 = i2 * VERT_STRIDE;
  if (verts[b0 + 3] <= 0 || verts[b1 + 3] <= 0 || verts[b2 + 3] <= 0) return;
  const x0 = verts[b0];
  const y0 = verts[b0 + 1];
  const x1 = verts[b1];
  const y1 = verts[b1 + 1];
  const x2 = verts[b2];
  const y2 = verts[b2 + 1];
  const sx0 = (x0 + 1) * context.halfW;
  const sy0 = (1 - y0) * context.halfH;
  const sx1 = (x1 + 1) * context.halfW;
  const sy1 = (1 - y1) * context.halfH;
  const sx2 = (x2 + 1) * context.halfW;
  const sy2 = (1 - y2) * context.halfH;
  const cross = (sx1 - sx0) * (sy2 - sy0) - (sy1 - sy0) * (sx2 - sx0);
  if (cross === 0 || !visibleTriangle(context.side, cross)) return;
  setTriangleFog(context, i0, i1, i2);
  setTriangleNormals(context, i0, i1, i2);
  const z0 = verts[b0 + 2];
  const z1 = verts[b1 + 2];
  const z2 = verts[b2 + 2];
  const offset = context.out * 3;
  buffer.screenX[offset] = sx0;
  buffer.screenX[offset + 1] = sx1;
  buffer.screenX[offset + 2] = sx2;
  buffer.screenY[offset] = sy0;
  buffer.screenY[offset + 1] = sy1;
  buffer.screenY[offset + 2] = sy2;
  buffer.ndcZ[offset] = z0;
  buffer.ndcZ[offset + 1] = z1;
  buffer.ndcZ[offset + 2] = z2;
  buffer.faceNormalX[context.out] = context.fnx;
  buffer.faceNormalY[context.out] = context.fny;
  buffer.faceNormalZ[context.out] = context.fnz;
  buffer.vertNormalX[offset] = context.vn0x;
  buffer.vertNormalX[offset + 1] = context.vn1x;
  buffer.vertNormalX[offset + 2] = context.vn2x;
  buffer.vertNormalY[offset] = context.vn0y;
  buffer.vertNormalY[offset + 1] = context.vn1y;
  buffer.vertNormalY[offset + 2] = context.vn2y;
  buffer.vertNormalZ[offset] = context.vn0z;
  buffer.vertNormalZ[offset + 1] = context.vn1z;
  buffer.vertNormalZ[offset + 2] = context.vn2z;
  setTriangleUvs(context, i0, i1, i2, offset);
  if (context.fog) {
    buffer.fogFactor[offset] = context.ff0;
    buffer.fogFactor[offset + 1] = context.ff1;
    buffer.fogFactor[offset + 2] = context.ff2;
  }
  buffer.vertexIndex[offset] = i0;
  buffer.vertexIndex[offset + 1] = i1;
  buffer.vertexIndex[offset + 2] = i2;
  context.maxVi = Math.max(context.maxVi, i0, i1, i2);
  buffer.centroidZ[context.out] = (z0 + z1 + z2) * 0.3333333333333333;
  context.out++;
}

/** Converts visible indexed triangles into screen-space records for rasterization. */
export function assembleTriangles(...args: TriangleArgs): TriangleBuffer {
  const [
    state,
    indices,
    verts,
    viewDepths,
    worldNormals,
    uvs,
    width,
    height,
    material,
    node,
  ] = args;
  const buffer = triangleBuffer(node, Math.floor(indices.length / 3));
  buffer.reset();
  buffer.ensureCapacity(Math.floor(indices.length / 3));
  const context: TriangleContext = {
    state,
    indices,
    verts,
    depths: viewDepths,
    normals: worldNormals,
    uvs,
    buffer,
    side: material.side,
    halfW: width * 0.5,
    halfH: height * 0.5,
    fog: state.hasFog,
    flat: material.shading === Shading.Flat,
    texture: materialHasTexture(material),
    normalLength: worldNormals.length,
    uvLength: uvs.length,
    out: 0,
    maxVi: 0,
    ff0: 0,
    ff1: 0,
    ff2: 0,
    fnx: 0,
    fny: 1,
    fnz: 0,
    vn0x: 0,
    vn0y: 1,
    vn0z: 0,
    vn1x: 0,
    vn1y: 1,
    vn1z: 0,
    vn2x: 0,
    vn2y: 1,
    vn2z: 0,
  };
  for (let t = 0; t < Math.floor(indices.length / 3); t++) {
    appendTriangle(
      context,
      indices[t * 3],
      indices[t * 3 + 1],
      indices[t * 3 + 2],
    );
  }
  buffer.length = context.out;
  buffer.maxVertexIndex = context.maxVi;
  return buffer;
}
