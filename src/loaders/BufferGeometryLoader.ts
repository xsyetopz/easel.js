import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";

interface AttributeJSON {
  itemSize: number;
  type: string;
  array: number[];
  normalized?: boolean;
  name?: string;
}

interface IndexJSON {
  type: string;
  array: number[];
}

interface BufferGeometryDataJSON {
  attributes: Record<string, AttributeJSON>;
  index?: IndexJSON;
  morphAttributes?: Record<string, AttributeJSON[]>;
  morphTargetsRelative?: boolean;
}

interface BufferGeometryJSON {
  data: BufferGeometryDataJSON;
  name?: string;
  userData?: Record<string, unknown>;
}

/** Loads a serialized BufferGeometry definition and returns a Geometry instance. */
export class BufferGeometryLoader extends Loader {
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
        onLoad?.(this.parse(json as BufferGeometryJSON));
      },
      onProgress,
      onError,
    );
  }

  /** Parses serialized input into the corresponding EASEL value. */
  parse(json: BufferGeometryJSON): Geometry {
    const geometry = new Geometry();
    const data = json.data;

    const index = data.index;
    if (index !== undefined) {
      geometry.index = index.array;
    }

    const attributes = data.attributes;
    for (const [key, attribute] of Object.entries(attributes)) {
      const array = new Float32Array(attribute.array);
      const bufferAttribute = new Attribute(
        array,
        attribute.itemSize,
        attribute.normalized,
      );
      if (attribute.name !== undefined) bufferAttribute.name = attribute.name;
      geometry.setAttribute(key, bufferAttribute);
    }

    const morphAttributes = data.morphAttributes;
    if (morphAttributes) {
      geometry.morphAttributes = {};
      for (const [key, attributeArray] of Object.entries(morphAttributes)) {
        const array: Attribute[] = [];
        for (const attribute of attributeArray) {
          const typedArray = new Float32Array(attribute.array);
          const bufferAttribute = new Attribute(
            typedArray,
            attribute.itemSize,
            attribute.normalized,
          );
          if (attribute.name !== undefined)
            bufferAttribute.name = attribute.name;
          array.push(bufferAttribute);
        }
        geometry.morphAttributes[key] = array;
      }
    }

    if (data.morphTargetsRelative) {
      geometry.morphTargetsRelative = true;
    }

    if (json.name) geometry.name = json.name;
    if (json.userData) geometry.userData = json.userData;

    return geometry;
  }
}
