import type {
  GLTFInstanceAttributeInfo,
  GLTFNodeInstancingInfo,
  GLTFNodeLODInfo,
  GLTFVariantInfo,
  GLTFVariantMapping,
} from "../GLTFLoader.ts";
import type { AccessorRecord } from "./buffer.ts";
import { COMPONENT_COUNT } from "./buffer.ts";
import type { NodeRecord } from "./nodes.ts";
import { array, integer, numberArray, record } from "./validation.ts";

export interface InstancingData {
  readonly info: GLTFNodeInstancingInfo;
  readonly translations?: readonly number[];
  readonly rotations?: readonly number[];
  readonly scales?: readonly number[];
  readonly instanceColor?: Float32Array;
}

export interface BuildContext {
  readonly instancing: Map<number, InstancingData>;
  readonly lods: Map<number, GLTFNodeLODInfo>;
  readonly activeLods: Set<number>;
  readonly lodDistanceScale: number;
}

export function parseVariants(
  document: Readonly<Record<string, unknown>>,
  meshes: readonly Readonly<Record<string, unknown>>[],
): { variants: GLTFVariantInfo[]; mappings: GLTFVariantMapping[] } {
  const documentExtensions = document["extensions"];
  const extensionRoot =
    documentExtensions === undefined
      ? undefined
      : record(documentExtensions, "extensions");
  const extensionValue = extensionRoot?.["KHR_materials_variants"];
  const variantValues =
    extensionValue === undefined
      ? []
      : array(
          record(extensionValue, "extensions.KHR_materials_variants")[
            "variants"
          ] ?? [],
          "extensions.KHR_materials_variants.variants",
        );
  const variants = variantValues.map((value, index) => {
    const variant = record(
      value,
      `extensions.KHR_materials_variants.variants[${index}]`,
    );
    return {
      index,
      name:
        typeof variant["name"] === "string"
          ? (variant["name"] as string)
          : `Variant${index}`,
    } satisfies GLTFVariantInfo;
  });
  const mappings: GLTFVariantMapping[] = [];
  for (let meshIndex = 0; meshIndex < meshes.length; meshIndex++) {
    const primitives = array(
      meshes[meshIndex]!["primitives"] ?? [],
      `meshes[${meshIndex}].primitives`,
    );
    for (
      let primitiveIndex = 0;
      primitiveIndex < primitives.length;
      primitiveIndex++
    ) {
      const primitive = record(
        primitives[primitiveIndex],
        `meshes[${meshIndex}].primitives[${primitiveIndex}]`,
      );
      const primitiveExtensions = primitive["extensions"];
      const primitiveRoot =
        primitiveExtensions === undefined
          ? undefined
          : record(
              primitiveExtensions,
              `meshes[${meshIndex}].primitives[${primitiveIndex}].extensions`,
            );
      const variantExtension = primitiveRoot?.["KHR_materials_variants"];
      if (variantExtension === undefined) continue;
      const variantMappings = array(
        record(variantExtension, "primitive.extensions.KHR_materials_variants")[
          "mappings"
        ],
        `meshes[${meshIndex}].primitives[${primitiveIndex}].extensions.KHR_materials_variants.mappings`,
      );
      for (
        let mappingIndex = 0;
        mappingIndex < variantMappings.length;
        mappingIndex++
      ) {
        const mapping = record(
          variantMappings[mappingIndex],
          `meshes[${meshIndex}].primitives[${primitiveIndex}].extensions.KHR_materials_variants.mappings[${mappingIndex}]`,
        );
        const material = integer(
          mapping["material"],
          "variant mapping.material",
        );
        const variantIds = array(
          mapping["variants"],
          "variant mapping.variants",
        ).map((value, index) =>
          integer(value, `variant mapping.variants[${index}]`),
        );
        for (const variant of variantIds)
          if (variant < 0 || variant >= variants.length)
            throw new RangeError(
              `GLTFLoader: variant index ${variant} is out of range.`,
            );
        mappings.push({
          mesh: meshIndex,
          primitive: primitiveIndex,
          material,
          variants: variantIds,
        });
      }
    }
  }
  return { variants, mappings };
}

export function parseInstancing(
  nodeIndex: number,
  source: NodeRecord,
  accessors: readonly AccessorRecord[],
  readAccessor: (index: number) => number[],
): InstancingData | undefined {
  const extensionValue = source.extensions?.["EXT_mesh_gpu_instancing"];
  if (extensionValue === undefined) return;
  const extension = record(
    extensionValue,
    `nodes[${nodeIndex}].extensions.EXT_mesh_gpu_instancing`,
  );
  const attributes = record(
    extension["attributes"],
    `nodes[${nodeIndex}].extensions.EXT_mesh_gpu_instancing.attributes`,
  );
  const entries = Object.entries(attributes);
  if (entries.length === 0) return;
  const decoded: Record<string, GLTFInstanceAttributeInfo> = {};
  let count: number | undefined;
  let translations: readonly number[] | undefined;
  let rotations: readonly number[] | undefined;
  let scales: readonly number[] | undefined;
  let instanceColor: Float32Array | undefined;
  for (const [semantic, value] of entries) {
    const accessorIndex = integer(
      value,
      `nodes[${nodeIndex}].extensions.EXT_mesh_gpu_instancing.attributes.${semantic}`,
    );
    const accessor = accessors[accessorIndex];
    if (!accessor)
      throw new RangeError(
        `GLTFLoader: instancing accessor ${accessorIndex} is missing.`,
      );
    const expectedType =
      semantic === "ROTATION"
        ? "VEC4"
        : semantic === "TRANSLATION" || semantic === "SCALE"
          ? "VEC3"
          : undefined;
    if (expectedType !== undefined && accessor.type !== expectedType) {
      throw new Error(
        `GLTFLoader: instancing attribute ${semantic} must use ${expectedType}.`,
      );
    }
    if (
      semantic === "TRANSLATION" || semantic === "SCALE"
        ? accessor.componentType !== 5126
        : semantic === "ROTATION" &&
          accessor.componentType !== 5126 &&
          !(
            accessor.normalized === true &&
            (accessor.componentType === 5120 || accessor.componentType === 5122)
          )
    ) {
      throw new Error(
        "GLTFLoader: instancing attribute uses an unsupported component type.",
      );
    }
    if (count !== undefined && accessor.count !== count)
      throw new Error(
        "GLTFLoader: instancing attributes must have the same count.",
      );
    count = accessor.count;
    const values = readAccessor(accessorIndex);
    decoded[semantic] = {
      semantic,
      accessor: accessorIndex,
      type: accessor.type,
      count: accessor.count,
      values,
      normalized: accessor.normalized === true,
    };
    if (semantic === "TRANSLATION") translations = values;
    else if (semantic === "ROTATION") rotations = values;
    else if (semantic === "SCALE") scales = values;
    else if (
      semantic === "_COLOR_0" ||
      semantic === "_COLOR" ||
      semantic === "COLOR_0"
    ) {
      const components = COMPONENT_COUNT[accessor.type];
      if (components !== 3 && components !== 4)
        throw new Error(
          `GLTFLoader: instancing color attribute ${semantic} must use VEC3 or VEC4.`,
        );
      instanceColor = new Float32Array(accessor.count * 3);
      for (let item = 0; item < accessor.count; item++) {
        instanceColor[item * 3] = values[item * components] ?? 1;
        instanceColor[item * 3 + 1] = values[item * components + 1] ?? 1;
        instanceColor[item * 3 + 2] = values[item * components + 2] ?? 1;
      }
    }
  }
  const info: GLTFNodeInstancingInfo = {
    node: nodeIndex,
    count: count ?? 0,
    attributes: decoded,
  };
  return {
    info,
    ...(translations === undefined ? {} : { translations }),
    ...(rotations === undefined ? {} : { rotations }),
    ...(scales === undefined ? {} : { scales }),
    ...(instanceColor === undefined ? {} : { instanceColor }),
  };
}

export function parseLOD(
  nodeIndex: number,
  source: NodeRecord,
  nodeCount: number,
): GLTFNodeLODInfo | undefined {
  const extensionValue = source.extensions?.["MSFT_lod"];
  if (extensionValue === undefined) return;
  const extension = record(
    extensionValue,
    `nodes[${nodeIndex}].extensions.MSFT_lod`,
  );
  const ids = array(
    extension["ids"],
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
    const coverage = (extras as Readonly<Record<string, unknown>>)[
      "MSFT_screencoverage"
    ];
    if (coverage !== undefined)
      screenCoverage = numberArray(
        coverage,
        `nodes[${nodeIndex}].extras.MSFT_screencoverage`,
      );
  }
  return { node: nodeIndex, ids, screenCoverage };
}
