import type { Matrix4 } from "../math/Matrix4.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import type { Material } from "../materials/Material.ts";
import { Line } from "../objects/Line.ts";
import { DrawList } from "./DrawList.ts";
import { buildInstancedDrawCalls } from "./InstancedMeshBuilder.ts";
import { collectLight } from "./_SceneLightCollection.ts";
import {
  type LineAssemblyState,
  buildLineDrawCall,
} from "./_SceneLineAssembly.ts";
import {
  type MeshAssemblyState,
  type Profiler,
  buildDrawCall,
} from "./_SceneMeshAssembly.ts";
import {
  type CameraLike,
  type GeometryLike,
  type SceneLike,
  type SceneNode,
  _bsCenter,
  _frustum,
  _vp,
} from "./_SceneTraversalShared.ts";
import {
  type BoundingSphereState,
  isFrustumCulled,
} from "./_SceneFrustumCulling.ts";
import {
  makeInstancedAssembler,
  makeInstancedUvBuilder,
  type TraversalContext,
  walkScene,
} from "./_SceneTraversalHelpers.ts";

interface TraversalTimings {
  profileTraversal?: boolean;
  travUpdateWorldMs?: number;
  travWalkMs?: number;
  travProjectMs?: number;
  travAssembleMs?: number;
  travDrawCalls?: number;
}

type TraverseArgs = [
  width?: number,
  height?: number,
  timings?: TraversalTimings,
];

interface TraversalMetrics {
  projectMs: number;
  assembleMs: number;
}

type RenderableNode = SceneNode & {
  geometry: GeometryLike;
  matrixWorld: Matrix4;
  material: Material;
};

/** Walks the scene graph collecting visible draw calls. */
export class SceneTraversal {
  #fogNear = 0;
  #fogFar = 0;
  #fogLutScale = 0;
  #fogLut: Float32Array | undefined;
  #fogMode: "linear" | "exponential-squared" = "linear";
  #fogCullingFar: number | undefined;
  #hasFog = false;

  readonly #bounds: BoundingSphereState = {
    centerX: 0,
    centerY: 0,
    centerZ: 0,
    worldRadius: 0,
  };

  // Scalar homogeneous clipping state reused for every line segment.
  readonly #clipLower = 0;
  readonly #clipUpper = 1;

  readonly #sphereScratch = { centre: _bsCenter, radius: 0 };
  readonly #drawList = new DrawList();

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
      lastBsCenterX: this.#bounds.centerX,
      lastBsCenterY: this.#bounds.centerY,
      lastBsCenterZ: this.#bounds.centerZ,
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
      lastBsCenterX: this.#bounds.centerX,
      lastBsCenterY: this.#bounds.centerY,
      lastBsCenterZ: this.#bounds.centerZ,
    };
  }

  /** Collects visible, frustum-culled draw calls and prepared lights for CPU rasterization. */
  traverse(
    scene: SceneLike,
    camera: CameraLike,
    ...args: TraverseArgs
  ): DrawList {
    const [width = 300, height = 150, timings] = args;
    const perf = timings ? globalThis.performance : undefined;
    const now =
      timings && typeof perf?.now === "function"
        ? perf.now.bind(perf)
        : Date.now;
    const profile = Boolean(timings?.profileTraversal);
    const tUpdate0 = timings ? now() : 0;
    if (timings) timings.travUpdateWorldMs = now() - tUpdate0;

    this.#configureFog(scene);
    _vp.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_vp);

    const drawList = this.#drawList;
    drawList.clear();
    const metrics = { projectMs: 0, assembleMs: 0 };
    const profiler = this.#makeProfiler(timings, profile, now, metrics);
    const context: TraversalContext = {
      drawList,
      camera,
      frustum: _frustum,
      width,
      height,
      profiler,
    };
    const tWalk0 = timings ? now() : 0;
    walkScene(scene as unknown as SceneNode, context, (node, nodeContext) =>
      this.#visitNode(node, nodeContext),
    );
    if (timings) {
      timings.travWalkMs = now() - tWalk0;
      timings.travDrawCalls = drawList.calls.length;
      if (profile) {
        timings.travProjectMs = metrics.projectMs;
        timings.travAssembleMs = metrics.assembleMs;
      }
    }
    return drawList;
  }

  #configureFog(scene: SceneLike): void {
    const fog = scene.fog;
    if (fog?.lutNeedsUpdate) {
      throw new Error("Fog LUT is dirty; call updateLut() before traversal.");
    }
    this.#hasFog = Boolean(fog);
    this.#fogNear = fog?.near ?? 0;
    this.#fogFar = fog?.far ?? 0;
    this.#fogMode = fog?.mode ?? "linear";
    this.#fogLut = fog?.lut;
    this.#fogCullingFar = fog ? this.#fogFar : undefined;
    const fogLutDomain =
      this.#fogMode === "exponential-squared"
        ? this.#fogFar
        : this.#fogFar - this.#fogNear;
    this.#fogLutScale = fog && fogLutDomain > 0 ? 255 / fogLutDomain : 0;
  }

  #makeProfiler(
    timings: TraversalTimings | undefined,
    profile: boolean,
    now: () => number,
    metrics: TraversalMetrics,
  ): Profiler | undefined {
    if (!(timings && profile)) return;
    const onProject = (dt: number): void => {
      metrics.projectMs += dt;
    };
    const onAssemble = (dt: number): void => {
      metrics.assembleMs += dt;
    };
    return { now, onProject, onAssemble };
  }

  #visitNode(node: SceneNode, context: TraversalContext): boolean {
    const isLine =
      node instanceof Line && node.material instanceof LineMaterial;
    if (
      node.geometry &&
      node.material &&
      this.#isRenderableType(node.type, isLine)
    ) {
      this.#visitRenderable(node as RenderableNode, context, isLine);
    } else if (
      node.type === "InstancedMesh" &&
      node.geometry &&
      node.material
    ) {
      this.#visitInstanced(node, context);
    } else if (this.#isLightType(node.type)) {
      collectLight(node, context.drawList);
    }
    return true;
  }

  #isRenderableType(type: string | undefined, isLine: boolean): boolean {
    return type === "Mesh" || type === "Points" || isLine;
  }

  #isLightType(type: string | undefined): boolean {
    return (
      typeof type === "string" &&
      (type.endsWith("Light") || type === "LightProbe")
    );
  }

  #visitRenderable(
    node: RenderableNode,
    context: TraversalContext,
    isLine: boolean,
  ): void {
    if (
      isFrustumCulled(node, context.frustum, this.#sphereScratch, this.#bounds)
    )
      return;
    if (this.#isBeyondFog(context.camera)) return;

    const drawCall = isLine
      ? buildLineDrawCall(
          this.#lineState(),
          node,
          context.camera,
          context.width,
          context.height,
        )
      : buildDrawCall(
          this.#meshState(),
          node,
          context.camera,
          context.width,
          context.height,
          context.profiler,
        );
    context.drawList.add(drawCall);
  }

  #isBeyondFog(camera: CameraLike): boolean {
    const dx = this.#bounds.centerX - camera.position.x;
    const dy = this.#bounds.centerY - camera.position.y;
    const dz = this.#bounds.centerZ - camera.position.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const fogFar = this.#fogCullingFar;
    if (fogFar === undefined) return false;
    const fogFarPlusRadius = fogFar + this.#bounds.worldRadius;
    return distSq > fogFarPlusRadius * fogFarPlusRadius;
  }

  #visitInstanced(node: SceneNode, context: TraversalContext): void {
    const meshState = this.#meshState();
    buildInstancedDrawCalls(
      node as never,
      context.camera,
      context.frustum,
      context.width,
      context.height,
      context.drawList,
      {
        hasFog: this.#hasFog,
        fogFar: this.#fogFar,
        fogLut: this.#fogLut,
      },
      makeInstancedAssembler(meshState),
      makeInstancedUvBuilder(node),
    );
  }
}
