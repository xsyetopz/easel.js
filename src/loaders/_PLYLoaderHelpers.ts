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

/** Parsed PLY header and element declarations. */
export interface PLYHeader {
  /** Encoding and byte order declared by the file. */
  format: "ascii" | "binary_little_endian" | "binary_big_endian";
  /** Element declarations in source order. */
  elements: PLYElement[];
  /** Byte offset at which the body begins. */
  bodyOffset: number;
}

/** One parsed PLY record keyed by property name. */
export interface PLYRecord {
  /** Scalar or list property values. */
  [name: string]: number | number[];
}

const HEADER_MARKER_RE = /(?:^|\r?\n)end_header(?:\r?\n|\r)/u;
const LINE_SPLIT_RE = /\r?\n|\r/u;
const WHITESPACE_RE = /\s+/u;

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

/** Resolves a PLY property name through an optional caller mapping. */
export function mapPropertyName(
  name: string,
  mapping: PLYPropertyNameMapping,
): string {
  return mapping[name] ?? name;
}

/** Converts a textual PLY scalar according to its declared numeric type. */
export function parseScalar(value: string, type: PLYScalarType): number {
  return integerTypes.has(type)
    ? Number.parseInt(value, 10)
    : Number.parseFloat(value);
}

function parseProperty(
  values: string[],
  propertyNameMapping: PLYPropertyNameMapping,
  current: PLYElement,
): void {
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
}

function parseHeaderLine(
  line: string,
  state: {
    format: PLYHeader["format"] | undefined;
    current: PLYElement | undefined;
  },
  elements: PLYElement[],
  propertyNameMapping: PLYPropertyNameMapping,
): void {
  const values = line.split(WHITESPACE_RE);
  switch (values[0]) {
    case "format":
      if (
        values[1] === "ascii" ||
        values[1] === "binary_little_endian" ||
        values[1] === "binary_big_endian"
      ) {
        state.format = values[1];
      }
      break;
    case "element": {
      const count = Number.parseInt(values[2] ?? "0", 10);
      if (values[1] && Number.isInteger(count) && count >= 0) {
        state.current = { name: values[1], count, properties: [] };
        elements.push(state.current);
      }
      break;
    }
    case "property": {
      if (!(state.current && values[1])) break;
      parseProperty(values, propertyNameMapping, state.current);
      break;
    }
  }
}

/** Decodes the PLY header and computes the byte offset of its body. */
export function parseHeader(
  data: Uint8Array,
  propertyNameMapping: PLYPropertyNameMapping,
): PLYHeader {
  const text = new TextDecoder().decode(data);
  const marker = HEADER_MARKER_RE.exec(text);
  if (!marker || marker.index === undefined) {
    throw new Error("PLYLoader: missing end_header marker.");
  }
  const headerText = text.slice(0, marker.index + marker[0].length);
  const lines = headerText.split(LINE_SPLIT_RE);
  const state = {
    format: undefined as PLYHeader["format"] | undefined,
    current: undefined as PLYElement | undefined,
  };
  const elements: PLYElement[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("comment") || line.startsWith("obj_info"))
      continue;
    parseHeaderLine(line, state, elements, propertyNameMapping);
  }
  if (!state.format)
    throw new Error("PLYLoader: unsupported or missing format.");
  const bodyOffset = new TextEncoder().encode(headerText).byteLength;
  return { format: state.format, elements, bodyOffset };
}

function parseListRecordAscii(
  tokens: string[],
  cursor: { value: number },
  property: PLYProperty,
): number[] {
  const countType = property.countType ?? "uchar";
  const itemType = property.itemType ?? "uchar";
  const count = parseScalar(tokens[cursor.value++] ?? "0", countType);
  const values: number[] = [];
  for (let index = 0; index < count; index++) {
    values.push(parseScalar(tokens[cursor.value++] ?? "0", itemType));
  }
  return values;
}

/** Decodes ASCII PLY element rows into property-keyed record arrays. */
export function recordsFromAscii(
  text: string,
  header: PLYHeader,
): Map<string, PLYRecord[]> {
  const tokens = text.slice(header.bodyOffset).trim().split(WHITESPACE_RE);
  const cursor = { value: 0 };
  const records = new Map<string, PLYRecord[]>();
  for (const element of header.elements) {
    const rows: PLYRecord[] = [];
    for (let row = 0; row < element.count; row++) {
      const record: PLYRecord = {};
      for (const property of element.properties) {
        if (property.type === "list") {
          record[property.name] = parseListRecordAscii(
            tokens,
            cursor,
            property,
          );
        } else {
          record[property.name] = parseScalar(
            tokens[cursor.value++] ?? "0",
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

/** Returns the first named scalar value present in a PLY record. */
export function findValue(
  record: PLYRecord,
  names: string[],
): number | undefined {
  for (const name of names) {
    const value = record[name];
    if (typeof value === "number") return value;
  }
  return void 0;
}

/** Returns the first named list value present in a PLY record. */
export function findList(
  record: PLYRecord,
  names: string[],
): number[] | undefined {
  for (const name of names) {
    const value = record[name];
    if (Array.isArray(value)) return value;
  }
  return void 0;
}
