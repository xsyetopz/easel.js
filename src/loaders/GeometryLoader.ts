import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";

interface GeometryJSON {
  attributes: Record<string, { array: number[]; itemSize: number }>;
  index?: { array: number[] };
}

/** Loads a JSON geometry definition and returns a Geometry instance. */
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

  /** Parses serialized input into the corresponding EASEL value. */
  override parse(json: GeometryJSON): Geometry {
    const geometry = new Geometry();

    for (const [name, attribData] of Object.entries(json.attributes ?? {})) {
      const array = new Float32Array(attribData.array);
      geometry.setAttribute(name, new Attribute(array, attribData.itemSize));
    }

    if (json.index) {
      geometry.index = json.index.array;
    }

    return geometry;
  }
}
