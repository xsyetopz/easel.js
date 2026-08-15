import type { GLTFVariantInfo, GLTFVariantMapping } from "../GLTFLoader.ts";
import { array, integer, record } from "./validation.ts";

function getField(
  value: Readonly<Record<string, unknown>> | undefined,
  key: string,
): unknown {
  return value?.[key];
}

function parseVariantInfos(
  document: Readonly<Record<string, unknown>>,
): GLTFVariantInfo[] {
  const documentExtensions = getField(document, "extensions");
  const extensionRoot =
    documentExtensions === undefined
      ? undefined
      : record(documentExtensions, "extensions");
  const extensionValue = getField(extensionRoot, "KHR_materials_variants");
  const variantValues =
    extensionValue === undefined
      ? []
      : array(
          getField(
            record(extensionValue, "extensions.KHR_materials_variants"),
            "variants",
          ) ?? [],
          "extensions.KHR_materials_variants.variants",
        );
  return variantValues.map((value, index) => {
    const variant = record(
      value,
      `extensions.KHR_materials_variants.variants[${index}]`,
    );
    const name = getField(variant, "name");
    return {
      index,
      name: typeof name === "string" ? name : `Variant${index}`,
    } satisfies GLTFVariantInfo;
  });
}

function parseVariantIds(
  value: unknown,
  path: string,
  variantCount: number,
): number[] {
  const variantIds = array(value, path).map((item, index) =>
    integer(item, `variant mapping.variants[${index}]`),
  );
  for (const variantId of variantIds) {
    if (variantId < 0 || variantId >= variantCount)
      throw new RangeError(
        `GLTFLoader: variant index ${variantId} is out of range.`,
      );
  }
  return variantIds;
}

function parsePrimitiveVariantMappings(
  value: unknown,
  meshIndex: number,
  primitiveIndex: number,
  variantCount: number,
): GLTFVariantMapping[] {
  const primitive = record(
    value,
    `meshes[${meshIndex}].primitives[${primitiveIndex}]`,
  );
  const primitiveExtensions = getField(primitive, "extensions");
  const primitiveRoot =
    primitiveExtensions === undefined
      ? undefined
      : record(
          primitiveExtensions,
          `meshes[${meshIndex}].primitives[${primitiveIndex}].extensions`,
        );
  const variantExtension = getField(primitiveRoot, "KHR_materials_variants");
  if (variantExtension === undefined) return [];
  const mappingsPath = `meshes[${meshIndex}].primitives[${primitiveIndex}].extensions.KHR_materials_variants.mappings`;
  const variantMappings = array(
    getField(
      record(variantExtension, "primitive.extensions.KHR_materials_variants"),
      "mappings",
    ),
    mappingsPath,
  );
  return variantMappings.map((mapping, mappingIndex) => {
    const mappingRecord = record(mapping, `${mappingsPath}[${mappingIndex}]`);
    return {
      mesh: meshIndex,
      primitive: primitiveIndex,
      material: integer(
        getField(mappingRecord, "material"),
        "variant mapping.material",
      ),
      variants: parseVariantIds(
        getField(mappingRecord, "variants"),
        "variant mapping.variants",
        variantCount,
      ),
    };
  });
}

function parseVariantMappings(
  meshes: readonly Readonly<Record<string, unknown>>[],
  variantCount: number,
): GLTFVariantMapping[] {
  const mappings: GLTFVariantMapping[] = [];
  for (let meshIndex = 0; meshIndex < meshes.length; meshIndex++) {
    const primitives = array(
      getField(meshes[meshIndex], "primitives") ?? [],
      `meshes[${meshIndex}].primitives`,
    );
    for (
      let primitiveIndex = 0;
      primitiveIndex < primitives.length;
      primitiveIndex++
    )
      mappings.push(
        ...parsePrimitiveVariantMappings(
          primitives[primitiveIndex],
          meshIndex,
          primitiveIndex,
          variantCount,
        ),
      );
  }
  return mappings;
}

/** Parses KHR_materials_variants declarations and primitive material mappings. */
export function parseVariants(
  document: Readonly<Record<string, unknown>>,
  meshes: readonly Readonly<Record<string, unknown>>[],
): { variants: GLTFVariantInfo[]; mappings: GLTFVariantMapping[] } {
  const variants = parseVariantInfos(document);
  return { variants, mappings: parseVariantMappings(meshes, variants.length) };
}
