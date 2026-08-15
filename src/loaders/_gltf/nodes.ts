import type { OrthographicCamera } from "../../cameras/OrthographicCamera.ts";
import type { PerspectiveCamera } from "../../cameras/PerspectiveCamera.ts";
import type { Node } from "../../core/Node.ts";
import type { Scene } from "../../core/Scene.ts";
import type { Material } from "../../materials/Material.ts";
import { Matrix4 } from "../../math/Matrix4.ts";
import { Quaternion } from "../../math/Quaternion.ts";
import { Vector3 } from "../../math/Vector3.ts";
import { Group } from "../../objects/Group.ts";
import { LOD } from "../../objects/LOD.ts";
import type { Mesh } from "../../objects/Mesh.ts";
import type { GLTFMaterialInfo, GLTFNodeLODInfo } from "../GLTFLoader.ts";
import type { BuildContext } from "./extensions.ts";
import type { MeshBuildOptions } from "./mesh.ts";
import { buildMesh as buildMeshImplementation } from "./mesh.ts";
import { integer, numberArray } from "./validation.ts";

/** Builds the mesh referenced by a glTF node using the shared mesh builder. */
export function buildMesh(
  index: number,
  options: MeshBuildOptions,
): Group | Mesh {
  return buildMeshImplementation(index, options);
}

/** Options for recursively constructing glTF nodes and their scene-graph content. */
export interface NodeBuildOptions {
  /** Source node records indexed by their glTF node number. */
  readonly nodes: NodeRecord[];
  /** Source mesh definitions indexed by their glTF mesh number. */
  readonly meshes: Readonly<Record<string, unknown>>[];
  /** Camera prototypes available to node camera references. */
  readonly cameras: readonly (PerspectiveCamera | OrthographicCamera)[];
  /** Decodes an accessor into flattened numeric component values. */
  readonly readAccessor: (index: number) => number[];
  /** Parsed material records available to mesh construction. */
  readonly materials: readonly GLTFMaterialInfo[];
  /** glTF default material used by primitives without an explicit material. */
  readonly defaultMaterial: Material;
  /** Optional collection receiving cloned cameras encountered during traversal. */
  readonly collectCameras:
    | (PerspectiveCamera | OrthographicCamera)[]
    | undefined;
  /** Shared extension and LOD state used during node construction. */
  readonly context: BuildContext;
}

/** Describes the node fields consumed from a glTF document. */
export interface NodeRecord {
  /** Optional node name copied to the created scene-graph object. */
  name?: string;
  /** Indices of child nodes attached below this node. */
  children?: number[];
  /** Index of the mesh instance referenced by this node. */
  mesh?: number;
  /** Index of the camera referenced by this node. */
  camera?: number;
  /** Column-major local transform matrix, when provided. */
  matrix?: number[];
  /** Local translation vector in glTF coordinates. */
  translation?: number[];
  /** Local rotation quaternion in glTF component order. */
  rotation?: number[];
  /** Local scale vector in glTF coordinates. */
  scale?: number[];
  /** Application-defined metadata copied into node user data. */
  extras?: unknown;
  /** glTF extension payloads associated with the node. */
  extensions?: Readonly<Record<string, unknown>>;
}

/** Applies a node's matrix or TRS fields to a scene-graph node. */
export function setNodeTransform(node: Node, source: NodeRecord): void {
  if (source.matrix !== undefined) {
    const matrix = numberArray(source.matrix, "node.matrix", 16);
    new Matrix4()
      .fromArray(matrix)
      .decompose(node.position, node.quaternion, node.scale);
  } else {
    if (source.translation !== undefined)
      node.position.fromArray(
        numberArray(source.translation, "node.translation", 3),
      );
    if (source.rotation !== undefined)
      node.quaternion.fromArray(
        numberArray(source.rotation, "node.rotation", 4),
      );
    if (source.scale !== undefined)
      node.scale.fromArray(numberArray(source.scale, "node.scale", 3));
  }
  node.updateMatrix();
}

/** Merges glTF extras into node user data and records the source index. */
export function setUserData(node: Node, extras: unknown, index: number): void {
  const existing = node.userData;
  if (
    extras !== undefined &&
    extras !== null &&
    typeof extras === "object" &&
    !Array.isArray(extras)
  ) {
    node.userData = {
      ...existing,
      ...(extras as Record<string, unknown>),
      gltfNodeIndex: index,
    };
  } else {
    node.userData = { ...existing, gltfNodeIndex: index };
  }
}

/** Builds a local transform matrix from a node's matrix or TRS fields. */
export function nodeTransformMatrix(source: NodeRecord): Matrix4 {
  if (source.matrix !== undefined)
    return new Matrix4().fromArray(
      numberArray(source.matrix, "node.matrix", 16),
    );
  const position =
    source.translation === undefined
      ? new Vector3()
      : new Vector3().fromArray(
          numberArray(source.translation, "node.translation", 3),
        );
  const quaternion =
    source.rotation === undefined
      ? new Quaternion()
      : new Quaternion().fromArray(
          numberArray(source.rotation, "node.rotation", 4),
        );
  const scale =
    source.scale === undefined
      ? new Vector3(1, 1, 1)
      : new Vector3().fromArray(numberArray(source.scale, "node.scale", 3));
  return new Matrix4().compose(position, quaternion, scale);
}

/** Applies a child node's transform relative to its LOD parent matrix. */
export function applyRelativeNodeTransform(
  object: Node,
  source: NodeRecord,
  parentMatrix: Matrix4,
): void {
  const relative = parentMatrix
    .clone()
    .invert()
    .multiply(nodeTransformMatrix(source));
  relative.decompose(object.position, object.quaternion, object.scale);
  object.updateMatrix();
}

/** Calculates the camera distance at which an LOD level becomes active. */
export function lodDistance(
  info: GLTFNodeLODInfo,
  level: number,
  scale: number,
): number {
  if (level === 0) return 0;
  const coverage = info.screenCoverage?.[level];
  if (coverage !== undefined && coverage > 0) return scale / coverage;
  return level * 10 * scale;
}

function buildLOD(
  index: number,
  source: NodeRecord,
  info: GLTFNodeLODInfo,
  options: NodeBuildOptions,
): LOD {
  options.context.activeLods.add(index);
  const lod = new LOD();
  lod.name = source.name ?? `Node${index}`;
  const parentMatrix = nodeTransformMatrix(source);
  setNodeTransform(lod, source);
  const levelIndices = [index, ...info.ids];
  for (let level = 0; level < levelIndices.length; level++) {
    const levelIndex = levelIndices[level];
    if (levelIndex === undefined)
      throw new RangeError(`GLTFLoader: LOD level ${level} is missing.`);
    const levelObject = buildNodeContent(levelIndex, options, false);
    if (level > 0) {
      const levelSource = options.nodes[levelIndex];
      if (levelSource === undefined)
        throw new RangeError(`GLTFLoader: node ${levelIndex} is missing.`);
      applyRelativeNodeTransform(levelObject, levelSource, parentMatrix);
    }
    lod.addLevel(
      levelObject,
      lodDistance(info, level, options.context.lodDistanceScale),
    );
    levelObject.visible = level === 0;
  }
  lod.userData = { gltfNodeIndex: index, gltfLOD: info };
  setUserData(lod, source.extras, index);
  options.context.activeLods.delete(index);
  return lod;
}

/** Builds a node and its LOD levels, recursively resolving scene references. */
export function buildNode(
  index: number,
  options: NodeBuildOptions,
): Group | Mesh | LOD | Scene | PerspectiveCamera | OrthographicCamera {
  const source = options.nodes[index];
  if (!source) throw new RangeError(`GLTFLoader: node ${index} is missing.`);
  const lodInfo = options.context.lods.get(index);
  if (lodInfo !== undefined && !options.context.activeLods.has(index))
    return buildLOD(index, source, lodInfo, options);
  return buildNodeContent(index, options);
}

/** Builds a node's camera, mesh, or group content and attaches its children. */
export function buildNodeContent(
  index: number,
  options: NodeBuildOptions,
  applyTransform: boolean = true,
): Group | Mesh | LOD | Scene | PerspectiveCamera | OrthographicCamera {
  const source = options.nodes[index];
  if (!source) throw new RangeError(`GLTFLoader: node ${index} is missing.`);
  const camera =
    source.camera === undefined
      ? undefined
      : options.cameras[integer(source.camera, `nodes[${index}].camera`)];
  let object: Group | Mesh | LOD | PerspectiveCamera | OrthographicCamera;
  if (camera) {
    object = camera.clone();
    options.collectCameras?.push(object);
  } else if (source.mesh !== undefined) {
    const instancing = options.context.instancing.get(index);
    object =
      instancing === undefined
        ? buildMeshImplementation(
            integer(source.mesh, `nodes[${index}].mesh`),
            {
              meshes: options.meshes,
              readAccessor: options.readAccessor,
              materials: options.materials,
              defaultMaterial: options.defaultMaterial,
            },
          )
        : buildMeshImplementation(
            integer(source.mesh, `nodes[${index}].mesh`),
            {
              meshes: options.meshes,
              readAccessor: options.readAccessor,
              materials: options.materials,
              defaultMaterial: options.defaultMaterial,
              instancing,
            },
          );
  } else {
    object = new Group();
  }
  if (source.name !== undefined) object.name = source.name;
  if (applyTransform) setNodeTransform(object, source);
  setUserData(object, source.extras, index);
  const instancing = options.context.instancing.get(index);
  if (instancing)
    object.userData = { ...object.userData, gltfInstancing: instancing.info };
  for (const child of source.children ?? [])
    object.add(buildNode(integer(child, `nodes[${index}].children`), options));
  return object;
}
