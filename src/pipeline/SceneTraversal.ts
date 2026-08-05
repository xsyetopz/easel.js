import { LightType, Shading, Side } from "../core/Constants.ts";
import type { Node } from "../core/Node.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import type { Material } from "../materials/Material.ts";
import { Frustum } from "../math/Frustum.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import type { SphericalHarmonicsCoefficients } from "../math/SphericalHarmonics3.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Line } from "../objects/Line.ts";
import { LineLoop } from "../objects/LineLoop.ts";
import { LineSegments } from "../objects/LineSegments.ts";
import { DrawCall } from "./DrawCall.ts";
import { DrawList } from "./DrawList.ts";
import { buildInstancedDrawCalls } from "./InstancedMeshBuilder.ts";
import { LineBuffer } from "./LineBuffer.ts";
import { TriangleBuffer } from "./TriangleBuffer.ts";

const _mvp = new Matrix4();
const _vp = new Matrix4();
const _viewWorld = new Matrix4();
const _bsCenter = new Vector3();
const _frustum = new Frustum();
const _emptyNormals = new Float32Array(0);
const _emptyProjectedVerts = new Float32Array(0);
const _emptyClipVerts = new Float32Array(0);
const _emptyShadedColors = new Float32Array(0);
const _emptyUvs = new Float32Array(0);
const _emptyVertexColors = new Float32Array(0);
const _emptyWorldPositions = new Float32Array(0);
const _emptyViewDepths = new Float32Array(0);

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface AttributeLike {
  array: ArrayLike<number>;
  itemSize?: number;
}

interface GeometryLike {
  boundingSphere?: { centre: Vector3; radius: number };
  getAttribute: (name: string) => AttributeLike | undefined;
  index?: { array: ArrayLike<number> } | ArrayLike<number>;
  _sequentialIndices?: Uint32Array;
  _uvCache?: Float32Array;
}

interface SceneNode {
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

interface CameraLike {
  matrixWorldInverse: Matrix4;
  projectionMatrix: Matrix4;
  position: Vec3;
}

interface SceneLike {
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

const VERT_STRIDE = 4;

/** Walks the scene graph collecting visible draw calls. */
export class SceneTraversal {
  #fogNear = 0;
  #fogFar = 0;
  #fogLutScale = 0;
  #fogLut: Float32Array | undefined;
  #fogMode: "linear" | "exponential-squared" = "linear";
  #hasFog = false;

  // Scratch storage set by `#isFrustumCulled` so `#walk` can reuse
  // bounding sphere world center without recomputing it for fog checks.
  #lastBsCenterX = 0;
  #lastBsCenterY = 0;
  #lastBsCenterZ = 0;
  #lastBsWorldRadius = 0;

  #sphereScratch = { centre: _bsCenter, radius: 0 };

  // Scalar homogeneous clipping state reused for every line segment.
  #clipLower = 0;
  #clipUpper = 1;

  #drawList = new DrawList();

  /** Collects visible, frustum-culled draw calls and prepared lights for CPU rasterization. */
  traverse(
    scene: SceneLike,
    camera: CameraLike,
    width: number = 300,
    height: number = 150,
    timings?: {
      profileTraversal?: boolean;
      travUpdateWorldMs?: number;
      travWalkMs?: number;
      travProjectMs?: number;
      travAssembleMs?: number;
      travDrawCalls?: number;
    },
  ): DrawList {
    const perf = timings ? globalThis.performance : undefined;
    const now =
      timings && typeof perf?.now === "function"
        ? perf.now.bind(perf)
        : Date.now;
    const profile = !!timings?.profileTraversal;
    let projectMs = 0;
    let assembleMs = 0;

    const tUpdate0 = timings ? now() : 0;
    if (timings) timings.travUpdateWorldMs = now() - tUpdate0;

    const fog = scene.fog;
    if (fog?.lutNeedsUpdate) {
      throw new Error("Fog LUT is dirty; call updateLut() before traversal.");
    }
    this.#hasFog = !!fog;
    this.#fogNear = fog?.near ?? 0;
    this.#fogFar = fog?.far ?? 0;
    this.#fogMode = fog?.mode ?? "linear";
    this.#fogLut = fog?.lut;
    const fogLutDomain =
      this.#fogMode === "exponential-squared"
        ? this.#fogFar
        : this.#fogFar - this.#fogNear;
    this.#fogLutScale = fog && fogLutDomain > 0 ? 255 / fogLutDomain : 0;

    _vp.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_vp);

    const drawList = this.#drawList;
    drawList.clear();
    const tWalk0 = timings ? now() : 0;
    this.#walk(
      scene as unknown as SceneNode,
      drawList,
      camera,
      _frustum,
      width,
      height,
      profile
        ? {
            now,
            onProject: (dt: number) => {
              projectMs += dt;
            },
            onAssemble: (dt: number) => {
              assembleMs += dt;
            },
          }
        : undefined,
    );
    if (timings) timings.travWalkMs = now() - tWalk0;
    if (timings) timings.travDrawCalls = drawList.calls.length;
    if (timings && profile) {
      timings.travProjectMs = projectMs;
      timings.travAssembleMs = assembleMs;
    }

    return drawList;
  }

  #walk(
    node: SceneNode,
    drawList: DrawList,
    camera: CameraLike,
    frustum: Frustum,
    width: number,
    height: number,
    profiler?:
      | {
          now: () => number;
          onProject: (dt: number) => void;
          onAssemble: (dt: number) => void;
        }
      | undefined,
  ): void {
    if (!node.visible) return;
    const isLine =
      node instanceof Line && node.material instanceof LineMaterial;

    if (
      (node.type === "Mesh" || node.type === "Points" || isLine) &&
      node.geometry &&
      node.material
    ) {
      if (
        !this.#isFrustumCulled(
          node as SceneNode & {
            geometry: GeometryLike;
            matrixWorld: Matrix4;
          },
          frustum,
        )
      ) {
        // Cheap bounding-sphere fog check before vertex work.
        if (this.#hasFog && camera.position) {
          const dx = this.#lastBsCenterX - camera.position.x;
          const dy = this.#lastBsCenterY - camera.position.y;
          const dz = this.#lastBsCenterZ - camera.position.z;
          const distSq = dx * dx + dy * dy + dz * dz;
          const fogFarPlusRadius = this.#fogFar + this.#lastBsWorldRadius;
          if (distSq > fogFarPlusRadius * fogFarPlusRadius) {
            for (const child of node.children) {
              this.#walk(
                child,
                drawList,
                camera,
                frustum,
                width,
                height,
                profiler,
              );
            }
            return;
          }
        }

        {
          const dc = isLine
            ? this.#buildLineDrawCall(
                node as SceneNode & {
                  matrixWorld: Matrix4;
                  geometry: GeometryLike;
                  material: Material;
                },
                camera,
                width,
                height,
              )
            : this.#buildDrawCall(
                node as SceneNode & {
                  matrixWorld: Matrix4;
                  geometry: GeometryLike;
                  material: Material;
                },
                camera,
                width,
                height,
                profiler,
              );
          drawList.add(dc);
        }
      }
    } else if (
      node.type === "InstancedMesh" &&
      node.geometry &&
      node.material
    ) {
      buildInstancedDrawCalls(
        node as never,
        camera,
        frustum,
        width,
        height,
        drawList,
        {
          hasFog: this.#hasFog,
          fogFar: this.#fogFar,
          fogLut: this.#fogLut,
        },
        (a, b, c, d, e, f, g, h, i) =>
          this.#assembleTriangles(
            a,
            b,
            i ?? _emptyViewDepths,
            c,
            d,
            e,
            f,
            g,
            h,
          ),
        (() => {
          const hasTexture = !!(
            node.material as unknown as { map?: { data?: unknown } }
          ).map?.data;
          return hasTexture
            ? (n: unknown) => this.#buildUvs(n as SceneNode)
            : () => _emptyUvs;
        })(),
      );
    } else if (
      typeof node.type === "string" &&
      (node.type.endsWith("Light") || node.type === "LightProbe")
    ) {
      this.#collectLight(node, drawList);
    }

    for (const child of node.children) {
      this.#walk(child, drawList, camera, frustum, width, height, profiler);
    }
  }

  /**
   * Returns true if the node is outside the frustum and should be skipped.
   * As a side-effect, writes the bounding sphere world center and radius into
   * scratch fields so callers can reuse them for the fog distance check.
   */
  #isFrustumCulled(
    node: { geometry: GeometryLike; matrixWorld: Matrix4 },
    frustum: Frustum,
  ): boolean {
    const bs = node.geometry.boundingSphere;
    if (!bs) {
      const me = node.matrixWorld.elements;
      this.#lastBsCenterX = me[12];
      this.#lastBsCenterY = me[13];
      this.#lastBsCenterZ = me[14];
      this.#lastBsWorldRadius = 0;
      return false;
    }

    const me = node.matrixWorld.elements;
    const bsCenter = bs.centre;
    let worldCenter: Vector3;
    if (bsCenter.x === 0 && bsCenter.y === 0 && bsCenter.z === 0) {
      _bsCenter.x = me[12];
      _bsCenter.y = me[13];
      _bsCenter.z = me[14];
      worldCenter = _bsCenter;
    } else {
      worldCenter = _bsCenter.copy(bsCenter).applyMatrix4(node.matrixWorld);
    }
    const sx2 = me[0] * me[0] + me[1] * me[1] + me[2] * me[2];
    const sy2 = me[4] * me[4] + me[5] * me[5] + me[6] * me[6];
    const sz2 = me[8] * me[8] + me[9] * me[9] + me[10] * me[10];
    const worldRadius = bs.radius * Math.sqrt(Math.max(sx2, sy2, sz2));

    this.#lastBsCenterX = worldCenter.x;
    this.#lastBsCenterY = worldCenter.y;
    this.#lastBsCenterZ = worldCenter.z;
    this.#lastBsWorldRadius = worldRadius;

    this.#sphereScratch.radius = worldRadius;
    return !frustum.intersectsSphere(this.#sphereScratch);
  }

  #buildLineDrawCall(
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
      drawCall.centroid.x = this.#lastBsCenterX;
      drawCall.centroid.y = this.#lastBsCenterY;
      drawCall.centroid.z = this.#lastBsCenterZ;
    } else {
      drawCall = new DrawCall(
        node as unknown as Node,
        node.material,
        this.#lastBsCenterX,
        this.#lastBsCenterY,
        this.#lastBsCenterZ,
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
      this.#hasFog && this.#fogLut
        ? _viewWorld.copy(camera.matrixWorldInverse).multiply(node.matrixWorld)
        : undefined;
    const viewDepths = this.#projectLineVertices(node, drawCall, viewWorld);

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
    if (index) {
      drawCall.faceIndices = ((index as { array: ArrayLike<number> }).array ??
        index) as number[] | Uint16Array | Uint32Array;
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
      drawCall.faceIndices = node.geometry._sequentialIndices;
    }

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
        this.#appendIndexedLineSegment(
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
        this.#appendIndexedLineSegment(
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
        this.#appendIndexedLineSegment(
          lineBuffer,
          drawCall.clipVerts,
          viewDepths,
          indices[indices.length - 1],
          indices[0],
          drawCall.vertCount,
          width,
          height,
          true,
        );
      }
    }

    drawCall.lines = lineBuffer;
    return drawCall;
  }

  #appendIndexedLineSegment(
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
    this.#appendLineSegment(
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

  #projectLineVertices(
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

  #appendLineSegment(
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
    this.#clipLower = 0;
    this.#clipUpper = 1;
    if (!this.#clipPlane(x0 + w0, x1 + w1)) return;
    if (!this.#clipPlane(-x0 + w0, -x1 + w1)) return;
    if (!this.#clipPlane(y0 + w0, y1 + w1)) return;
    if (!this.#clipPlane(-y0 + w0, -y1 + w1)) return;
    if (!this.#clipPlane(z0 + w0, z1 + w1)) return;
    if (!this.#clipPlane(-z0 + w0, -z1 + w1)) return;
    if (!this.#clipPlane(w0 - epsilon, w1 - epsilon)) return;

    const lower = this.#clipLower;
    const upper = this.#clipUpper;

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
      viewDepths.length > vertex0 ? this.#fogOpacityAt(viewDepths[vertex0]) : 0;
    const fog1 =
      viewDepths.length > vertex1 ? this.#fogOpacityAt(viewDepths[vertex1]) : 0;
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
  #clipPlane(f0: number, f1: number): boolean {
    if (f0 < 0 && f1 < 0) return false;
    if (f0 < 0 || f1 < 0) {
      const t = f0 / (f0 - f1);
      if (f0 < 0) this.#clipLower = Math.max(this.#clipLower, t);
      else this.#clipUpper = Math.min(this.#clipUpper, t);
    }
    return this.#clipLower <= this.#clipUpper;
  }

  #buildDrawCall(
    node: SceneNode & {
      matrixWorld: Matrix4;
      geometry: GeometryLike;
      material: Material;
    },
    camera: CameraLike,
    width: number,
    height: number,
    profiler?:
      | {
          now: () => number;
          onProject: (dt: number) => void;
          onAssemble: (dt: number) => void;
        }
      | undefined,
  ): DrawCall {
    let drawCall = node._drawCall;
    if (drawCall) {
      drawCall.mesh = node as unknown as Node;
      drawCall.material = node.material;
      drawCall.centroid.x = this.#lastBsCenterX;
      drawCall.centroid.y = this.#lastBsCenterY;
      drawCall.centroid.z = this.#lastBsCenterZ;
    } else {
      drawCall = new DrawCall(
        node as unknown as Node,
        node.material,
        this.#lastBsCenterX,
        this.#lastBsCenterY,
        this.#lastBsCenterZ,
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
      this.#hasFog && this.#fogLut
        ? _viewWorld.copy(camera.matrixWorldInverse).multiply(node.matrixWorld)
        : undefined;

    let viewDepths: Float32Array;
    if (profiler) {
      const t0 = profiler.now();
      viewDepths = this.#projectVertices(node, drawCall, !isUnlit, viewWorld);
      profiler.onProject(profiler.now() - t0);
    } else {
      viewDepths = this.#projectVertices(node, drawCall, !isUnlit, viewWorld);
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
    if (index) {
      drawCall.faceIndices = ((index as { array: ArrayLike<number> }).array ??
        index) as number[] | Uint16Array | Uint32Array;
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
      drawCall.faceIndices = node.geometry._sequentialIndices;
    }

    if (profiler) {
      const t0 = profiler.now();
      if (isPoints) {
        drawCall.triangles = this.#assemblePoints(
          drawCall.faceIndices,
          drawCall.projectedVerts,
          viewDepths,
          width,
          height,
          node,
        );
      } else {
        const worldNormals = isUnlit
          ? _emptyNormals
          : this.#buildWorldNormals(node);
        const uvs = hasTexture ? this.#buildUvs(node) : _emptyUvs;
        drawCall.triangles = this.#assembleTriangles(
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
      drawCall.triangles = this.#assemblePoints(
        drawCall.faceIndices,
        drawCall.projectedVerts,
        viewDepths,
        width,
        height,
        node,
      );
    } else {
      const worldNormals = isUnlit
        ? _emptyNormals
        : this.#buildWorldNormals(node);
      const uvs = hasTexture ? this.#buildUvs(node) : _emptyUvs;
      drawCall.triangles = this.#assembleTriangles(
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
  #projectVertices(
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
  #buildWorldNormals(
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
  #buildUvs(node: SceneNode | { geometry: GeometryLike }): Float32Array {
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

  /** Samples the prepared fog LUT for positive camera-space depth. */
  #fogOpacityAt(depth: number): number {
    const lut = this.#fogLut;
    if (!lut) return 0;

    const index =
      this.#fogMode === "exponential-squared"
        ? depth * this.#fogLutScale
        : (depth - this.#fogNear) * this.#fogLutScale;
    if (index <= 0) return lut[0];
    if (index >= 255) return lut[255];

    const lower = Math.floor(index);
    const upper = lower + 1;
    const weight = index - lower;
    return lut[lower] + (lut[upper] - lut[lower]) * weight;
  }

  #assemblePoints(
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
    const hasFog = this.#hasFog;

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
        ff = this.#fogOpacityAt(viewDepths[vi]);
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

  #assembleTriangles(
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
    const hasTexture = !!(material as unknown as { map?: { data?: unknown } })
      .map?.data;

    let buf = node._triangleBuffer;
    if (!buf) {
      buf = new TriangleBuffer(triCount || 64);
      node._triangleBuffer = buf;
    }
    buf.reset();
    buf.ensureCapacity(triCount);

    const halfW = width * 0.5;
    const halfH = height * 0.5;

    const hasFog = this.#hasFog;
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
        ff0 = this.#fogOpacityAt(viewDepths[i0]);
        ff1 = this.#fogOpacityAt(viewDepths[i1]);
        ff2 = this.#fogOpacityAt(viewDepths[i2]);
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

  #collectLight(light: SceneNode, drawList: DrawList): void {
    const lightWorld = light.matrixWorld.elements;
    const lightWorldX = lightWorld[12];
    const lightWorldY = lightWorld[13];
    const lightWorldZ = lightWorld[14];

    if (light.type === "LightProbe") {
      const sh = light["sh"] as {
        coefficients: SphericalHarmonicsCoefficients;
      };
      drawList.lights.push({
        type: "probe",
        coefficients: sh.coefficients,
        intensity: light["intensity"],
      });
      return;
    }

    if (light.type === "AmbientLight") {
      drawList.lights.push({
        type: "ambient",
        lightType: LightType.Ambient,
        color: light["color"],
        intensity: light["intensity"],
      });
      return;
    }

    if (light.type === "HemisphereLight") {
      const elements = light.matrixWorld.elements;
      const x = elements[12];
      const y = elements[13];
      const z = elements[14];
      const len = Math.sqrt(x * x + y * y + z * z) || 1;
      drawList.lights.push({
        type: "hemisphere",
        lightType: LightType.Hemisphere,
        skyColor: light["color"],
        groundColor: light["groundColor"],
        direction: { x: x / len, y: y / len, z: z / len },
        intensity: light["intensity"],
      });
      return;
    }

    if (light.type === "SpotLight") {
      drawList.lights.push(this.#buildSpotLightEntry(light));
      return;
    }

    if (light.type === "PointLight") {
      drawList.lights.push({
        type: "point",
        lightType: LightType.Point,
        position: { x: lightWorldX, y: lightWorldY, z: lightWorldZ },
        color: light["color"],
        intensity: light["intensity"],
        distance: (light["distance"] as number) ?? 0,
        decay: (light["decay"] as number) ?? 2,
      });
      return;
    }

    if (light["color"] === undefined || light["intensity"] === undefined) {
      return;
    }
    let ddx: number;
    let ddy: number;
    let ddz: number;
    if (light["target"]) {
      const target = light["target"] as SceneNode;
      const targetWorld = target.matrixWorld.elements;
      const twx = targetWorld[12];
      const twy = targetWorld[13];
      const twz = targetWorld[14];
      ddx = twx - lightWorldX;
      ddy = twy - lightWorldY;
      ddz = twz - lightWorldZ;
    } else {
      ddx = -lightWorldX;
      ddy = -lightWorldY;
      ddz = -lightWorldZ;
    }
    const len = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz) || 1;
    drawList.lights.push({
      type: "directional",
      lightType: LightType.Directional,
      direction: { x: ddx / len, y: ddy / len, z: ddz / len },
      color: light["color"],
      intensity: light["intensity"],
    });
  }

  #buildSpotLightEntry(light: SceneNode): Record<string, unknown> {
    const me = light.matrixWorld.elements;
    const lightWorldX = me[12];
    const lightWorldY = me[13];
    const lightWorldZ = me[14];
    let wdx: number;
    let wdy: number;
    let wdz: number;
    if (light["target"]) {
      const target = light["target"] as SceneNode;
      const targetWorld = target.matrixWorld.elements;
      const twx = targetWorld[12];
      const twy = targetWorld[13];
      const twz = targetWorld[14];
      wdx = twx - lightWorldX;
      wdy = twy - lightWorldY;
      wdz = twz - lightWorldZ;
    } else {
      const dir = light["direction"] as Vec3 | undefined;
      const dx = dir?.x ?? 0;
      const dy = dir?.y ?? -1;
      const dz = dir?.z ?? 0;
      wdx = me[0] * dx + me[4] * dy + me[8] * dz;
      wdy = me[1] * dx + me[5] * dy + me[9] * dz;
      wdz = me[2] * dx + me[6] * dy + me[10] * dz;
    }
    const dirLen = Math.sqrt(wdx * wdx + wdy * wdy + wdz * wdz) || 1;
    return {
      type: "spot",
      lightType: LightType.Spot,
      position: { x: lightWorldX, y: lightWorldY, z: lightWorldZ },
      direction: { x: wdx / dirLen, y: wdy / dirLen, z: wdz / dirLen },
      color: light["color"],
      intensity: light["intensity"],
      angle: light["angle"],
      penumbra: (light["penumbra"] as number) ?? 0,
      cosAngle: light["cosAngle"],
      cosInnerAngle: light["cosInnerAngle"],
      distance: (light["distance"] as number) ?? 0,
      decay: (light["decay"] as number) ?? 2,
    };
  }
}

function isValidLineIndex(value: number, vertexCount: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < vertexCount;
}

function pixelX(ndc: number, width: number): number {
  const value = Math.round((ndc + 1) * 0.5 * (width - 1));
  return value < 0 ? 0 : value >= width ? width - 1 : value;
}

function pixelY(ndc: number, height: number): number {
  const value = Math.round((1 - ndc) * 0.5 * (height - 1));
  return value < 0 ? 0 : value >= height ? height - 1 : value;
}

function unboundedPixelX(ndc: number, width: number): number {
  return Math.round((ndc + 1) * 0.5 * (width - 1));
}

function unboundedPixelY(ndc: number, height: number): number {
  return Math.round((1 - ndc) * 0.5 * (height - 1));
}
