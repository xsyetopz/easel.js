import { Shading, Side } from "../core/Constants.ts";
import type { Node } from "../core/Node.ts";
import type { Material } from "../materials/Material.ts";
import { Matrix4 } from "../math/Matrix4.ts";
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
  _emptyProjectedVerts,
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

export interface MeshAssemblyState extends FogState {
  lastBsCenterX: number;
  lastBsCenterY: number;
  lastBsCenterZ: number;
}

export interface Profiler {
  now: () => number;
  onProject: (dt: number) => void;
  onAssemble: (dt: number) => void;
}

export function buildDrawCall(
  state: MeshAssemblyState,
  node: SceneNode & {
    matrixWorld: Matrix4;
    geometry: GeometryLike;
    material: Material;
  },
  camera: CameraLike,
  width: number,
  height: number,
  profiler?: Profiler | undefined,
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

  drawCall.primitive = "triangles";
  drawCall.lines = undefined;

  _mvp.copy(_vp).multiply(node.matrixWorld);
  const material = node.material as Material & {
    map?: { data?: unknown };
    points?: boolean;
    type?: string;
  };
  const isPoints = material.points === true;
  const materialType = material.type;
  const isUnlit =
    materialType === "BasicMaterial" || materialType === "PointsMaterial";
  const hasTexture = !!material.map?.data;

  // Fog needs -viewZ; clip W is not a depth for orthographic projections.
  const viewWorld =
    state.hasFog && state.fogLut
      ? _viewWorld.copy(camera.matrixWorldInverse).multiply(node.matrixWorld)
      : undefined;

  let viewDepths: Float32Array;
  if (profiler) {
    const t0 = profiler.now();
    viewDepths = projectVertices(node, drawCall, !isUnlit, viewWorld);
    profiler.onProject(profiler.now() - t0);
  } else {
    viewDepths = projectVertices(node, drawCall, !isUnlit, viewWorld);
  }

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

  if (profiler) {
    const t0 = profiler.now();
    if (isPoints) {
      drawCall.triangles = assemblePoints(
        state,
        drawCall.faceIndices,
        drawCall.projectedVerts,
        viewDepths,
        width,
        height,
        node,
      );
    } else {
      const worldNormals = isUnlit ? _emptyNormals : buildWorldNormals(node);
      const uvs = hasTexture ? buildUvs(node) : _emptyUvs;
      drawCall.triangles = assembleTriangles(
        state,
        drawCall.faceIndices,
        drawCall.projectedVerts,
        viewDepths,
        worldNormals,
        uvs,
        width,
        height,
        node.material,
        node,
      );
    }
    profiler.onAssemble(profiler.now() - t0);
  } else if (isPoints) {
    drawCall.triangles = assemblePoints(
      state,
      drawCall.faceIndices,
      drawCall.projectedVerts,
      viewDepths,
      width,
      height,
      node,
    );
  } else {
    const worldNormals = isUnlit ? _emptyNormals : buildWorldNormals(node);
    const uvs = hasTexture ? buildUvs(node) : _emptyUvs;
    drawCall.triangles = assembleTriangles(
      state,
      drawCall.faceIndices,
      drawCall.projectedVerts,
      viewDepths,
      worldNormals,
      uvs,
      width,
      height,
      node.material,
      node,
    );
  }

  return drawCall;
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
  const me = _mvp.elements;
  const needed = count * VERT_STRIDE;
  let pv = node._projectedVerts;
  if (!pv || pv.length !== needed) {
    pv = new Float32Array(needed);
    node._projectedVerts = pv;
  }
  drawCall.projectedVerts = pv;
  drawCall.vertCount = count;

  const viewElements = viewWorld?.elements;
  let viewDepths: Float32Array<ArrayBufferLike> = _emptyViewDepths;
  if (viewElements) {
    let cached = node._viewDepths;
    if (!cached || cached.length !== count) {
      cached = new Float32Array(count);
      node._viewDepths = cached;
    }
    viewDepths = cached;
  }

  if (!writeWorldPositions) {
    drawCall.worldPositions = _emptyWorldPositions;
    for (let i = 0; i < count; i++) {
      const lx = arr[i * itemSize];
      const ly = arr[i * itemSize + 1];
      const lz = arr[i * itemSize + 2];

      const px = me[0] * lx + me[4] * ly + me[8] * lz + me[12];
      const py = me[1] * lx + me[5] * ly + me[9] * lz + me[13];
      const pz = me[2] * lx + me[6] * ly + me[10] * lz + me[14];
      const pw = me[3] * lx + me[7] * ly + me[11] * lz + me[15];
      const invW = 1 / pw;

      const base = i * VERT_STRIDE;
      pv[base] = px * invW;
      pv[base + 1] = py * invW;
      pv[base + 2] = pz * invW;
      pv[base + 3] = pw;
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

  const worldNeeded = count * 3;
  let wp = node._worldPositions;
  if (!wp || wp.length !== worldNeeded) {
    wp = new Float32Array(worldNeeded);
    node._worldPositions = wp;
  }
  drawCall.worldPositions = wp;

  const mw = node.matrixWorld.elements;
  for (let i = 0; i < count; i++) {
    const lx = arr[i * itemSize];
    const ly = arr[i * itemSize + 1];
    const lz = arr[i * itemSize + 2];

    const px = me[0] * lx + me[4] * ly + me[8] * lz + me[12];
    const py = me[1] * lx + me[5] * ly + me[9] * lz + me[13];
    const pz = me[2] * lx + me[6] * ly + me[10] * lz + me[14];
    const pw = me[3] * lx + me[7] * ly + me[11] * lz + me[15];
    const invW = 1 / pw;

    const base = i * VERT_STRIDE;
    pv[base] = px * invW;
    pv[base + 1] = py * invW;
    pv[base + 2] = pz * invW;
    pv[base + 3] = pw;
    if (viewElements) {
      const viewZ =
        viewElements[2] * lx +
        viewElements[6] * ly +
        viewElements[10] * lz +
        viewElements[14];
      viewDepths[i] = viewZ < 0 ? -viewZ : 0;
    }

    const wb = i * 3;
    wp[wb] = mw[0] * lx + mw[4] * ly + mw[8] * lz + mw[12];
    wp[wb + 1] = mw[1] * lx + mw[5] * ly + mw[9] * lz + mw[13];
    wp[wb + 2] = mw[2] * lx + mw[6] * ly + mw[10] * lz + mw[14];
  }
  return viewDepths;
}

/**
 * Caches world normals on the geometry keyed by the 3x3 rotation submatrix.
 */
export function buildWorldNormals(
  node: SceneNode & { matrixWorld: Matrix4; geometry: GeometryLike },
): Float32Array {
  const normAttr = node.geometry.getAttribute("normal");
  if (!normAttr) return _emptyNormals;

  const nArr = normAttr.array;
  const nSize = normAttr.itemSize ?? 3;
  const nCount = nArr.length / nSize;
  const m = node.matrixWorld.elements;

  if (node._worldNormalCache && node._worldNormalCacheKey) {
    const k = node._worldNormalCacheKey;
    if (
      k[0] === m[0] &&
      k[1] === m[1] &&
      k[2] === m[2] &&
      k[3] === m[4] &&
      k[4] === m[5] &&
      k[5] === m[6] &&
      k[6] === m[8] &&
      k[7] === m[9] &&
      k[8] === m[10]
    ) {
      return node._worldNormalCache;
    }
    k[0] = m[0];
    k[1] = m[1];
    k[2] = m[2];
    k[3] = m[4];
    k[4] = m[5];
    k[5] = m[6];
    k[6] = m[8];
    k[7] = m[9];
    k[8] = m[10];
  } else {
    node._worldNormalCacheKey = new Float32Array([
      m[0],
      m[1],
      m[2],
      m[4],
      m[5],
      m[6],
      m[8],
      m[9],
      m[10],
    ]);
  }

  let result = node._worldNormalCache;
  if (!result || result.length !== nCount * 3) {
    result = new Float32Array(nCount * 3);
    node._worldNormalCache = result;
  }

  for (let i = 0; i < nCount; i++) {
    const nx = nArr[i * nSize];
    const ny = nArr[i * nSize + 1];
    const nz = nArr[i * nSize + 2];
    const wx = m[0] * nx + m[4] * ny + m[8] * nz;
    const wy = m[1] * nx + m[5] * ny + m[9] * nz;
    const wz = m[2] * nx + m[6] * ny + m[10] * nz;
    const len = Math.sqrt(wx * wx + wy * wy + wz * wz) || 1;
    result[i * 3] = wx / len;
    result[i * 3 + 1] = wy / len;
    result[i * 3 + 2] = wz / len;
  }

  return result;
}

/** Caches the UV buffer on the geometry since UVs are intrinsic and never change. */
export function buildUvs(
  node: SceneNode | { geometry: GeometryLike },
): Float32Array {
  const geometry =
    (node as SceneNode).geometry ??
    (node as { geometry: GeometryLike }).geometry;
  if ((geometry as GeometryLike & { _uvCache?: Float32Array })._uvCache)
    return (geometry as GeometryLike & { _uvCache: Float32Array })._uvCache;

  const uvAttr = geometry.getAttribute("uv");
  if (!uvAttr) return _emptyUvs;

  const arr = uvAttr.array;
  const itemSize = uvAttr.itemSize ?? 2;
  const count = arr.length / itemSize;
  const result = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    result[i * 2] = arr[i * itemSize];
    result[i * 2 + 1] = arr[i * itemSize + 1];
  }
  (geometry as GeometryLike & { _uvCache: Float32Array })._uvCache = result;
  return result;
}

export function assemblePoints(
  state: MeshAssemblyState,
  indices: ArrayLike<number>,
  verts: Float32Array,
  viewDepths: Float32Array,
  width: number,
  height: number,
  node: { _triangleBuffer?: TriangleBuffer; [k: string]: unknown },
): TriangleBuffer {
  const pointCapacity = Math.ceil(indices.length / 3);
  let buf = node._triangleBuffer;
  if (!buf) {
    buf = new TriangleBuffer(pointCapacity || 64);
    node._triangleBuffer = buf;
  }
  buf.reset();
  buf.ensureCapacity(pointCapacity);

  const halfW = width * 0.5;
  const halfH = height * 0.5;
  const hasFog = state.hasFog;

  const screenX = buf.screenX;
  const screenY = buf.screenY;
  const ndcZ = buf.ndcZ;
  const faceNormalX = buf.faceNormalX;
  const faceNormalY = buf.faceNormalY;
  const faceNormalZ = buf.faceNormalZ;
  const vertNormalX = buf.vertNormalX;
  const vertNormalY = buf.vertNormalY;
  const vertNormalZ = buf.vertNormalZ;
  const fogFactor = buf.fogFactor;
  const vertexIndex = buf.vertexIndex;
  const centroidZ = buf.centroidZ;

  let outPoint = 0;
  let maxVi = 0;
  let triZ = 0;
  let lastSlot = 0;
  let lastZ = 0;
  let lastFog = 0;
  let lastVi = 0;

  let i = 0;
  while (i < indices.length) {
    const vi = indices[i];
    const b = vi * VERT_STRIDE;
    const w = verts[b + 3];
    if (w <= 0) {
      i++;
      continue;
    }

    const p = outPoint % 3;
    const tri = (outPoint / 3) | 0;
    const slot = tri * 3 + p;
    if (p === 0) {
      triZ = 0;
      faceNormalX[tri] = 0;
      faceNormalY[tri] = 1;
      faceNormalZ[tri] = 0;
    }

    const x = verts[b];
    const y = verts[b + 1];
    const z = verts[b + 2];
    screenX[slot] = ((x + 1) * halfW + 0.5) | 0;
    screenY[slot] = ((1 - y) * halfH + 0.5) | 0;
    ndcZ[slot] = z;
    vertNormalX[slot] = 0;
    vertNormalY[slot] = 1;
    vertNormalZ[slot] = 0;

    let ff = 0;
    if (hasFog && viewDepths.length > vi) {
      ff = fogOpacityAt(state, viewDepths[vi]);
    }
    if (hasFog) fogFactor[slot] = ff;

    vertexIndex[slot] = vi;
    if (vi > maxVi) maxVi = vi;
    triZ += z;
    if (p === 2) centroidZ[tri] = triZ * 0.3333333333333333;
    lastSlot = slot;
    lastZ = z;
    lastFog = ff;
    lastVi = vi;
    outPoint++;
    i++;
  }

  if (outPoint > 0) {
    const remainder = outPoint % 3;
    if (remainder !== 0) {
      const tri = ((outPoint - 1) / 3) | 0;
      let slot = tri * 3 + remainder;
      while (slot < tri * 3 + 3) {
        screenX[slot] = screenX[lastSlot];
        screenY[slot] = screenY[lastSlot];
        ndcZ[slot] = lastZ;
        vertNormalX[slot] = 0;
        vertNormalY[slot] = 1;
        vertNormalZ[slot] = 0;
        if (hasFog) fogFactor[slot] = lastFog;
        vertexIndex[slot] = lastVi;
        triZ += lastZ;
        slot++;
      }
      centroidZ[tri] = triZ * 0.3333333333333333;
    }
  }

  buf.length = Math.ceil(outPoint / 3);
  buf.maxVertexIndex = maxVi;
  return buf;
}

export function assembleTriangles(
  state: MeshAssemblyState,
  indices: ArrayLike<number>,
  verts: Float32Array,
  viewDepths: Float32Array,
  worldNormals: Float32Array,
  uvs: Float32Array,
  width: number,
  height: number,
  material: Material,
  node: { _triangleBuffer?: TriangleBuffer; [k: string]: unknown },
): TriangleBuffer {
  const triCount = Math.floor(indices.length / 3);
  const side = material.side;
  const isFlatShaded = material.shading === Shading.Flat;
  const hasTexture = !!(material as unknown as { map?: { data?: unknown } }).map
    ?.data;

  let buf = node._triangleBuffer;
  if (!buf) {
    buf = new TriangleBuffer(triCount || 64);
    node._triangleBuffer = buf;
  }
  buf.reset();
  buf.ensureCapacity(triCount);

  const halfW = width * 0.5;
  const halfH = height * 0.5;

  const hasFog = state.hasFog;
  const wnLen = worldNormals.length;
  const uvLen = uvs.length;

  const screenX = buf.screenX;
  const screenY = buf.screenY;
  const ndcZ = buf.ndcZ;
  const faceNormalX = buf.faceNormalX;
  const faceNormalY = buf.faceNormalY;
  const faceNormalZ = buf.faceNormalZ;
  const vertNormalX = buf.vertNormalX;
  const vertNormalY = buf.vertNormalY;
  const vertNormalZ = buf.vertNormalZ;
  const uvU = buf.uvU;
  const uvV = buf.uvV;
  const fogFactor = buf.fogFactor;
  const vertexIndex = buf.vertexIndex;
  const centroidZ = buf.centroidZ;

  let outLen = 0;
  let maxVi = 0;

  for (let t = 0; t < triCount; t++) {
    const i0 = indices[t * 3];
    const i1 = indices[t * 3 + 1];
    const i2 = indices[t * 3 + 2];

    const b0 = i0 * VERT_STRIDE;
    const b1 = i1 * VERT_STRIDE;
    const b2 = i2 * VERT_STRIDE;

    const w0 = verts[b0 + 3];
    const w1 = verts[b1 + 3];
    const w2 = verts[b2 + 3];

    if (w0 <= 0 || w1 <= 0 || w2 <= 0) continue;

    const x0 = verts[b0];
    const y0 = verts[b0 + 1];
    const x1 = verts[b1];
    const y1 = verts[b1 + 1];
    const x2 = verts[b2];
    const y2 = verts[b2 + 1];

    const sx0 = (x0 + 1) * halfW;
    const sy0 = (1 - y0) * halfH;
    const sx1 = (x1 + 1) * halfW;
    const sy1 = (1 - y1) * halfH;
    const sx2 = (x2 + 1) * halfW;
    const sy2 = (1 - y2) * halfH;

    const cross = (sx1 - sx0) * (sy2 - sy0) - (sy1 - sy0) * (sx2 - sx0);
    if (cross === 0) continue;
    if (side === Side.Front) {
      if (cross > 0) continue;
    } else if (side === Side.Back) {
      if (cross < 0) continue;
    }

    let ff0 = 0;
    let ff1 = 0;
    let ff2 = 0;
    if (
      hasFog &&
      viewDepths.length > i0 &&
      viewDepths.length > i1 &&
      viewDepths.length > i2
    ) {
      ff0 = fogOpacityAt(state, viewDepths[i0]);
      ff1 = fogOpacityAt(state, viewDepths[i1]);
      ff2 = fogOpacityAt(state, viewDepths[i2]);
    }

    let fnx = 0;
    let fny = 1;
    let fnz = 0;
    if (isFlatShaded && wnLen > 0) {
      const n0x = worldNormals[i0 * 3];
      const n0y = worldNormals[i0 * 3 + 1];
      const n0z = worldNormals[i0 * 3 + 2];
      const n1x = worldNormals[i1 * 3];
      const n1y = worldNormals[i1 * 3 + 1];
      const n1z = worldNormals[i1 * 3 + 2];
      const n2x = worldNormals[i2 * 3];
      const n2y = worldNormals[i2 * 3 + 1];
      const n2z = worldNormals[i2 * 3 + 2];
      const ax = (n0x + n1x + n2x) / 3;
      const ay = (n0y + n1y + n2y) / 3;
      const az = (n0z + n1z + n2z) / 3;
      const al = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
      fnx = ax / al;
      fny = ay / al;
      fnz = az / al;
    }

    const vn0b = i0 * 3;
    const vn0x = wnLen === 0 ? fnx : worldNormals[vn0b];
    const vn0y = wnLen === 0 ? fny : worldNormals[vn0b + 1];
    const vn0z = wnLen === 0 ? fnz : worldNormals[vn0b + 2];
    const vn1b = i1 * 3;
    const vn1x = wnLen === 0 ? fnx : worldNormals[vn1b];
    const vn1y = wnLen === 0 ? fny : worldNormals[vn1b + 1];
    const vn1z = wnLen === 0 ? fnz : worldNormals[vn1b + 2];
    const vn2b = i2 * 3;
    const vn2x = wnLen === 0 ? fnx : worldNormals[vn2b];
    const vn2y = wnLen === 0 ? fny : worldNormals[vn2b + 1];
    const vn2z = wnLen === 0 ? fnz : worldNormals[vn2b + 2];

    const z0 = verts[b0 + 2];
    const z1 = verts[b1 + 2];
    const z2 = verts[b2 + 2];

    const o = outLen;
    const o3 = o * 3;
    screenX[o3] = sx0;
    screenX[o3 + 1] = sx1;
    screenX[o3 + 2] = sx2;
    screenY[o3] = sy0;
    screenY[o3 + 1] = sy1;
    screenY[o3 + 2] = sy2;
    ndcZ[o3] = z0;
    ndcZ[o3 + 1] = z1;
    ndcZ[o3 + 2] = z2;

    faceNormalX[o] = fnx;
    faceNormalY[o] = fny;
    faceNormalZ[o] = fnz;

    vertNormalX[o3] = vn0x;
    vertNormalX[o3 + 1] = vn1x;
    vertNormalX[o3 + 2] = vn2x;
    vertNormalY[o3] = vn0y;
    vertNormalY[o3 + 1] = vn1y;
    vertNormalY[o3 + 2] = vn2y;
    vertNormalZ[o3] = vn0z;
    vertNormalZ[o3 + 1] = vn1z;
    vertNormalZ[o3 + 2] = vn2z;

    if (hasTexture) {
      if (uvLen > 0) {
        const uv0b = i0 * 2;
        const uv1b = i1 * 2;
        const uv2b = i2 * 2;
        uvU[o3] = uvs[uv0b];
        uvV[o3] = uvs[uv0b + 1];
        uvU[o3 + 1] = uvs[uv1b];
        uvV[o3 + 1] = uvs[uv1b + 1];
        uvU[o3 + 2] = uvs[uv2b];
        uvV[o3 + 2] = uvs[uv2b + 1];
      } else {
        uvU[o3] = 0;
        uvV[o3] = 0;
        uvU[o3 + 1] = 0;
        uvV[o3 + 1] = 0;
        uvU[o3 + 2] = 0;
        uvV[o3 + 2] = 0;
      }
    }

    if (hasFog) {
      fogFactor[o3] = ff0;
      fogFactor[o3 + 1] = ff1;
      fogFactor[o3 + 2] = ff2;
    }

    vertexIndex[o3] = i0;
    vertexIndex[o3 + 1] = i1;
    vertexIndex[o3 + 2] = i2;
    if (i0 > maxVi) maxVi = i0;
    if (i1 > maxVi) maxVi = i1;
    if (i2 > maxVi) maxVi = i2;

    centroidZ[o] = (z0 + z1 + z2) * 0.3333333333333333;
    outLen++;
  }

  buf.length = outLen;
  buf.maxVertexIndex = maxVi;
  return buf;
}
