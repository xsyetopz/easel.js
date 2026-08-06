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

export function parseMaterials(
  document: Readonly<Record<string, unknown>>,
  options: GLTFLoaderOptions,
): { materials: GLTFMaterialInfo[] } {
  const entries = array(document["materials"] ?? [], "materials");
  const textures = array(document["textures"] ?? [], "textures");
  const images = array(document["images"] ?? [], "images");
  const materials = entries.map((value, index) => {
    const source = record(value, `materials[${index}]`);
    const pbr = record(
      source["pbrMetallicRoughness"] ?? {},
      `materials[${index}].pbrMetallicRoughness`,
    );
    const factor =
      pbr["baseColorFactor"] === undefined
        ? [1, 1, 1, 1]
        : numberArray(
            pbr["baseColorFactor"],
            `materials[${index}].baseColorFactor`,
            4,
          );
    const baseColorFactor: [number, number, number, number] = [
      factor[0]!,
      factor[1]!,
      factor[2]!,
      factor[3]!,
    ];
    const textureInfo =
      pbr["baseColorTexture"] === undefined
        ? undefined
        : record(
            pbr["baseColorTexture"],
            `materials[${index}].baseColorTexture`,
          );
    const textureIndex =
      textureInfo === undefined
        ? undefined
        : integer(
            textureInfo["index"],
            `materials[${index}].baseColorTexture.index`,
          );
    const textureSource =
      textureIndex === undefined
        ? undefined
        : record(textures[textureIndex], `textures[${textureIndex}]`)["source"];
    const image =
      typeof textureSource === "number"
        ? record(images[textureSource], `images[${textureSource}]`)
        : undefined;
    const uri =
      image && typeof image["uri"] === "string"
        ? (image["uri"] as string)
        : undefined;
    const bufferView =
      image && typeof image["bufferView"] === "number"
        ? integer(image["bufferView"], "image.bufferView")
        : undefined;
    const mimeType =
      image && typeof image["mimeType"] === "string"
        ? (image["mimeType"] as string)
        : undefined;
    const baseColorTexture =
      textureIndex === undefined
        ? undefined
        : {
            index: textureIndex,
            texCoord: integer(
              textureInfo?.["texCoord"],
              "baseColorTexture.texCoord",
              0,
            ),
            source:
              typeof textureSource === "number" ? textureSource : undefined,
            uri,
            bufferView,
            mimeType,
          };
    const alphaMode =
      source["alphaMode"] === "BLEND" || source["alphaMode"] === "MASK"
        ? source["alphaMode"]
        : "OPAQUE";
    const sourceAlpha = Math.min(1, Math.max(0, baseColorFactor[3]!));
    const alpha = alphaMode === "OPAQUE" ? 1 : sourceAlpha;
    const materialOptions = {
      color: new Color().setRGB(
        baseColorFactor[0]!,
        baseColorFactor[1]!,
        baseColorFactor[2]!,
      ),
      transparent: alphaMode === "BLEND" && alpha < 1,
      opacity:
        alphaMode === "BLEND"
          ? Math.min(8, Math.max(0, Math.round((1 - alpha) * 8)))
          : 0,
      name:
        typeof source["name"] === "string"
          ? (source["name"] as string)
          : `Material${index}`,
    };
    const map =
      textureIndex === undefined
        ? undefined
        : textureFor(options, textureIndex);
    if (map !== undefined) Object.assign(materialOptions, { map });
    if (source["doubleSided"] === true)
      Object.assign(materialOptions, { side: Side.Double });
    const material =
      options.materialType === "basic"
        ? new BasicMaterial(materialOptions)
        : new LambertMaterial(materialOptions);
    return {
      index,
      name: material.name,
      material,
      baseColorFactor,
      baseColorTexture,
      alphaMode,
      alphaCutoff: finite(
        source["alphaCutoff"],
        `materials[${index}].alphaCutoff`,
        0.5,
      ),
      doubleSided: source["doubleSided"] === true,
    } satisfies GLTFMaterialInfo;
  });
  return { materials };
}

export function parseTextureReferences(
  document: Readonly<Record<string, unknown>>,
): GLTFTextureReference[] {
  const textures = array(document["textures"] ?? [], "textures");
  const images = array(document["images"] ?? [], "images");
  return textures.map((value, index) => {
    const texture = record(value, `textures[${index}]`);
    const source =
      typeof texture["source"] === "number"
        ? integer(texture["source"], `textures[${index}].source`)
        : undefined;
    const image =
      source === undefined
        ? undefined
        : record(images[source], `images[${source}]`);
    return {
      index,
      texCoord: 0,
      source,
      uri:
        image && typeof image["uri"] === "string"
          ? (image["uri"] as string)
          : undefined,
      bufferView:
        image && typeof image["bufferView"] === "number"
          ? integer(image["bufferView"], `images[${source}].bufferView`)
          : undefined,
      mimeType:
        image && typeof image["mimeType"] === "string"
          ? (image["mimeType"] as string)
          : undefined,
    };
  });
}
