import type { Material } from "../materials/Material.ts";
import type { Frustum } from "../math/Frustum.ts";
import type { DrawList } from "./DrawList.ts";
import type { MeshAssemblyState, Profiler } from "./_SceneMeshAssembly.ts";
import { assembleTriangles, buildUvs } from "./_SceneMeshAssembly.ts";
import type {
  CameraLike,
  GeometryLike,
  SceneNode,
} from "./_SceneTraversalShared.ts";
import { _emptyUvs, _emptyViewDepths } from "./_SceneTraversalShared.ts";
import type { TriangleBuffer } from "./TriangleBuffer.ts";

/** State shared by each visible-node visit during scene traversal. */
export interface TraversalContext {
  /** Reusable destination for draw calls and lights collected in this pass. */
  drawList: DrawList;
  /** Camera transforms and position used to project the visited node. */
  camera: CameraLike;
  /** View frustum used to reject nodes outside the camera view. */
  frustum: Frustum;
  /** Current framebuffer width in pixels for screen-space projection. */
  width: number;
  /** Current framebuffer height in pixels for screen-space projection. */
  height: number;
  /** Optional timing sink for measuring mesh projection and assembly work. */
  profiler: Profiler | undefined;
}

/** Visits visible scene nodes in painter traversal order. */
export function walkScene(
  node: SceneNode,
  context: TraversalContext,
  visit: (node: SceneNode, context: TraversalContext) => void,
): void {
  if (!node.visible) return;
  visit(node, context);
  for (const child of node.children) {
    walkScene(child, context, visit);
  }
}

type InstancedAssemblyArgs = [
  indices: ArrayLike<number>,
  verts: Float32Array,
  worldNormals: Float32Array,
  uvs: Float32Array,
  width: number,
  height: number,
  material: Material,
  node: { _triangleBuffer?: TriangleBuffer; [k: string]: unknown },
  viewDepths?: Float32Array,
];

/** Binds traversal state to the instanced-mesh triangle assembler. */
export function makeInstancedAssembler(
  state: MeshAssemblyState,
): (...args: InstancedAssemblyArgs) => TriangleBuffer {
  return (...args: InstancedAssemblyArgs) =>
    assembleTriangles(
      state,
      args[0],
      args[1],
      args[8] ?? _emptyViewDepths,
      args[2],
      args[3],
      args[4],
      args[5],
      args[6],
      args[7],
    );
}

/** Selects the textured or empty UV builder for an instanced material. */
export function makeInstancedUvBuilder(
  node: SceneNode,
): (node: { geometry: GeometryLike }) => Float32Array {
  const hasTexture = Boolean(
    (node.material as unknown as { map?: { data?: unknown } }).map?.data,
  );
  const emptyUvs = (_geometryNode: { geometry: GeometryLike }): Float32Array =>
    _emptyUvs;
  return hasTexture ? buildUvs : emptyUvs;
}
