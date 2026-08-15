import type {
  GLTFInstanceAttributeInfo,
  GLTFNodeInstancingInfo,
  GLTFNodeLODInfo,
} from "../GLTFLoader.ts";
import { parseVariants as parseVariantDeclarations } from "./variants.ts";
import type { AccessorRecord } from "./buffer.ts";
import { COMPONENT_COUNT } from "./buffer.ts";
import type { NodeRecord } from "./nodes.ts";
import { array, integer, numberArray, record } from "./validation.ts";

/** Parses KHR_materials_variants data from a glTF document and its meshes. */
export function parseVariants(
  document: Readonly<Record<string, unknown>>,
  meshes: readonly Readonly<Record<string, unknown>>[],
): ReturnType<typeof parseVariantDeclarations> {
  return parseVariantDeclarations(document, meshes);
}

/** Decoded attributes used to populate one node's mesh instances. */
export interface InstancingData {
  /** Metadata and decoded accessor entries for the node. */
  readonly info: GLTFNodeInstancingInfo;
  /** Per-instance translation components, when supplied by the extension. */
  readonly translations?: readonly number[];
  /** Per-instance rotation quaternion components, when supplied. */
  readonly rotations?: readonly number[];
  /** Per-instance scale components, when supplied. */
  readonly scales?: readonly number[];
  /** Per-instance RGB colors converted to float values. */
  readonly instanceColor?: Float32Array;
}

/** Shared state used while constructing nodes and extension features. */
export interface BuildContext {
  /** Decoded instancing data keyed by node index. */
  readonly instancing: Map<number, InstancingData>;
  /** MSFT_lod definitions keyed by their root node index. */
  readonly lods: Map<number, GLTFNodeLODInfo>;
  /** Nodes currently being expanded as LOD roots, preventing recursion loops. */
  readonly activeLods: Set<number>;
  /** Scale applied when converting screen coverage to LOD distances. */
  readonly lodDistanceScale: number;
}

function getField(
  value: Readonly<Record<string, unknown>> | undefined,
  key: string,
): unknown {
  return value?.[key];
}

function getNodeExtension(
  source: NodeRecord,
  name: string,
  path: string,
): Readonly<Record<string, unknown>> | undefined {
  if (source.extensions === undefined) return;
  const value = getField(source.extensions, name);
  return value === undefined ? undefined : record(value, path);
}

const INSTANCE_TYPES: Readonly<Record<string, string>> = {
  ROTATION: "VEC4",
  TRANSLATION: "VEC3",
  SCALE: "VEC3",
};

function expectedInstanceType(semantic: string): string | undefined {
  return Object.hasOwn(INSTANCE_TYPES, semantic)
    ? INSTANCE_TYPES[semantic]
    : undefined;
}

function validateInstanceAccessor(
  semantic: string,
  accessor: AccessorRecord,
): void {
  const expectedType = expectedInstanceType(semantic);
  if (expectedType !== undefined && accessor.type !== expectedType)
    throw new Error(
      `GLTFLoader: instancing attribute ${semantic} must use ${expectedType}.`,
    );
  const isTransform =
    semantic === "TRANSLATION" ||
    semantic === "ROTATION" ||
    semantic === "SCALE";
  const isValidComponent =
    accessor.componentType === 5126 ||
    (semantic === "ROTATION" &&
      accessor.normalized === true &&
      (accessor.componentType === 5120 || accessor.componentType === 5122));
  if (isTransform && !isValidComponent)
    throw new Error(
      "GLTFLoader: instancing attribute uses an unsupported component type.",
    );
}

function decodeInstanceColor(
  semantic: string,
  accessor: AccessorRecord,
  values: readonly number[],
): Float32Array | undefined {
  if (
    semantic !== "_COLOR_0" &&
    semantic !== "_COLOR" &&
    semantic !== "COLOR_0"
  )
    return;
  const components = COMPONENT_COUNT[accessor.type];
  if (components !== 3 && components !== 4)
    throw new Error(
      `GLTFLoader: instancing color attribute ${semantic} must use VEC3 or VEC4.`,
    );
  const colors = new Float32Array(accessor.count * 3);
  for (let item = 0; item < accessor.count; item++) {
    colors[item * 3] = values[item * components] ?? 1;
    colors[item * 3 + 1] = values[item * components + 1] ?? 1;
    colors[item * 3 + 2] = values[item * components + 2] ?? 1;
  }
  return colors;
}

function assignInstanceTransform(
  semantic: string,
  values: readonly number[],
  result: {
    translations?: readonly number[];
    rotations?: readonly number[];
    scales?: readonly number[];
  },
): void {
  if (semantic === "TRANSLATION") result.translations = values;
  else if (semantic === "ROTATION") result.rotations = values;
  else if (semantic === "SCALE") result.scales = values;
}

function decodeInstanceAttribute({
  semantic,
  value,
  nodeIndex,
  accessors,
  readAccessor,
}: {
  semantic: string;
  value: unknown;
  nodeIndex: number;
  accessors: readonly AccessorRecord[];
  readAccessor: (index: number) => number[];
}): {
  attribute: GLTFInstanceAttributeInfo;
  count: number;
  values: readonly number[];
  color: Float32Array | undefined;
} {
  const accessorIndex = integer(
    value,
    `nodes[${nodeIndex}].extensions.EXT_mesh_gpu_instancing.attributes.${semantic}`,
  );
  const accessor = accessors[accessorIndex];
  if (!accessor)
    throw new RangeError(
      `GLTFLoader: instancing accessor ${accessorIndex} is missing.`,
    );
  validateInstanceAccessor(semantic, accessor);
  const values = readAccessor(accessorIndex);
  return {
    attribute: {
      semantic,
      accessor: accessorIndex,
      type: accessor.type,
      count: accessor.count,
      values,
      normalized: accessor.normalized === true,
    },
    count: accessor.count,
    values,
    color: decodeInstanceColor(semantic, accessor, values),
  };
}

/** Decodes EXT_mesh_gpu_instancing attributes for a node's instances. */
export function parseInstancing(
  nodeIndex: number,
  source: NodeRecord,
  accessors: readonly AccessorRecord[],
  readAccessor: (index: number) => number[],
): InstancingData | undefined {
  const extensionValue = getNodeExtension(
    source,
    "EXT_mesh_gpu_instancing",
    `nodes[${nodeIndex}].extensions.EXT_mesh_gpu_instancing`,
  );
  if (extensionValue === undefined) return;
  const attributes = record(
    getField(extensionValue, "attributes"),
    `nodes[${nodeIndex}].extensions.EXT_mesh_gpu_instancing.attributes`,
  );
  const entries = Object.entries(attributes);
  if (entries.length === 0) return;
  const decoded: Record<string, GLTFInstanceAttributeInfo> = {};
  const result: {
    translations?: readonly number[];
    rotations?: readonly number[];
    scales?: readonly number[];
    instanceColor?: Float32Array | undefined;
  } = {};
  let count: number | undefined;
  for (const [semantic, value] of entries) {
    const decodedAttribute = decodeInstanceAttribute({
      semantic,
      value,
      nodeIndex,
      accessors,
      readAccessor,
    });
    if (count !== undefined && decodedAttribute.count !== count)
      throw new Error(
        "GLTFLoader: instancing attributes must have the same count.",
      );
    count = decodedAttribute.count;
    decoded[semantic] = decodedAttribute.attribute;
    assignInstanceTransform(semantic, decodedAttribute.values, result);
    result.instanceColor = decodedAttribute.color ?? result.instanceColor;
  }
  return {
    info: {
      node: nodeIndex,
      count: count ?? 0,
      attributes: decoded,
    },
    ...(result.translations === undefined
      ? {}
      : { translations: result.translations }),
    ...(result.rotations === undefined ? {} : { rotations: result.rotations }),
    ...(result.scales === undefined ? {} : { scales: result.scales }),
    ...(result.instanceColor === undefined
      ? {}
      : { instanceColor: result.instanceColor }),
  };
}

/** Parses MSFT_lod node references and optional screen-coverage distances. */
export function parseLOD(
  nodeIndex: number,
  source: NodeRecord,
  nodeCount: number,
): GLTFNodeLODInfo | undefined {
  const extensionValue = getNodeExtension(
    source,
    "MSFT_lod",
    `nodes[${nodeIndex}].extensions.MSFT_lod`,
  );
  if (extensionValue === undefined) return;
  const ids = array(
    getField(extensionValue, "ids"),
    `nodes[${nodeIndex}].extensions.MSFT_lod.ids`,
  ).map((value, index) =>
    integer(value, `nodes[${nodeIndex}].extensions.MSFT_lod.ids[${index}]`),
  );
  const seen = new Set<number>();
  for (const id of ids) {
    if (id < 0 || id >= nodeCount)
      throw new RangeError(
        `GLTFLoader: MSFT_lod node id ${id} is out of range.`,
      );
    if (id === nodeIndex || seen.has(id))
      throw new Error(
        `GLTFLoader: MSFT_lod ids for node ${nodeIndex} must be unique and cannot reference itself.`,
      );
    seen.add(id);
  }
  const extras = source.extras;
  let screenCoverage: readonly number[] | undefined;
  if (extras !== null && typeof extras === "object" && !Array.isArray(extras)) {
    const coverage = getField(
      extras as Readonly<Record<string, unknown>>,
      "MSFT_screencoverage",
    );
    if (coverage !== undefined)
      screenCoverage = numberArray(
        coverage,
        `nodes[${nodeIndex}].extras.MSFT_screencoverage`,
      );
  }
  return { node: nodeIndex, ids, screenCoverage };
}
