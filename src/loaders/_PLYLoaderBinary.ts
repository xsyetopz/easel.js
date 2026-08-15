import type {
  PLYHeader,
  PLYRecord,
  PLYScalarType,
} from "./_PLYLoaderHelpers.ts";

interface PLYProperty {
  type: PLYScalarType | "list";
  name: string;
  countType?: PLYScalarType;
  itemType?: PLYScalarType;
}

interface Cursor {
  value: number;
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

function readListRecordBinary(
  view: DataView,
  cursor: Cursor,
  property: PLYProperty,
  little: boolean,
): number[] {
  const countType = property.countType ?? "uchar";
  const itemType = property.itemType ?? "uchar";
  const count = readScalar(view, cursor.value, countType, little);
  cursor.value += scalarSize(countType);
  const values: number[] = [];
  for (let index = 0; index < count; index++) {
    values.push(readScalar(view, cursor.value, itemType, little));
    cursor.value += scalarSize(itemType);
  }
  return values;
}

/** Decodes binary PLY element rows using the header's byte order and types. */
export function recordsFromBinary(
  data: Uint8Array,
  header: PLYHeader,
): Map<string, PLYRecord[]> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const little = header.format === "binary_little_endian";
  const cursor = { value: header.bodyOffset };
  const records = new Map<string, PLYRecord[]>();
  for (const element of header.elements) {
    const rows: PLYRecord[] = [];
    for (let row = 0; row < element.count; row++) {
      const record: PLYRecord = {};
      for (const property of element.properties) {
        if (property.type === "list") {
          record[property.name] = readListRecordBinary(
            view,
            cursor,
            property,
            little,
          );
        } else {
          record[property.name] = readScalar(
            view,
            cursor.value,
            property.type,
            little,
          );
          cursor.value += scalarSize(property.type);
        }
      }
      rows.push(record);
    }
    records.set(element.name, rows);
  }
  return records;
}
