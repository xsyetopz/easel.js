import { Side } from "../../core/Constants.ts";
import { BasicMaterial } from "../../materials/BasicMaterial.ts";
import { LambertMaterial } from "../../materials/LambertMaterial.ts";
import { Color } from "../../math/Color.ts";
import type { Texture } from "../../textures/Texture.ts";
import type {
  GLTFLoaderOptions,
  GLTFMaterialInfo,
  GLTFTextureReference,
} from "../GLTFLoader.ts";
import { array, finite, integer, numberArray, record } from "./validation.ts";

/** Creates the glTF default material used by primitives without a material index. */
export function createDefaultMaterial(options: GLTFLoaderOptions) {
  return options.materialType === "basic"
    ? new BasicMaterial()
    : new LambertMaterial();
}

/** Resolves a texture index from the loader's map or numeric texture table. */
export function textureFor(
  options: GLTFLoaderOptions,
  index: number,
): Texture | undefined {
  const textures = options.textures;
  if (!textures) return;
  if (textures instanceof Map) return textures.get(index);
  const table = textures as Readonly<Record<number | string, Texture>>;
  return table[index] ?? table[String(index)];
}

function property(
  value: Readonly<Record<string, unknown>> | undefined,
  key: string,
): unknown {
  return value?.[key];
}

function parseBaseColorFactor(
  pbr: Readonly<Record<string, unknown>>,
  path: string,
): [number, number, number, number] {
  const rawFactor = property(pbr, "baseColorFactor");
  const factor =
    rawFactor === undefined ? [1, 1, 1, 1] : numberArray(rawFactor, path, 4);
  const [red, green, blue, alpha] = factor;
  if (
    red === undefined ||
    green === undefined ||
    blue === undefined ||
    alpha === undefined
  ) {
    throw new RangeError(`GLTFLoader: ${path} must contain 4 values.`);
  }
  return [red, green, blue, alpha];
}

function parseImageMetadata(
  image: Readonly<Record<string, unknown>> | undefined,
  path: string,
): Pick<GLTFTextureReference, "uri" | "bufferView" | "mimeType"> {
  const uri = property(image, "uri");
  const bufferView = property(image, "bufferView");
  const mimeType = property(image, "mimeType");
  return {
    uri: typeof uri === "string" ? uri : undefined,
    bufferView:
      typeof bufferView === "number"
        ? integer(bufferView, `${path}.bufferView`)
        : undefined,
    mimeType: typeof mimeType === "string" ? mimeType : undefined,
  };
}

function parseBaseColorTexture(
  pbr: Readonly<Record<string, unknown>>,
  textures: readonly unknown[],
  images: readonly unknown[],
  materialIndex: number,
): GLTFTextureReference | undefined {
  const rawTextureInfo = property(pbr, "baseColorTexture");
  if (rawTextureInfo === undefined) return;
  const path = `materials[${materialIndex}].baseColorTexture`;
  const textureInfo = record(rawTextureInfo, path);
  const index = integer(property(textureInfo, "index"), `${path}.index`);
  const texture = record(textures[index], `textures[${index}]`);
  const rawSource = property(texture, "source");
  const source = typeof rawSource === "number" ? rawSource : undefined;
  const image =
    source === undefined
      ? undefined
      : record(images[source], `images[${source}]`);
  return {
    index,
    texCoord: integer(
      property(textureInfo, "texCoord"),
      "baseColorTexture.texCoord",
      0,
    ),
    source,
    ...parseImageMetadata(image, "image"),
  };
}

function parseAlphaMode(
  source: Readonly<Record<string, unknown>>,
): "OPAQUE" | "MASK" | "BLEND" {
  const mode = property(source, "alphaMode");
  return mode === "BLEND" || mode === "MASK" ? mode : "OPAQUE";
}

interface MaterialProperties {
  readonly baseColorFactor: [number, number, number, number];
  readonly baseColorTexture: GLTFTextureReference | undefined;
  readonly alphaMode: "OPAQUE" | "MASK" | "BLEND";
}

interface MaterialParseContext {
  readonly textures: readonly unknown[];
  readonly images: readonly unknown[];
  readonly options: GLTFLoaderOptions;
}

function createMaterial(
  source: Readonly<Record<string, unknown>>,
  options: GLTFLoaderOptions,
  index: number,
  { baseColorFactor, baseColorTexture, alphaMode }: MaterialProperties,
): BasicMaterial | LambertMaterial {
  const alpha =
    alphaMode === "OPAQUE" ? 1 : Math.min(1, Math.max(0, baseColorFactor[3]));
  const rawName = property(source, "name");
  const materialOptions = {
    color: new Color().setRGB(
      baseColorFactor[0],
      baseColorFactor[1],
      baseColorFactor[2],
    ),
    transparent: alphaMode === "BLEND" && alpha < 1,
    opacity:
      alphaMode === "BLEND"
        ? Math.min(8, Math.max(0, Math.round((1 - alpha) * 8)))
        : 0,
    name: typeof rawName === "string" ? rawName : `Material${index}`,
  };
  if (baseColorTexture !== undefined) {
    const map = textureFor(options, baseColorTexture.index);
    if (map !== undefined) Object.assign(materialOptions, { map });
  }
  if (property(source, "doubleSided") === true) {
    Object.assign(materialOptions, { side: Side.Double });
  }
  return options.materialType === "basic"
    ? new BasicMaterial(materialOptions)
    : new LambertMaterial(materialOptions);
}

function parseMaterial(
  value: unknown,
  index: number,
  { textures, images, options }: MaterialParseContext,
): GLTFMaterialInfo {
  const source = record(value, `materials[${index}]`);
  const pbr = record(
    property(source, "pbrMetallicRoughness") ?? {},
    `materials[${index}].pbrMetallicRoughness`,
  );
  const baseColorFactor = parseBaseColorFactor(
    pbr,
    `materials[${index}].baseColorFactor`,
  );
  const baseColorTexture = parseBaseColorTexture(pbr, textures, images, index);
  const alphaMode = parseAlphaMode(source);
  const material = createMaterial(source, options, index, {
    baseColorFactor,
    baseColorTexture,
    alphaMode,
  });
  return {
    index,
    name: material.name,
    material,
    baseColorFactor,
    baseColorTexture,
    alphaMode,
    alphaCutoff: finite(
      property(source, "alphaCutoff"),
      `materials[${index}].alphaCutoff`,
      0.5,
    ),
    doubleSided: property(source, "doubleSided") === true,
  } satisfies GLTFMaterialInfo;
}

/** Builds renderer materials and base-color texture metadata from glTF materials. */
export function parseMaterials(
  document: Readonly<Record<string, unknown>>,
  options: GLTFLoaderOptions,
): { materials: GLTFMaterialInfo[] } {
  const entries = array(property(document, "materials") ?? [], "materials");
  const textures = array(property(document, "textures") ?? [], "textures");
  const images = array(property(document, "images") ?? [], "images");
  const context = { textures, images, options };
  const materials = entries.map((value, index) =>
    parseMaterial(value, index, context),
  );
  return { materials };
}

/** Extracts image source metadata for each texture declared in the document. */
export function parseTextureReferences(
  document: Readonly<Record<string, unknown>>,
): GLTFTextureReference[] {
  const textures = array(property(document, "textures") ?? [], "textures");
  const images = array(property(document, "images") ?? [], "images");
  return textures.map((value, index) => {
    const texture = record(value, `textures[${index}]`);
    const rawSource = property(texture, "source");
    const source =
      typeof rawSource === "number"
        ? integer(rawSource, `textures[${index}].source`)
        : undefined;
    const image =
      source === undefined
        ? undefined
        : record(images[source], `images[${source}]`);
    return {
      index,
      texCoord: 0,
      source,
      ...parseImageMetadata(image, `images[${source}]`),
    };
  });
}
