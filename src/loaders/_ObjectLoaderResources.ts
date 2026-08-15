import type {
  AnimationClip,
  AnimationClipJSON,
} from "../animation/AnimationClip.ts";
import { Shape } from "../curves/Shape.ts";
import type { Geometry } from "../geometry/Geometry.ts";
import type { Material } from "../materials/Material.ts";
import { Texture } from "../textures/Texture.ts";
import {
  hydrateUuid,
  isRecord,
  type ObjectRecord,
  optionalString,
  optionalTuple,
} from "./_ObjectLoaderHelpers.ts";
import { AnimationLoader } from "./AnimationLoader.ts";
import { GeometryLoader } from "./GeometryLoader.ts";
import type { Loader } from "./Loader.ts";
import { MaterialLoader } from "./MaterialLoader.ts";

/** Copies the relevant parent loader configuration to a delegated loader. */
function configureLoader<T extends Loader>(loader: T, parent: Loader): T {
  loader.cache = parent.cache;
  loader.path = parent.path;
  loader.requestHeader = parent.requestHeader;
  return loader;
}

/** Parses supported geometry records with the canonical GeometryLoader. */
export function parseGeometryRecords(
  parent: Loader,
  json: ObjectRecord,
): Map<string, Geometry> {
  const geometries = new Map<string, Geometry>();
  const list = json.geometries;
  if (list === undefined) return geometries;
  if (!Array.isArray(list)) {
    throw new TypeError("ObjectLoader: geometries must be an array.");
  }
  for (const entry of list) {
    if (!isRecord(entry)) {
      throw new TypeError("ObjectLoader: each geometry must be a record.");
    }
    const type = optionalString(entry, "type", "");
    const uuid = optionalString(entry, "uuid", "");
    if (uuid === "") {
      console.warn("ObjectLoader: geometry entry missing uuid, skipping.");
      continue;
    }
    let geometry: Geometry | undefined;
    if (type === "Geometry" || type === "BufferGeometry") {
      const loader = configureLoader(
        new GeometryLoader(parent.manager),
        parent,
      );
      geometry = loader.parse(
        entry as unknown as Parameters<typeof loader.parse>[0],
      );
    } else {
      console.warn(
        `ObjectLoader: unsupported geometry type "${type}", skipping.`,
      );
      continue;
    }
    geometries.set(uuid, geometry);
  }
  return geometries;
}

/** Parses material data from JSON with MaterialLoader. */
export function parseMaterialRecords(
  parent: Loader,
  json: ObjectRecord,
  geometries: Map<string, Geometry>,
  textures: Map<string, Texture>,
): Map<string, Material> {
  void geometries;
  const materials = new Map<string, Material>();
  const list = json.materials;
  if (list === undefined) return materials;
  if (!Array.isArray(list)) {
    throw new TypeError("ObjectLoader: materials must be an array.");
  }
  const loader = configureLoader(new MaterialLoader(parent.manager), parent);
  loader.textures = textures;
  for (const entry of list) {
    if (!isRecord(entry)) {
      throw new TypeError("ObjectLoader: each material must be a record.");
    }
    const uuid = optionalString(entry, "uuid", "");
    if (uuid === "") {
      console.warn("ObjectLoader: material entry missing uuid, skipping.");
      continue;
    }
    materials.set(uuid, loader.parse(entry));
  }
  return materials;
}

/** Parses animation clips from JSON with AnimationLoader. */
export function parseAnimationRecords(
  parent: Loader,
  json: ObjectRecord,
): AnimationClip[] {
  const list = json.animations;
  if (list === undefined) return [];
  if (!Array.isArray(list)) {
    throw new TypeError("ObjectLoader: animations must be an array.");
  }
  const loader = configureLoader(new AnimationLoader(parent.manager), parent);
  return loader.parse(list as AnimationClipJSON[]);
}

/** Parses image URL references from JSON into a UUID map. */
export function parseImageRecords(json: ObjectRecord): Map<string, unknown> {
  const images = new Map<string, unknown>();
  const list = json.images;
  if (list === undefined) return images;
  if (!Array.isArray(list)) {
    throw new TypeError("ObjectLoader: images must be an array.");
  }
  for (const entry of list) {
    if (!isRecord(entry)) {
      throw new TypeError("ObjectLoader: each image must be a record.");
    }
    const uuid = optionalString(entry, "uuid", "");
    if (uuid === "") {
      console.warn("ObjectLoader: image entry missing uuid, skipping.");
      continue;
    }
    const url = optionalString(entry, "url", "");
    if (url !== "") images.set(uuid, url);
  }
  return images;
}

/** Parses shape data from JSON using Shape.fromJSON. */
export function parseShapeRecords(json: ObjectRecord): Map<string, Shape> {
  const shapes = new Map<string, Shape>();
  const list = json.shapes;
  if (list === undefined) return shapes;
  if (!Array.isArray(list)) {
    throw new TypeError("ObjectLoader: shapes must be an array.");
  }
  for (const entry of list) {
    if (!isRecord(entry)) {
      throw new TypeError("ObjectLoader: each shape must be a record.");
    }
    const uuid = optionalString(entry, "uuid", "");
    if (uuid === "") {
      console.warn("ObjectLoader: shape entry missing uuid, skipping.");
      continue;
    }
    shapes.set(uuid, new Shape().fromJSON(entry));
  }
  return shapes;
}

/** Parses texture data from JSON, creating Texture instances. */
export function parseTextureRecords(
  json: ObjectRecord,
  images: Map<string, unknown>,
): Map<string, Texture> {
  void images;
  const textures = new Map<string, Texture>();
  const list = json.textures;
  if (list === undefined) return textures;
  if (!Array.isArray(list)) {
    throw new TypeError("ObjectLoader: textures must be an array.");
  }
  for (const entry of list) {
    if (!isRecord(entry)) {
      throw new TypeError("ObjectLoader: each texture must be a record.");
    }
    const uuid = optionalString(entry, "uuid", "");
    if (uuid === "") {
      console.warn("ObjectLoader: texture entry missing uuid, skipping.");
      continue;
    }
    textures.set(uuid, parseTexture(entry));
  }
  return textures;
}

function parseTexture(entry: ObjectRecord): Texture {
  const texture = new Texture();
  const values = {} as Record<string, unknown> & {
    center?: unknown;
    offset?: unknown;
    repeat?: unknown;
    wrapS?: unknown;
    wrapT?: unknown;
  };
  for (const [key, value] of Object.entries(entry)) {
    if (
      key === "metadata" ||
      key === "uuid" ||
      key === "image" ||
      key === "wrap" ||
      key === "repeat" ||
      key === "offset" ||
      key === "center"
    ) {
      continue;
    }
    values[key] = value;
  }
  const wrap = optionalTuple(entry, "wrap", 2);
  if (wrap !== undefined) {
    values.wrapS = wrap[0];
    values.wrapT = wrap[1];
  }
  const repeat = optionalTuple(entry, "repeat", 2);
  if (repeat !== undefined) {
    values.repeat = { x: repeat[0], y: repeat[1] };
  }
  const offset = optionalTuple(entry, "offset", 2);
  if (offset !== undefined) {
    values.offset = { x: offset[0], y: offset[1] };
  }
  const center = optionalTuple(entry, "center", 2);
  if (center !== undefined) {
    values.center = { x: center[0], y: center[1] };
  }
  texture.assign(values);
  hydrateUuid(texture, entry);
  const imageUuid = optionalString(entry, "image", "");
  if (imageUuid !== "") {
    texture.userData = { ...texture.userData, image: imageUuid };
  }
  return texture;
}
