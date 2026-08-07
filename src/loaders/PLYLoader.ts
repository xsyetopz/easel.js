import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";

/** Scalar types permitted by the PLY header grammar. */
export type PLYScalarType =
  | "char"
  | "uchar"
  | "short"
  | "ushort"
  | "int"
  | "uint"
  | "float"
  | "double"
  | "int8"
  | "uint8"
  | "int16"
  | "uint16"
  | "int32"
  | "uint32"
  | "float32"
  | "float64";

/** Maps standard PLY property names to the names used by a file. */
export type PLYPropertyNameMapping = Record<string, string>;

/** Maps custom geometry attributes to one or more PLY property names. */
export type PLYCustomPropertyMapping = Record<string, string[]>;

interface PLYProperty {
  type: PLYScalarType | "list";
  name: string;
  countType?: PLYScalarType;
  itemType?: PLYScalarType;
}

interface PLYElement {
  name: string;
  count: number;
  properties: PLYProperty[];
}

interface PLYHeader {
  format: "ascii" | "binary_little_endian" | "binary_big_endian";
  elements: PLYElement[];
  bodyOffset: number;
}

interface PLYRecord {
  [name: string]: number | number[];
}

const integerTypes = new Set<PLYScalarType>([
  "char",
  "uchar",
  "short",
  "ushort",
  "int",
  "uint",
  "int8",
  "uint8",
  "int16",
  "uint16",
  "int32",
  "uint32",
]);

function mapPropertyName(
  name: string,
  mapping: PLYPropertyNameMapping,
): string {
  return mapping[name] ?? name;
}

function parseScalar(value: string, type: PLYScalarType): number {
  return integerTypes.has(type)
    ? Number.parseInt(value, 10)
    : Number.parseFloat(value);
}

function scalarSize(type: PLYScalarType): 1 | 2 | 4 | 8 {
  switch (type) {
    case "char":
    case "int8":
    case "uchar":
    case "uint8":
      return 1;
    case "short":
    case "int16":
    case "ushort":
    case "uint16":
      return 2;
    case "int":
    case "int32":
    case "uint":
    case "uint32":
    case "float":
    case "float32":
      return 4;
    case "double":
    case "float64":
      return 8;
  }
}

function readScalar(
  view: DataView,
  offset: number,
  type: PLYScalarType,
  little: boolean,
): number {
  switch (type) {
    case "char":
    case "int8":
      return view.getInt8(offset);
    case "uchar":
    case "uint8":
      return view.getUint8(offset);
    case "short":
    case "int16":
      return view.getInt16(offset, little);
    case "ushort":
    case "uint16":
      return view.getUint16(offset, little);
    case "int":
    case "int32":
      return view.getInt32(offset, little);
    case "uint":
    case "uint32":
      return view.getUint32(offset, little);
    case "float":
    case "float32":
      return view.getFloat32(offset, little);
    case "double":
    case "float64":
      return view.getFloat64(offset, little);
  }
}

function parseHeader(
  data: Uint8Array,
  propertyNameMapping: PLYPropertyNameMapping,
): PLYHeader {
  const text = new TextDecoder().decode(data);
  const marker = /(?:^|\r?\n)end_header(?:\r?\n|\r)/u.exec(text);
  if (!marker || marker.index === undefined) {
    throw new Error("PLYLoader: missing end_header marker.");
  }
  const headerText = text.slice(0, marker.index + marker[0].length);
  const lines = headerText.split(/\r?\n|\r/u);
  let format: PLYHeader["format"] | undefined;
  const elements: PLYElement[] = [];
  let current: PLYElement | undefined;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("comment") || line.startsWith("obj_info"))
      continue;
    const values = line.split(/\s+/u);
    switch (values[0]) {
      case "format":
        if (
          values[1] === "ascii" ||
          values[1] === "binary_little_endian" ||
          values[1] === "binary_big_endian"
        ) {
          format = values[1];
        }
        break;
      case "element": {
        const count = Number.parseInt(values[2] ?? "0", 10);
        if (values[1] && Number.isInteger(count) && count >= 0) {
          current = { name: values[1], count, properties: [] };
          elements.push(current);
        }
        break;
      }
      case "property": {
        if (!(current && values[1])) break;
        if (values[1] === "list" && values[2] && values[3] && values[4]) {
          current.properties.push({
            type: "list",
            countType: values[2] as PLYScalarType,
            itemType: values[3] as PLYScalarType,
            name: mapPropertyName(values[4], propertyNameMapping),
          });
        } else if (values[1] && values[2]) {
          current.properties.push({
            type: values[1] as PLYScalarType,
            name: mapPropertyName(values[2], propertyNameMapping),
          });
        }
        break;
      }
    }
  }
  if (!format) throw new Error("PLYLoader: unsupported or missing format.");
  const bodyOffset = new TextEncoder().encode(headerText).byteLength;
  return { format, elements, bodyOffset };
}

function recordsFromAscii(
  text: string,
  header: PLYHeader,
): Map<string, PLYRecord[]> {
  const tokens = text.slice(header.bodyOffset).trim().split(/\s+/u);
  let cursor = 0;
  const records = new Map<string, PLYRecord[]>();
  for (const element of header.elements) {
    const rows: PLYRecord[] = [];
    for (let row = 0; row < element.count; row++) {
      const record: PLYRecord = {};
      for (const property of element.properties) {
        if (property.type === "list") {
          const count = parseScalar(
            tokens[cursor++] ?? "0",
            property.countType!,
          );
          const values: number[] = [];
          for (let index = 0; index < count; index++) {
            values.push(
              parseScalar(tokens[cursor++] ?? "0", property.itemType!),
            );
          }
          record[property.name] = values;
        } else {
          record[property.name] = parseScalar(
            tokens[cursor++] ?? "0",
            property.type,
          );
        }
      }
      rows.push(record);
    }
    records.set(element.name, rows);
  }
  return records;
}

function recordsFromBinary(
  data: Uint8Array,
  header: PLYHeader,
): Map<string, PLYRecord[]> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const little = header.format === "binary_little_endian";
  let cursor = header.bodyOffset;
  const records = new Map<string, PLYRecord[]>();
  for (const element of header.elements) {
    const rows: PLYRecord[] = [];
    for (let row = 0; row < element.count; row++) {
      const record: PLYRecord = {};
      for (const property of element.properties) {
        if (property.type === "list") {
          const count = readScalar(view, cursor, property.countType!, little);
          cursor += scalarSize(property.countType!);
          const values: number[] = [];
          for (let index = 0; index < count; index++) {
            values.push(readScalar(view, cursor, property.itemType!, little));
            cursor += scalarSize(property.itemType!);
          }
          record[property.name] = values;
        } else {
          record[property.name] = readScalar(
            view,
            cursor,
            property.type,
            little,
          );
          cursor += scalarSize(property.type);
        }
      }
      rows.push(record);
    }
    records.set(element.name, rows);
  }
  return records;
}

function findValue(record: PLYRecord, names: string[]): number | undefined {
  for (const name of names) {
    const value = record[name];
    if (typeof value === "number") return value;
  }
  return void 0;
}

function findList(record: PLYRecord, names: string[]): number[] | undefined {
  for (const name of names) {
    const value = record[name];
    if (Array.isArray(value)) return value;
  }
  return void 0;
}

function normalizeColor(
  value: number,
  type: PLYScalarType | undefined,
): number {
  if (
    type === "float" ||
    type === "float32" ||
    type === "double" ||
    type === "float64"
  )
    return value;
  return value > 1 ? value / 255 : value;
}

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
    const records =
      header.format === "ascii"
        ? recordsFromAscii(text, header)
        : recordsFromBinary(bytes, header);
    const vertexElement = header.elements.find(
      (element) => element.name === "vertex",
    );
    if (!vertexElement) throw new Error("PLYLoader: missing vertex element.");
    const vertices = records.get("vertex") ?? [];
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const custom = new Map<string, number[]>();
    const positionNames = ["x", "y", "z"];
    const normalNames = ["nx", "ny", "nz"];
    const uvNames = ["s", "t"];
    const colorNames = ["red", "green", "blue"];
    const typeByName = new Map(
      vertexElement.properties
        .filter((property) => property.type !== "list")
        .map((property) => [property.name, property.type as PLYScalarType]),
    );
    for (const [name] of Object.entries(this.customPropertyMapping))
      custom.set(name, []);
    for (const vertex of vertices) {
      const point = positionNames.map((name) => findValue(vertex, [name]) ?? 0);
      positions.push(point[0]!, point[1]!, point[2]!);
      const normal = normalNames.map((name) => findValue(vertex, [name]));
      if (normal.every((value) => value !== undefined))
        normals.push(normal[0]!, normal[1]!, normal[2]!);
      const uv = uvNames.map((name) => findValue(vertex, [name]));
      if (uv.every((value) => value !== undefined)) uvs.push(uv[0]!, uv[1]!);
      const color = colorNames.map((name) => findValue(vertex, [name]));
      if (color.every((value) => value !== undefined))
        colors.push(
          ...color.map((value, index) =>
            normalizeColor(value!, typeByName.get(colorNames[index]!)),
          ),
        );
      for (const [name, propertyNames] of Object.entries(
        this.customPropertyMapping,
      )) {
        const values = custom.get(name)!;
        for (const propertyName of propertyNames) {
          const mappedName = mapPropertyName(
            propertyName,
            this.propertyNameMapping,
          );
          values.push(findValue(vertex, [mappedName]) ?? 0);
        }
      }
    }
    const geometry = new Geometry().setPositions(positions);
    const faces = records.get("face") ?? [];
    const indices: number[] = [];
    for (const face of faces) {
      const list = findList(face, ["vertex_indices", "vertex_index"]);
      if (!list || list.length < 3) continue;
      for (let index = 1; index + 1 < list.length; index++)
        indices.push(list[0]!, list[index]!, list[index + 1]!);
    }
    if (indices.length > 0) geometry.index = indices;
    if (normals.length === positions.length) geometry.setNormals(normals);
    if (uvs.length === (positions.length / 3) * 2) geometry.setUVs(uvs);
    if (colors.length === positions.length) geometry.setColors(colors);
    for (const [name, values] of custom) {
      const itemSize = this.customPropertyMapping[name]?.length ?? 0;
      if (itemSize > 0 && values.length === (positions.length / 3) * itemSize)
        geometry.setAttribute(
          name,
          new Attribute(new Float32Array(values), itemSize),
        );
    }
    return geometry;
  }
}
