import type { OrthographicCamera } from "../../cameras/OrthographicCamera.ts";
import type { PerspectiveCamera } from "../../cameras/PerspectiveCamera.ts";
import type { Node } from "../../core/Node.ts";
import type { Scene } from "../../core/Scene.ts";
import { Geometry } from "../../geometry/Geometry.ts";
import type { Material } from "../../materials/Material.ts";
import { Matrix4 } from "../../math/Matrix4.ts";
import { Quaternion } from "../../math/Quaternion.ts";
import { Vector3 } from "../../math/Vector3.ts";
import { Group } from "../../objects/Group.ts";
import { InstancedMesh } from "../../objects/InstancedMesh.ts";
import { LOD } from "../../objects/LOD.ts";
import { Mesh } from "../../objects/Mesh.ts";
import type { GLTFMaterialInfo, GLTFNodeLODInfo } from "../GLTFLoader.ts";
import type { BuildContext, InstancingData } from "./extensions.ts";
import { array, integer, numberArray, record } from "./validation.ts";

export interface NodeRecord {
  name?: string;
  children?: number[];
  mesh?: number;
  camera?: number;
  matrix?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
  extras?: unknown;
  extensions?: Readonly<Record<string, unknown>>;
}

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

export function buildNode(
  index: number,
  nodes: NodeRecord[],
  meshes: Readonly<Record<string, unknown>>[],
  cameras: readonly (PerspectiveCamera | OrthographicCamera)[],
  readAccessor: (index: number) => number[],
  materials: readonly GLTFMaterialInfo[],
  defaultMaterial: Material,
  collectCameras: (PerspectiveCamera | OrthographicCamera)[] | undefined,
  context: BuildContext,
): Group | Mesh | LOD | Scene | PerspectiveCamera | OrthographicCamera {
  const source = nodes[index];
  if (!source) throw new RangeError(`GLTFLoader: node ${index} is missing.`);
  const lodInfo = context.lods.get(index);
  if (lodInfo !== undefined && !context.activeLods.has(index)) {
    context.activeLods.add(index);
    const lod = new LOD();
    lod.name = source.name ?? `Node${index}`;
    const parentMatrix = nodeTransformMatrix(source);
    setNodeTransform(lod, source);
    const levelIndices = [index, ...lodInfo.ids];
    for (let level = 0; level < levelIndices.length; level++) {
      const levelIndex = levelIndices[level]!;
      const levelObject = buildNodeContent(
        levelIndex,
        nodes,
        meshes,
        cameras,
        readAccessor,
        materials,
        defaultMaterial,
        collectCameras,
        context,
        false,
      );
      if (level > 0) {
        const levelSource = nodes[levelIndex]!;
        applyRelativeNodeTransform(levelObject, levelSource, parentMatrix);
      }
      lod.addLevel(
        levelObject,
        lodDistance(lodInfo, level, context.lodDistanceScale),
      );
      levelObject.visible = level === 0;
    }
    lod.userData = { gltfNodeIndex: index, gltfLOD: lodInfo };
    setUserData(lod, source.extras, index);
    context.activeLods.delete(index);
    return lod;
  }
  return buildNodeContent(
    index,
    nodes,
    meshes,
    cameras,
    readAccessor,
    materials,
    defaultMaterial,
    collectCameras,
    context,
  );
}

export function buildNodeContent(
  index: number,
  nodes: NodeRecord[],
  meshes: Readonly<Record<string, unknown>>[],
  cameras: readonly (PerspectiveCamera | OrthographicCamera)[],
  readAccessor: (index: number) => number[],
  materials: readonly GLTFMaterialInfo[],
  defaultMaterial: Material,
  collectCameras: (PerspectiveCamera | OrthographicCamera)[] | undefined,
  context: BuildContext,
  applyTransform: boolean = true,
): Group | Mesh | LOD | Scene | PerspectiveCamera | OrthographicCamera {
  const source = nodes[index];
  if (!source) throw new RangeError(`GLTFLoader: node ${index} is missing.`);
  const camera =
    source.camera === undefined
      ? undefined
      : cameras[integer(source.camera, `nodes[${index}].camera`)];
  let object: Group | Mesh | LOD | PerspectiveCamera | OrthographicCamera;
  if (camera) {
    object = camera.clone();
    collectCameras?.push(object);
  } else if (source.mesh !== undefined) {
    object = buildMesh(
      integer(source.mesh, `nodes[${index}].mesh`),
      meshes,
      readAccessor,
      materials,
      defaultMaterial,
      context.instancing.get(index),
    );
  } else {
    object = new Group();
  }
  if (source.name !== undefined) object.name = source.name;
  if (applyTransform) setNodeTransform(object, source);
  setUserData(object, source.extras, index);
  const instancing = context.instancing.get(index);
  if (instancing)
    object.userData = { ...object.userData, gltfInstancing: instancing.info };
  for (const child of source.children ?? [])
    object.add(
      buildNode(
        integer(child, `nodes[${index}].children`),
        nodes,
        meshes,
        cameras,
        readAccessor,
        materials,
        defaultMaterial,
        collectCameras,
        context,
      ),
    );
  return object;
}

export function buildMesh(
  index: number,
  meshes: Readonly<Record<string, unknown>>[],
  readAccessor: (index: number) => number[],
  materials: readonly GLTFMaterialInfo[],
  defaultMaterial: Material,
  instancing?: InstancingData,
): Group | InstancedMesh | Mesh {
  const meshDef = meshes[index];
  if (!meshDef) throw new RangeError(`GLTFLoader: mesh ${index} is missing.`);
  const primitives = array(
    meshDef["primitives"] ?? [],
    `meshes[${index}].primitives`,
  );
  const objects: Mesh[] = [];
  for (
    let primitiveIndex = 0;
    primitiveIndex < primitives.length;
    primitiveIndex++
  ) {
    const primitive = record(
      primitives[primitiveIndex],
      `meshes[${index}].primitives[${primitiveIndex}]`,
    );
    const mode = integer(primitive["mode"], "primitive.mode", 4);
    if (mode !== 4 && mode !== 5 && mode !== 6)
      throw new Error(
        `GLTFLoader: primitive mode ${mode} is outside the CPU triangle path.`,
      );
    const attributes = record(primitive["attributes"], "primitive.attributes");
    const positionAccessor = integer(
      attributes["POSITION"],
      "primitive.attributes.POSITION",
    );
    const positions = readAccessor(positionAccessor);
    const geometry = new Geometry().setPositions(positions);
    if (typeof attributes["NORMAL"] === "number")
      geometry.setNormals(
        readAccessor(
          integer(attributes["NORMAL"], "primitive.attributes.NORMAL"),
        ),
      );
    if (typeof attributes["TEXCOORD_0"] === "number")
      geometry.setUVs(
        readAccessor(
          integer(attributes["TEXCOORD_0"], "primitive.attributes.TEXCOORD_0"),
        ),
      );
    if (typeof attributes["COLOR_0"] === "number") {
      const colors = readAccessor(
        integer(attributes["COLOR_0"], "primitive.attributes.COLOR_0"),
      );
      const components = colors.length / (positions.length / 3);
      geometry.setColors(
        components === 4
          ? colors.filter((_value, component) => component % 4 !== 3)
          : colors,
      );
    }
    const sourceIndices =
      primitive["indices"] === undefined
        ? Array.from({ length: positions.length / 3 }, (_value, item) => item)
        : readAccessor(integer(primitive["indices"], "primitive.indices"));
    const indices: number[] = [];
    if (mode === 4) indices.push(...sourceIndices);
    else if (mode === 5) {
      for (let item = 0; item + 2 < sourceIndices.length; item++) {
        if (item % 2 === 0)
          indices.push(
            sourceIndices[item]!,
            sourceIndices[item + 1]!,
            sourceIndices[item + 2]!,
          );
        else
          indices.push(
            sourceIndices[item + 1]!,
            sourceIndices[item]!,
            sourceIndices[item + 2]!,
          );
      }
    } else
      for (let item = 1; item + 1 < sourceIndices.length; item++)
        indices.push(
          sourceIndices[0]!,
          sourceIndices[item]!,
          sourceIndices[item + 1]!,
        );
    geometry.index = indices.some((value) => value > 65535)
      ? new Uint32Array(indices)
      : indices;
    if (geometry.getAttribute("normal") === undefined)
      geometry.computeVertexNormals();
    const materialIndex =
      primitive["material"] === undefined
        ? undefined
        : integer(primitive["material"], "primitive.material");
    const info =
      materialIndex === undefined ? undefined : materials[materialIndex];
    const object = instancing
      ? new InstancedMesh(
          geometry,
          info?.material ?? defaultMaterial,
          instancing.info.count,
        )
      : new Mesh(geometry, info?.material ?? defaultMaterial);
    if (instancing) {
      const translation = instancing.translations;
      const rotation = instancing.rotations;
      const scale = instancing.scales;
      const position = new Vector3();
      const quaternion = new Quaternion();
      const size = new Vector3(1, 1, 1);
      const matrix = new Matrix4();
      for (let instance = 0; instance < instancing.info.count; instance++) {
        if (translation) position.fromArray(translation, instance * 3);
        else position.set(0, 0, 0);
        if (rotation) quaternion.fromArray(rotation, instance * 4);
        else quaternion.set(0, 0, 0, 1);
        if (scale) size.fromArray(scale, instance * 3);
        else size.set(1, 1, 1);
        (object as InstancedMesh).setMatrixAt(
          instance,
          matrix.compose(position, quaternion, size),
        );
      }
      if (instancing.instanceColor)
        (object as InstancedMesh).instanceColor = instancing.instanceColor;
    }
    object.name =
      typeof meshDef["name"] === "string"
        ? (meshDef["name"] as string)
        : `Mesh${index}`;
    object.userData = {
      gltfMeshIndex: index,
      gltfPrimitiveIndex: primitiveIndex,
      ...(info
        ? {
            gltfMaterialIndex: info.index,
            gltfBaseColorTexture: info.baseColorTexture,
          }
        : {}),
      ...(instancing ? { gltfInstancing: instancing.info } : {}),
    };
    objects.push(object);
  }
  if (objects.length === 1) return objects[0]!;
  const group = new Group();
  group.name =
    typeof meshDef["name"] === "string"
      ? (meshDef["name"] as string)
      : `Mesh${index}`;
  group.add(...objects);
  return group;
}
