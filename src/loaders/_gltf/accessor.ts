/** Reads one little-endian scalar from a DataView using a glTF component type. */
export function readComponent(
  view: DataView,
  offset: number,
  componentType: number,
): number {
  switch (componentType) {
    case 5120:
      return view.getInt8(offset);
    case 5121:
      return view.getUint8(offset);
    case 5122:
      return view.getInt16(offset, true);
    case 5123:
      return view.getUint16(offset, true);
    case 5125:
      return view.getUint32(offset, true);
    case 5126:
      return view.getFloat32(offset, true);
    default:
      throw new Error(
        `GLTFLoader: unsupported componentType ${componentType}.`,
      );
  }
}

/** Converts an integer component to the normalized glTF numeric range. */
export function normalizeComponent(
  value: number,
  componentType: number,
): number {
  switch (componentType) {
    case 5120:
      return Math.max(value / 127, -1);
    case 5121:
      return value / 255;
    case 5122:
      return Math.max(value / 32767, -1);
    case 5123:
      return value / 65535;
    case 5125:
      return value / 4294967295;
    default:
      return value;
  }
}

interface AccessorValueReadOptions {
  data: DataView;
  start: number;
  stride: number;
  count: number;
  components: number;
  size: number;
  componentType: number;
  normalized: boolean;
}

/** Reads and optionally normalizes the flattened values of a strided accessor. */
export function readAccessorValues({
  data,
  start,
  stride,
  count,
  components,
  size,
  componentType,
  normalized,
}: AccessorValueReadOptions): number[] {
  const values: number[] = [];
  for (let item = 0; item < count; item++) {
    for (let component = 0; component < components; component++) {
      const offset = start + item * stride + component * size;
      const value = readComponent(data, offset, componentType);
      values.push(
        normalized ? normalizeComponent(value, componentType) : value,
      );
    }
  }
  return values;
}
