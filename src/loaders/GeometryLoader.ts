import {
  Attribute,
  type AttributeArray,
  toNormalizedTypeName,
  toType,
} from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { Sphere } from "../math/Sphere.ts";
import { Vector3 } from "../math/Vector3.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";

interface AttributeJSON {
  itemSize: number;
  type?: string;
  array: number[];
  normalized?: boolean;
  name?: string;
}

interface IndexJSON {
  type?: string;
  array: number[];
}

interface GeometryDataJSON {
  attributes: Record<string, AttributeJSON>;
  index?: IndexJSON;
  drawRange?: { start: number; count: number | null };
  morphAttributes?: Record<string, AttributeJSON[]>;
  morphTargetsRelative?: boolean;
  boundingSphere?: { center: [number, number, number]; radius: number };
}

interface GeometryJSON extends Partial<GeometryDataJSON> {
  data?: GeometryDataJSON;
  type?: string;
  name?: string;
  parameters?: Record<string, unknown>;
  userData?: Record<string, unknown>;
}

function parseAttribute(json: AttributeJSON): Attribute {
  const typeName = json.type ?? "Float32Array";
  const ArrayType = toType(toNormalizedTypeName(typeName)) ?? Float32Array;
  const array = new ArrayType(json.array.length) as AttributeArray;
  array.set(json.array);
  const attribute = new Attribute(array, json.itemSize, json.normalized);
  if (json.name !== undefined) attribute.name = json.name;
  return attribute;
}

/**
 * Loads EASEL geometry JSON and compatible nested geometry records into CPU
 * `Geometry` instances.
 */
export class GeometryLoader extends Loader {
  /** Loads the resource at `url` through the configured loading manager. */
  override load(
    url: string,
    onLoad?: (geometry: Geometry) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void,
  ): void {
    const fileLoader = new FileLoader(this.manager);
    fileLoader.cache = this.cache;
    fileLoader.path = this.path;
    fileLoader.responseType = "json";
    fileLoader.requestHeader = this.requestHeader;

    fileLoader.load(
      url,
      (json) => {
        onLoad?.(this.parse(json as GeometryJSON));
      },
      onProgress,
      onError,
    );
  }

  /** Parses flat or nested serialized geometry data into a `Geometry`. */
  override parse(json: GeometryJSON): Geometry {
    const geometry = new Geometry();
    const data = json.data ?? json;

    const index = data.index;
    if (index !== undefined) {
      const requiresUint32 =
        index.type === "Uint32Array" ||
        index.array.some((value) => value > 65535);
      geometry.index = requiresUint32
        ? new Uint32Array(index.array)
        : new Uint16Array(index.array);
    }

    for (const [name, attribute] of Object.entries(data.attributes ?? {})) {
      geometry.setAttribute(name, parseAttribute(attribute));
    }

    if (data.morphAttributes !== undefined) {
      geometry.morphAttributes = {};
      for (const [name, attributes] of Object.entries(data.morphAttributes)) {
        geometry.morphAttributes[name] = attributes.map(parseAttribute);
      }
    }
    if (data.morphTargetsRelative !== undefined) {
      geometry.morphTargetsRelative = data.morphTargetsRelative;
    }
    if (data.drawRange !== undefined) {
      geometry.setDrawRange(
        data.drawRange.start,
        data.drawRange.count ?? Number.POSITIVE_INFINITY,
      );
    }
    if (data.boundingSphere !== undefined) {
      geometry.boundingSphere = new Sphere(
        new Vector3(...data.boundingSphere.center),
        data.boundingSphere.radius,
      );
    }

    if (json.type !== undefined) geometry.type = json.type;
    if (json.name !== undefined) geometry.name = json.name;
    if (json.parameters !== undefined) {
      geometry.parameters = { ...json.parameters };
    }
    if (json.userData !== undefined) geometry.userData = { ...json.userData };

    return geometry;
  }
}
