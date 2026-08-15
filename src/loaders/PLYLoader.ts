import type { Geometry } from "../geometry/Geometry.ts";
import {
  type PLYCustomPropertyMapping,
  type PLYPropertyNameMapping,
  recordsFromAscii,
  parseHeader,
} from "./_PLYLoaderHelpers.ts";
import { recordsFromBinary } from "./_PLYLoaderBinary.ts";
import {
  buildGeometry,
  processFaces,
  processVertices,
} from "./_PLYLoaderGeometry.ts";
import type { PLYHeader, PLYRecord } from "./_PLYLoaderHelpers.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";

export type {
  PLYCustomPropertyMapping,
  PLYPropertyNameMapping,
  PLYScalarType,
} from "./_PLYLoaderHelpers.ts";

/** Loads Polygon File Format (PLY) geometry in ASCII or binary form. */
export class PLYLoader extends Loader {
  /** Maps standard property names to names used by an input file. */
  propertyNameMapping: PLYPropertyNameMapping = {};
  /** Maps custom PLY properties to named EASEL attributes. */
  customPropertyMapping: PLYCustomPropertyMapping = {};

  /** Loads a PLY resource through the configured loading manager. */
  override load(
    url: string,
    onLoad?: (geometry: Geometry) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void,
  ): void {
    const fileLoader = new FileLoader(this.manager);
    fileLoader.cache = this.cache;
    fileLoader.path = this.path;
    fileLoader.responseType = "arraybuffer";
    fileLoader.requestHeader = this.requestHeader;
    fileLoader.withCredentials = this.withCredentials;
    fileLoader.load(
      url,
      (data) => {
        try {
          onLoad?.(this.parse(data as ArrayBuffer));
        } catch (error) {
          onError?.(error);
        }
      },
      onProgress,
      onError,
    );
  }

  /** Replaces default property names used when decoding PLY attributes. */
  setPropertyNameMapping(mapping: PLYPropertyNameMapping): this {
    this.propertyNameMapping = { ...mapping };
    return this;
  }

  /** Adds mappings for custom, non-standard geometry attributes. */
  setCustomPropertyNameMapping(mapping: PLYCustomPropertyMapping): this {
    this.customPropertyMapping = Object.fromEntries(
      Object.entries(mapping).map(([name, properties]) => [
        name,
        properties.slice(),
      ]),
    );
    return this;
  }

  /** Parses ASCII text or binary PLY data into CPU geometry. */
  override parse(data: string | ArrayBuffer): Geometry {
    const bytes =
      typeof data === "string"
        ? new TextEncoder().encode(data)
        : new Uint8Array(data);
    const header = parseHeader(bytes, this.propertyNameMapping);
    const text =
      typeof data === "string" ? data : new TextDecoder().decode(bytes);
    const records = this.parseRecords(text, bytes, header);
    return this.buildFromRecords(records, header);
  }

  /** Parses PLY element records according to the detected encoding. */
  parseRecords(
    text: string,
    bytes: Uint8Array,
    header: PLYHeader,
  ): Map<string, PLYRecord[]> {
    return header.format === "ascii"
      ? recordsFromAscii(text, header)
      : recordsFromBinary(bytes, header);
  }

  /** Builds geometry from decoded PLY element records. */
  buildFromRecords(
    records: Map<string, PLYRecord[]>,
    header: PLYHeader,
  ): Geometry {
    const vertexElement = header.elements.find(
      (element) => element.name === "vertex",
    );
    if (!vertexElement) throw new Error("PLYLoader: missing vertex element.");
    const vertices = records.get("vertex") ?? [];
    const data = processVertices(
      vertices,
      vertexElement,
      this.customPropertyMapping,
      this.propertyNameMapping,
    );
    const faces = records.get("face") ?? [];
    const indices = processFaces(faces);
    return buildGeometry(data, indices, this.customPropertyMapping);
  }
}
