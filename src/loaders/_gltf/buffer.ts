import type { GLTFLoaderOptions } from "../GLTFLoader.ts";
import {
  normalizeComponent as normalizeAccessorComponent,
  readAccessorValues,
  readComponent as readAccessorComponent,
} from "./accessor.ts";
import { array, integer, record } from "./validation.ts";

/** Converts a decoded glTF component to its normalized numeric range. */
export const normalizeComponent: typeof normalizeAccessorComponent =
  normalizeAccessorComponent;
/** Reads one scalar component from a glTF buffer using its component type. */
export const readComponent: typeof readAccessorComponent =
  readAccessorComponent;

function getProperty(
  value: Readonly<Record<string, unknown>>,
  key: string,
): unknown {
  return value[key];
}

/** Describes the byte range and optional stride of a glTF buffer view. */
export interface BufferViewRecord {
  /** Index of the source buffer. */
  buffer: number;
  /** Byte offset of the view within its source buffer. */
  byteOffset: number;
  /** Number of bytes covered by the view. */
  byteLength: number;
  /** Byte distance between consecutive elements, when interleaved. */
  byteStride?: number;
}

/** Describes how a glTF accessor interprets elements in a buffer view. */
export interface AccessorRecord {
  /** Index of the referenced buffer view, when the accessor has storage. */
  bufferView?: number;
  /** Byte offset of the first element within the buffer view. */
  byteOffset?: number;
  /** glTF component type enum identifying the scalar representation. */
  componentType: number;
  /** Number of elements exposed by the accessor. */
  count: number;
  /** Accessor shape such as SCALAR, VEC3, or MAT4. */
  type: string;
  /** Whether integer component values must be converted to normalized floats. */
  normalized?: boolean;
}

/** Maps glTF component type enums to their byte widths. */
export const COMPONENT_SIZE: Readonly<Record<number, number>> = {
  5120: 1,
  5121: 1,
  5122: 2,
  5123: 2,
  5125: 4,
  5126: 4,
};

/** Maps glTF accessor shape names to their scalar component counts. */
export const COMPONENT_COUNT: Readonly<Record<string, number>> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};

/** Exposes an ArrayBuffer or view as a byte-oriented Uint8Array. */
export function asBytes(value: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const BASE64_WHITESPACE = /\s+/gu;

function decodeBase64PayloadValue(value: string | undefined): number {
  return value === "=" ? 0 : BASE64_ALPHABET.indexOf(value ?? "A");
}

function decodeBase64Quartet(
  value: string,
  index: number,
  output: number[],
): void {
  const a = BASE64_ALPHABET.indexOf(value[index] ?? "A");
  const b = BASE64_ALPHABET.indexOf(value[index + 1] ?? "A");
  const c = decodeBase64PayloadValue(value[index + 2]);
  const d = decodeBase64PayloadValue(value[index + 3]);
  if (a < 0 || b < 0 || c < 0 || d < 0)
    throw new Error("GLTFLoader: invalid base64 buffer URI.");
  output.push((a << 2) | (b >> 4));
  if (value[index + 2] !== "=") output.push(((b & 15) << 4) | (c >> 2));
  if (value[index + 3] !== "=") output.push(((c & 3) << 6) | d);
}

function decodeBase64Manual(value: string): Uint8Array {
  const clean = value.replace(BASE64_WHITESPACE, "");
  const output: number[] = [];
  for (let index = 0; index < clean.length; index += 4)
    decodeBase64Quartet(clean, index, output);
  return new Uint8Array(output);
}

/** Decodes a base64 buffer payload using the platform decoder when available. */
export function decodeBase64(value: string): Uint8Array {
  if (typeof globalThis.atob === "function") {
    const text = globalThis.atob(value);
    const bytes = new Uint8Array(text.length);
    for (let index = 0; index < text.length; index++)
      bytes[index] = text.charCodeAt(index);
    return bytes;
  }
  return decodeBase64Manual(value);
}

/** Decodes a data URI into bytes, supporting percent-encoded and base64 payloads. */
export function decodeDataUri(uri: string): Uint8Array {
  const comma = uri.indexOf(",");
  if (comma < 0 || !uri.startsWith("data:", 0))
    throw new Error("GLTFLoader: malformed data URI.");
  const metadata = uri.slice(5, comma).toLowerCase();
  const payload = uri.slice(comma + 1);
  if (metadata.split(";").includes("base64")) return decodeBase64(payload);
  return new TextEncoder().encode(decodeURIComponent(payload));
}

/** Resolves glTF buffers from supplied bytes, data URIs, or the binary chunk. */
export function resolveBuffers(
  document: Readonly<Record<string, unknown>>,
  options: GLTFLoaderOptions,
): Uint8Array[] {
  const definitions = array(getProperty(document, "buffers") ?? [], "buffers");
  return definitions.map((value, index) => {
    const supplied = options.buffers?.[index];
    if (supplied !== undefined) return asBytes(supplied);
    const buffer = record(value, `buffers[${index}]`);
    const uri = getProperty(buffer, "uri");
    if (typeof uri === "string") {
      if (uri.startsWith("data:")) return decodeDataUri(uri);
      throw new Error(
        `GLTFLoader: external buffer "${uri}" requires load() or options.buffers.`,
      );
    }
    if (index === 0 && options.binaryChunk !== undefined)
      return asBytes(options.binaryChunk);
    throw new Error(
      `GLTFLoader: buffers[${index}] has no URI or supplied binary chunk.`,
    );
  });
}

/** Parses buffer view records and applies glTF defaults for byte offsets. */
export function parseBufferViews(
  document: Readonly<Record<string, unknown>>,
): BufferViewRecord[] {
  return array(getProperty(document, "bufferViews") ?? [], "bufferViews").map(
    (value, index) => {
      const view = record(value, `bufferViews[${index}]`);
      const result: BufferViewRecord = {
        buffer: integer(
          getProperty(view, "buffer"),
          `bufferViews[${index}].buffer`,
        ),
        byteOffset: integer(
          getProperty(view, "byteOffset"),
          `bufferViews[${index}].byteOffset`,
          0,
        ),
        byteLength: integer(
          getProperty(view, "byteLength"),
          `bufferViews[${index}].byteLength`,
        ),
      };
      if (getProperty(view, "byteStride") !== undefined)
        result.byteStride = integer(
          getProperty(view, "byteStride"),
          `bufferViews[${index}].byteStride`,
        );
      return result;
    },
  );
}

/** Parses accessor records and normalizes their optional fields to loader defaults. */
export function parseAccessors(
  document: Readonly<Record<string, unknown>>,
): AccessorRecord[] {
  return array(getProperty(document, "accessors") ?? [], "accessors").map(
    (value, index) => {
      const accessor = record(value, `accessors[${index}]`);
      const result: AccessorRecord = {
        byteOffset: integer(
          getProperty(accessor, "byteOffset"),
          `accessors[${index}].byteOffset`,
          0,
        ),
        componentType: integer(
          getProperty(accessor, "componentType"),
          `accessors[${index}].componentType`,
        ),
        count: integer(
          getProperty(accessor, "count"),
          `accessors[${index}].count`,
        ),
        type: String(getProperty(accessor, "type") ?? ""),
        normalized: getProperty(accessor, "normalized") === true,
      };
      if (getProperty(accessor, "bufferView") !== undefined)
        result.bufferView = integer(
          getProperty(accessor, "bufferView"),
          `accessors[${index}].bufferView`,
        );
      return result;
    },
  );
}

/** Reads an accessor's strided elements and returns flattened numeric values. */
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
  return readAccessorValues({
    data,
    start,
    stride,
    count: accessor.count,
    components,
    size,
    componentType: accessor.componentType,
    normalized: accessor.normalized === true,
  });
}
