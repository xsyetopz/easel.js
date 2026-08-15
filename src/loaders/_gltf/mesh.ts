import { Geometry } from "../../geometry/Geometry.ts";
import type { Material } from "../../materials/Material.ts";
import { Matrix4 } from "../../math/Matrix4.ts";
import { Quaternion } from "../../math/Quaternion.ts";
import { Vector3 } from "../../math/Vector3.ts";
import { Group } from "../../objects/Group.ts";
import { InstancedMesh } from "../../objects/InstancedMesh.ts";
import { Mesh } from "../../objects/Mesh.ts";
import type { GLTFMaterialInfo } from "../GLTFLoader.ts";
import type { InstancingData } from "./extensions.ts";
import { array, integer, record } from "./validation.ts";

/** Options for converting glTF mesh definitions into CPU scene-graph objects. */
export interface MeshBuildOptions {
  /** Source mesh definitions indexed by their glTF mesh number. */
  readonly meshes: Readonly<Record<string, unknown>>[];
  /** Decodes an accessor into flattened numeric component values. */
  readonly readAccessor: (index: number) => number[];
  /** Parsed material records used by mesh primitives. */
  readonly materials: readonly GLTFMaterialInfo[];
  /** glTF default material used when a primitive omits its material index. */
  readonly defaultMaterial: Material;
  /** Optional per-node instancing data applied to constructed meshes. */
  readonly instancing?: InstancingData | undefined;
}

function field(
  source: Readonly<Record<string, unknown>>,
  key: string,
): unknown {
  return source[key];
}

interface PrimitiveBuildOptions {
  readonly index: number;
  readonly meshDef: Readonly<Record<string, unknown>>;
  readonly primitive: Readonly<Record<string, unknown>>;
  readonly primitiveIndex: number;
  readonly readAccessor: (index: number) => number[];
  readonly materials: readonly GLTFMaterialInfo[];
  readonly defaultMaterial: Material;
  readonly instancing: InstancingData | undefined;
}

interface PrimitiveGeometry {
  readonly geometry: Geometry;
  readonly vertexCount: number;
}

function meshName(
  meshDef: Readonly<Record<string, unknown>>,
  index: number,
): string {
  const name = field(meshDef, "name");
  return typeof name === "string" ? name : `Mesh${index}`;
}

function readRequiredIndex(sourceIndices: number[], index: number): number {
  const value = sourceIndices[index];
  if (value === undefined)
    throw new RangeError(`GLTFLoader: source index ${index} is missing.`);
  return value;
}

function buildPrimitiveIndices(
  primitive: Readonly<Record<string, unknown>>,
  vertexCount: number,
  mode: number,
  readAccessor: (index: number) => number[],
): number[] {
  const sourceIndexValue = field(primitive, "indices");
  const sourceIndices =
    sourceIndexValue === undefined
      ? Array.from({ length: vertexCount }, (_value, item) => item)
      : readAccessor(integer(sourceIndexValue, "primitive.indices"));
  if (mode === 4) return [...sourceIndices];
  const indices: number[] = [];
  if (mode === 5) {
    for (let item = 0; item + 2 < sourceIndices.length; item++) {
      if (item % 2 === 0)
        indices.push(
          readRequiredIndex(sourceIndices, item),
          readRequiredIndex(sourceIndices, item + 1),
          readRequiredIndex(sourceIndices, item + 2),
        );
      else
        indices.push(
          readRequiredIndex(sourceIndices, item + 1),
          readRequiredIndex(sourceIndices, item),
          readRequiredIndex(sourceIndices, item + 2),
        );
    }
  } else {
    for (let item = 1; item + 1 < sourceIndices.length; item++)
      indices.push(
        readRequiredIndex(sourceIndices, 0),
        readRequiredIndex(sourceIndices, item),
        readRequiredIndex(sourceIndices, item + 1),
      );
  }
  return indices;
}

function buildPrimitiveGeometry(
  primitive: Readonly<Record<string, unknown>>,
  readAccessor: (index: number) => number[],
): PrimitiveGeometry {
  const attributes = record(
    field(primitive, "attributes"),
    "primitive.attributes",
  );
  const positionAccessor = integer(
    field(attributes, "POSITION"),
    "primitive.attributes.POSITION",
  );
  const positions = readAccessor(positionAccessor);
  const geometry = new Geometry().setPositions(positions);
  const normal = field(attributes, "NORMAL");
  if (typeof normal === "number")
    geometry.setNormals(
      readAccessor(integer(normal, "primitive.attributes.NORMAL")),
    );
  const texCoord = field(attributes, "TEXCOORD_0");
  if (typeof texCoord === "number")
    geometry.setUVs(
      readAccessor(integer(texCoord, "primitive.attributes.TEXCOORD_0")),
    );
  const color = field(attributes, "COLOR_0");
  if (typeof color === "number") {
    const colors = readAccessor(integer(color, "primitive.attributes.COLOR_0"));
    const components = colors.length / (positions.length / 3);
    geometry.setColors(
      components === 4
        ? colors.filter((_value, component) => component % 4 !== 3)
        : colors,
    );
  }
  return { geometry, vertexCount: positions.length / 3 };
}

function applyInstancing(
  object: InstancedMesh,
  instancing: InstancingData,
): void {
  const position = new Vector3();
  const quaternion = new Quaternion();
  const size = new Vector3(1, 1, 1);
  const matrix = new Matrix4();
  for (let instance = 0; instance < instancing.info.count; instance++) {
    if (instancing.translations)
      position.fromArray(instancing.translations, instance * 3);
    else position.set(0, 0, 0);
    if (instancing.rotations)
      quaternion.fromArray(instancing.rotations, instance * 4);
    else quaternion.set(0, 0, 0, 1);
    if (instancing.scales) size.fromArray(instancing.scales, instance * 3);
    else size.set(1, 1, 1);
    object.setMatrixAt(instance, matrix.compose(position, quaternion, size));
  }
  if (instancing.instanceColor) object.instanceColor = instancing.instanceColor;
}

function buildPrimitive({
  index,
  meshDef,
  primitive,
  primitiveIndex,
  readAccessor,
  materials,
  defaultMaterial,
  instancing,
}: PrimitiveBuildOptions): Mesh {
  const mode = integer(field(primitive, "mode"), "primitive.mode", 4);
  if (mode !== 4 && mode !== 5 && mode !== 6)
    throw new Error(
      `GLTFLoader: primitive mode ${mode} is outside the CPU triangle path.`,
    );
  const { geometry, vertexCount } = buildPrimitiveGeometry(
    primitive,
    readAccessor,
  );
  geometry.index = buildPrimitiveIndices(
    primitive,
    vertexCount,
    mode,
    readAccessor,
  );
  if (geometry.getAttribute("normal") === undefined)
    geometry.computeVertexNormals();
  const materialValue = field(primitive, "material");
  const materialIndex =
    materialValue === undefined
      ? undefined
      : integer(materialValue, "primitive.material");
  const info =
    materialIndex === undefined ? undefined : materials[materialIndex];
  const material = info?.material ?? defaultMaterial;
  const object: Mesh | InstancedMesh = instancing
    ? new InstancedMesh(geometry, material, instancing.info.count)
    : new Mesh(geometry, material);
  if (object instanceof InstancedMesh && instancing)
    applyInstancing(object, instancing);
  object.name = meshName(meshDef, index);
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
  return object;
}

/** Converts a glTF mesh definition into one mesh or a grouped set of primitives. */
export function buildMesh(
  index: number,
  {
    meshes,
    readAccessor,
    materials,
    defaultMaterial,
    instancing,
  }: MeshBuildOptions,
): Group | InstancedMesh | Mesh {
  const meshDef = meshes[index];
  if (!meshDef) throw new RangeError(`GLTFLoader: mesh ${index} is missing.`);
  const primitives = array(
    field(meshDef, "primitives") ?? [],
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
    objects.push(
      buildPrimitive({
        index,
        meshDef,
        primitive,
        primitiveIndex,
        readAccessor,
        materials,
        defaultMaterial,
        instancing,
      }),
    );
  }
  const [object] = objects;
  if (objects.length === 1 && object !== undefined) return object;
  const group = new Group();
  group.name = meshName(meshDef, index);
  group.add(...objects);
  return group;
}
