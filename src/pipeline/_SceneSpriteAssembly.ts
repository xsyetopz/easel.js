import type { Node } from "../core/Node.ts";
import type { Material } from "../materials/Material.ts";
import type { Frustum } from "../math/Frustum.ts";
import type { Matrix4 } from "../math/Matrix4.ts";
import type { Vector3 } from "../math/Vector3.ts";
import {
  type SpriteQuadFrame,
  spriteRotation,
  writeSpriteQuadFrame,
} from "../objects/_SpriteQuad.ts";
import type { BoundingSphereState } from "./_SceneFrustumCulling.ts";
import {
  assembleTriangles,
  type MeshAssemblyState,
} from "./_SceneMeshAssembly.ts";
import {
  _bsCenter,
  _emptyNormals,
  _emptyVertexColors,
  _emptyViewDepths,
  _emptyWorldPositions,
  _vp,
  type CameraLike,
  type SceneNode,
  VERT_STRIDE,
} from "./_SceneTraversalShared.ts";
import { DrawCall } from "./DrawCall.ts";

/** Scene-node fields required to assemble a camera-facing sprite quad. */
export type SpriteNode = SceneNode & {
  matrixWorld: Matrix4;
  material: Material;
  center: { x: number; y: number };
};

// Quad corners in normalized sprite space, wound counter-clockwise like the
// three.js sprite geometry so `Side.Front` keeps them.
const QUAD_U = [0, 1, 1, 0] as const;
const QUAD_V = [0, 0, 1, 1] as const;
const QUAD_INDICES = new Uint16Array([0, 1, 2, 0, 2, 3]);
// The CPU sampler reads image rows top-first without a flipY pass, so the top
// edge samples v = 0, matching PlaneGeometry and the upright three.js result.
const QUAD_UVS = new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]);

const _frame: SpriteQuadFrame = {
  rightX: 0,
  rightY: 0,
  rightZ: 0,
  upX: 0,
  upY: 0,
  upZ: 0,
};
const _cameraRight = { x: 1, y: 0, z: 0 };
const _cameraUp = { x: 0, y: 1, z: 0 };

/**
 * Records a sprite's world-space bounding sphere and tests it against the frustum.
 * The radius covers the anchored quad under any view-axis rotation.
 */
export function isSpriteFrustumCulled(
  node: SpriteNode,
  frustum: Frustum,
  sphereScratch: { centre: Vector3; radius: number },
  state: BoundingSphereState,
): boolean {
  const me = node.matrixWorld.elements;
  const scaleX = Math.sqrt(me[0] * me[0] + me[1] * me[1] + me[2] * me[2]);
  const scaleY = Math.sqrt(me[4] * me[4] + me[5] * me[5] + me[6] * me[6]);
  const cx = node.center.x;
  const cy = node.center.y;
  const extentX = scaleX * Math.max(Math.abs(cx), Math.abs(1 - cx));
  const extentY = scaleY * Math.max(Math.abs(cy), Math.abs(1 - cy));
  const radius = Math.sqrt(extentX * extentX + extentY * extentY);
  state.centerX = me[12];
  state.centerY = me[13];
  state.centerZ = me[14];
  state.worldRadius = radius;
  if (node.frustumCulled === false) return false;
  _bsCenter.x = me[12];
  _bsCenter.y = me[13];
  _bsCenter.z = me[14];
  sphereScratch.centre = _bsCenter;
  sphereScratch.radius = radius;
  return !frustum.intersectsSphere(sphereScratch);
}

function updateSpriteDrawCall(
  node: SpriteNode,
  state: MeshAssemblyState,
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
  drawCall.vertCount = 4;
  drawCall.faceIndices = QUAD_INDICES;
  drawCall.worldPositions = _emptyWorldPositions;
  drawCall.vertexColorData = _emptyVertexColors;
  drawCall.vertexColorItemSize = 0;
  return drawCall;
}

function readCameraAxes(camera: CameraLike): void {
  // Rows of the world-to-camera rotation are the camera's world-space axes.
  const v = camera.matrixWorldInverse.elements;
  const rightLength = Math.sqrt(v[0] * v[0] + v[4] * v[4] + v[8] * v[8]) || 1;
  const upLength = Math.sqrt(v[1] * v[1] + v[5] * v[5] + v[9] * v[9]) || 1;
  _cameraRight.x = v[0] / rightLength;
  _cameraRight.y = v[4] / rightLength;
  _cameraRight.z = v[8] / rightLength;
  _cameraUp.x = v[1] / upLength;
  _cameraUp.y = v[5] / upLength;
  _cameraUp.z = v[9] / upLength;
}

function writeViewDepths(
  node: SpriteNode,
  state: MeshAssemblyState,
  camera: CameraLike,
): Float32Array {
  if (!(state.hasFog && state.fogLut)) return _emptyViewDepths;
  const v = camera.matrixWorldInverse.elements;
  const me = node.matrixWorld.elements;
  // The quad lies in a view-aligned plane, so every corner shares one depth.
  const viewZ = v[2] * me[12] + v[6] * me[13] + v[10] * me[14] + v[14];
  const depth = viewZ < 0 ? -viewZ : 0;
  let depths = node._viewDepths;
  if (depths?.length !== 4) {
    depths = new Float32Array(4);
    node._viewDepths = depths;
  }
  depths.fill(depth);
  return depths;
}

/**
 * Projects a sprite's camera-facing quad and assembles its two triangles into
 * a reusable draw call for the existing flat and unlit-texture fillers.
 */
export function buildSpriteDrawCall(
  state: MeshAssemblyState,
  node: SpriteNode,
  camera: CameraLike,
  width: number,
  height: number,
): DrawCall {
  const drawCall = updateSpriteDrawCall(node, state);
  let projected = node._projectedVerts;
  if (projected?.length !== 4 * VERT_STRIDE) {
    projected = new Float32Array(4 * VERT_STRIDE);
    node._projectedVerts = projected;
  }
  drawCall.projectedVerts = projected;

  readCameraAxes(camera);
  const me = node.matrixWorld.elements;
  const frame = writeSpriteQuadFrame(
    _frame,
    me,
    _cameraRight,
    _cameraUp,
    spriteRotation(node.material),
  );
  const m = _vp.elements;
  const cx = node.center.x;
  const cy = node.center.y;
  for (let i = 0; i < 4; i++) {
    const du = QUAD_U[i] - cx;
    const dv = QUAD_V[i] - cy;
    const x = me[12] + frame.rightX * du + frame.upX * dv;
    const y = me[13] + frame.rightY * du + frame.upY * dv;
    const z = me[14] + frame.rightZ * du + frame.upZ * dv;
    const px = m[0] * x + m[4] * y + m[8] * z + m[12];
    const py = m[1] * x + m[5] * y + m[9] * z + m[13];
    const pz = m[2] * x + m[6] * y + m[10] * z + m[14];
    const pw = m[3] * x + m[7] * y + m[11] * z + m[15];
    const inverseW = 1 / pw;
    const base = i * VERT_STRIDE;
    projected[base] = px * inverseW;
    projected[base + 1] = py * inverseW;
    projected[base + 2] = pz * inverseW;
    projected[base + 3] = pw;
  }

  drawCall.triangles = assembleTriangles(
    state,
    QUAD_INDICES,
    projected,
    writeViewDepths(node, state, camera),
    _emptyNormals,
    QUAD_UVS,
    width,
    height,
    node.material,
    node,
  );
  return drawCall;
}
