import type { GLTFLoaderOptions } from "../GLTFLoader.ts";
import { array, integer, record } from "./validation.ts";

export interface BufferViewRecord {
  buffer: number;
  byteOffset: number;
  byteLength: number;
  byteStride?: number;
}

export interface AccessorRecord {
  bufferView?: number;
  byteOffset?: number;
  componentType: number;
  count: number;
  type: string;
  normalized?: boolean;
}

export const COMPONENT_SIZE: Readonly<Record<number, number>> = {
  5120: 1,
  5121: 1,
  5122: 2,
  5123: 2,
  5125: 4,
  5126: 4,
};

export const COMPONENT_COUNT: Readonly<Record<string, number>> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};

export function asBytes(value: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}

export function decodeBase64(value: string): Uint8Array {
  if (typeof globalThis.atob === "function") {
    const text = globalThis.atob(value);
    const bytes = new Uint8Array(text.length);
    for (let index = 0; index < text.length; index++)
      bytes[index] = text.charCodeAt(index);
    return bytes;
  }
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = value.replace(/\s+/gu, "");
  const output: number[] = [];
  for (let index = 0; index < clean.length; index += 4) {
    const a = alphabet.indexOf(clean[index] ?? "A");
    const b = alphabet.indexOf(clean[index + 1] ?? "A");
    const c =
      clean[index + 2] === "=" ? 0 : alphabet.indexOf(clean[index + 2] ?? "A");
    const d =
      clean[index + 3] === "=" ? 0 : alphabet.indexOf(clean[index + 3] ?? "A");
    if (a < 0 || b < 0 || c < 0 || d < 0)
      throw new Error("GLTFLoader: invalid base64 buffer URI.");
    output.push((a << 2) | (b >> 4));
    if (clean[index + 2] !== "=") output.push(((b & 15) << 4) | (c >> 2));
    if (clean[index + 3] !== "=") output.push(((c & 3) << 6) | d);
  }
  return new Uint8Array(output);
}

export function decodeDataUri(uri: string): Uint8Array {
  const comma = uri.indexOf(",");
  if (comma < 0 || !uri.startsWith("data:", 0))
    throw new Error("GLTFLoader: malformed data URI.");
  const metadata = uri.slice(5, comma).toLowerCase();
  const payload = uri.slice(comma + 1);
  if (metadata.split(";").includes("base64")) return decodeBase64(payload);
  return new TextEncoder().encode(decodeURIComponent(payload));
}

export function resolveBuffers(
  document: Readonly<Record<string, unknown>>,
  options: GLTFLoaderOptions,
): Uint8Array[] {
  const definitions = array(document["buffers"] ?? [], "buffers");
  return definitions.map((value, index) => {
    const supplied = options.buffers?.[index];
    if (supplied !== undefined) return asBytes(supplied);
    const buffer = record(value, `buffers[${index}]`);
    const uri = buffer["uri"];
    if (typeof uri === "string")
      return uri.startsWith("data:")
        ? decodeDataUri(uri)
        : (() => {
            throw new Error(
              `GLTFLoader: external buffer "${uri}" requires load() or options.buffers.`,
            );
          })();
    if (index === 0 && options.binaryChunk !== undefined)
      return asBytes(options.binaryChunk);
    throw new Error(
      `GLTFLoader: buffers[${index}] has no URI or supplied binary chunk.`,
    );
  });
}

export function parseBufferViews(
  document: Readonly<Record<string, unknown>>,
): BufferViewRecord[] {
  return array(document["bufferViews"] ?? [], "bufferViews").map(
    (value, index) => {
      const view = record(value, `bufferViews[${index}]`);
      const result: BufferViewRecord = {
        buffer: integer(view["buffer"], `bufferViews[${index}].buffer`),
        byteOffset: integer(
          view["byteOffset"],
          `bufferViews[${index}].byteOffset`,
          0,
        ),
        byteLength: integer(
          view["byteLength"],
          `bufferViews[${index}].byteLength`,
        ),
      };
      if (view["byteStride"] !== undefined)
        result.byteStride = integer(
          view["byteStride"],
          `bufferViews[${index}].byteStride`,
        );
      return result;
    },
  );
}

export function parseAccessors(
  document: Readonly<Record<string, unknown>>,
): AccessorRecord[] {
  return array(document["accessors"] ?? [], "accessors").map((value, index) => {
    const accessor = record(value, `accessors[${index}]`);
    const result: AccessorRecord = {
      byteOffset: integer(
        accessor["byteOffset"],
        `accessors[${index}].byteOffset`,
        0,
      ),
      componentType: integer(
        accessor["componentType"],
        `accessors[${index}].componentType`,
      ),
      count: integer(accessor["count"], `accessors[${index}].count`),
      type: String(accessor["type"] ?? ""),
      normalized: accessor["normalized"] === true,
    };
    if (accessor["bufferView"] !== undefined)
      result.bufferView = integer(
        accessor["bufferView"],
        `accessors[${index}].bufferView`,
      );
    return result;
  });
}

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

export function readAccessor(
  index: number,
  accessors: AccessorRecord[],
  views: BufferViewRecord[],
  buffers: Uint8Array[],
): number[] {
  const accessor = accessors[index];
  if (!accessor)
    throw new RangeError(`GLTFLoader: accessor ${index} is missing.`);
  const components = COMPONENT_COUNT[accessor.type];
  const size = COMPONENT_SIZE[accessor.componentType];
  if (!(components && size))
    throw new Error(
      `GLTFLoader: accessor ${index} uses an unsupported type or componentType.`,
    );
  if (accessor.bufferView === undefined)
    return new Array(accessor.count * components).fill(0);
  const view = views[accessor.bufferView];
  if (!view)
    throw new RangeError(
      `GLTFLoader: bufferView ${accessor.bufferView} is missing.`,
    );
  const bytes = buffers[view.buffer];
  if (!bytes)
    throw new RangeError(`GLTFLoader: buffer ${view.buffer} is missing.`);
  const elementSize = components * size;
  const stride = view.byteStride ?? elementSize;
  if (stride < elementSize)
    throw new RangeError(
      `GLTFLoader: accessor ${index} has a byteStride smaller than its element.`,
    );
  const start = view.byteOffset + (accessor.byteOffset ?? 0);
  const end = start + Math.max(0, accessor.count - 1) * stride + elementSize;
  if (start < 0 || end > bytes.byteLength)
    throw new RangeError(
      `GLTFLoader: accessor ${index} exceeds its bufferView.`,
    );
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const values: number[] = [];
  for (let item = 0; item < accessor.count; item++) {
    for (let component = 0; component < components; component++) {
      const offset = start + item * stride + component * size;
      const value = readComponent(data, offset, accessor.componentType);
      values.push(
        accessor.normalized
          ? normalizeComponent(value, accessor.componentType)
          : value,
      );
    }
  }
  return values;
}
