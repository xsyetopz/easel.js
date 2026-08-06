import { LineMaterial } from "../materials/LineMaterial.ts";
import type { Material } from "../materials/Material.ts";
import { Frustum } from "../math/Frustum.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Line } from "../objects/Line.ts";
import { DrawList } from "./DrawList.ts";
import { buildInstancedDrawCalls } from "./InstancedMeshBuilder.ts";
import {
  type CameraLike,
  type GeometryLike,
  type SceneLike,
  type SceneNode,
  _bsCenter,
  _emptyUvs,
  _emptyViewDepths,
  _frustum,
  _vp,
} from "./_SceneTraversalShared.ts";
import { collectLight } from "./_SceneLightCollection.ts";
import {
  type LineAssemblyState,
  buildLineDrawCall,
} from "./_SceneLineAssembly.ts";
import {
  type MeshAssemblyState,
  assembleTriangles,
  buildDrawCall,
  buildUvs,
} from "./_SceneMeshAssembly.ts";

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

  #lineState(): LineAssemblyState {
    return {
      hasFog: this.#hasFog,
      fogLut: this.#fogLut,
      fogNear: this.#fogNear,
      fogFar: this.#fogFar,
      fogLutScale: this.#fogLutScale,
      fogMode: this.#fogMode,
      clipLower: this.#clipLower,
      clipUpper: this.#clipUpper,
      lastBsCenterX: this.#lastBsCenterX,
      lastBsCenterY: this.#lastBsCenterY,
      lastBsCenterZ: this.#lastBsCenterZ,
    };
  }

  #meshState(): MeshAssemblyState {
    return {
      hasFog: this.#hasFog,
      fogLut: this.#fogLut,
      fogNear: this.#fogNear,
      fogFar: this.#fogFar,
      fogLutScale: this.#fogLutScale,
      fogMode: this.#fogMode,
      lastBsCenterX: this.#lastBsCenterX,
      lastBsCenterY: this.#lastBsCenterY,
      lastBsCenterZ: this.#lastBsCenterZ,
    };
  }

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
            ? buildLineDrawCall(
                this.#lineState(),
                node as SceneNode & {
                  matrixWorld: Matrix4;
                  geometry: GeometryLike;
                  material: Material;
                },
                camera,
                width,
                height,
              )
            : buildDrawCall(
                this.#meshState(),
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
      const meshState = this.#meshState();
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
          assembleTriangles(
            meshState,
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
            ? (n: unknown) => buildUvs(n as SceneNode)
            : () => _emptyUvs;
        })(),
      );
    } else if (
      typeof node.type === "string" &&
      (node.type.endsWith("Light") || node.type === "LightProbe")
    ) {
      collectLight(node, drawList);
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
}
