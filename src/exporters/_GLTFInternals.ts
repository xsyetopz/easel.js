import type { Texture } from "../textures/Texture.ts";
import type {
  GLTFExportAccessor,
  GLTFExportAnimation,
  GLTFExportBuffer,
  GLTFExportBufferView,
  GLTFExportImage,
  GLTFExportMaterial,
  GLTFExportMesh,
  GLTFExportNode,
  GLTFExportSampler,
  GLTFExportScene,
  GLTFExportTexture,
} from "./GLTFExporter.ts";

/** Binary buffer-view metadata returned when appending typed-array data. */
export interface BufferViewWithTarget {
  /** Index of the new buffer view in the glTF document. */
  readonly index: number;
  /** Byte offset of the view in the binary payload. */
  readonly byteOffset: number;
  /** Number of bytes occupied by the appended data. */
  readonly byteLength: number;
}

/** Mutable glTF document assembled by the exporter before serialization. */
export interface MutableDocument {
  /** glTF asset metadata and generator label. */
  asset: { version: "2.0"; generator: string };
  /** Index of the document's active scene. */
  scene: number;
  /** Scene records in document order. */
  scenes: GLTFExportScene[];
  /** Node hierarchy records. */
  nodes: GLTFExportNode[];
  /** Mesh primitive records. */
  meshes: GLTFExportMesh[];
  /** Binary buffer descriptors. */
  buffers: GLTFExportBuffer[];
  /** Binary buffer-view descriptors. */
  bufferViews: GLTFExportBufferView[];
  /** Accessor descriptors for binary attributes and indices. */
  accessors: GLTFExportAccessor[];
  /** CPU material records. */
  materials: GLTFExportMaterial[];
  /** Texture records referencing exported images. */
  textures: GLTFExportTexture[];
  /** Image records referenced by textures. */
  images: GLTFExportImage[];
  /** Sampler records used by exported textures. */
  samplers: GLTFExportSampler[];
  /** Animation records and their channels. */
  animations: GLTFExportAnimation[];
}

/** CPU material fields consumed by the glTF export mapping. */
export interface MaterialLike {
  /** Runtime material class name. */
  readonly type: string;
  /** Material name retained in exported metadata when available. */
  readonly name: string;
  /** RGB base color used for the exported material factor. */
  readonly color?: {
    readonly r: number;
    readonly g: number;
    readonly b: number;
  };
  /** Optional color texture assigned to the material. */
  readonly map?: Texture;
  /** Whether the material uses discrete transparency. */
  readonly transparent: boolean;
  /** Material opacity used to derive the exported alpha factor. */
  readonly opacity: number;
  /** Side-selection value used to derive double-sided output. */
  readonly side: number;
}

/** Calculates component-wise minima and maxima for packed attribute values.
 * @param values Packed numeric components to inspect.
 * @param components Number of components in each element.
 * @returns Per-component minimum and maximum values.
 */
export function bounds(
  values: readonly number[],
  components: number,
): { min: number[]; max: number[] } {
  const min = new Array<number>(components).fill(Number.POSITIVE_INFINITY);
  const max = new Array<number>(components).fill(Number.NEGATIVE_INFINITY);
  for (let index = 0; index < values.length; index++) {
    const component = index % components;
    min[component] = Math.min(min[component], values[index]);
    max[component] = Math.max(max[component], values[index]);
  }
  return { min, max };
}

/** Returns a JSON-safe copy of application metadata for glTF extras.
 * @param value Metadata values to serialize.
 * @returns A plain object containing serializable values, or an empty object.
 */
export function safeExtras(
  value: Record<string, unknown>,
): Readonly<Record<string, unknown>> {
  if (Object.keys(value).length === 0) return {};
  try {
    const json = JSON.parse(JSON.stringify(value)) as unknown;
    return json && typeof json === "object" && !Array.isArray(json)
      ? (json as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Creates a finite three-component tuple for a glTF vector value.
 * @param x First component.
 * @param y Second component.
 * @param z Third component.
 * @returns A tuple with non-finite components replaced by zero.
 */
export function tuple3(
  x: number,
  y: number,
  z: number,
): [number, number, number] {
  return [finite(x), finite(y), finite(z)];
}

/** Creates a finite four-component tuple for a glTF quaternion or vector value.
 * @param x First component.
 * @param y Second component.
 * @param z Third component.
 * @param w Fourth component.
 * @returns A tuple with non-finite components replaced by zero.
 */
export function tuple4(
  x: number,
  y: number,
  z: number,
  w: number,
): [number, number, number, number] {
  return [finite(x), finite(y), finite(z), finite(w)];
}

/** Replaces a non-finite numeric export value with zero.
 * @param value Numeric value to validate.
 * @returns The input value when finite; otherwise zero.
 */
export function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** Clamps a numeric export value to the normalized range [0, 1].
 * @param value Numeric value to clamp.
 * @returns A finite value between zero and one.
 */
export function clamp(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/** Builds an aligned binary payload and its glTF buffer-view records. */
export class BinaryBuilder {
  readonly #bytes: number[] = [];

  /** Appends typed-array bytes and records the corresponding buffer view.
   * @param values Typed-array data to append.
   * @param document Mutable glTF document receiving the buffer-view record.
   * @param target Optional glTF buffer-view target for attributes or indices.
   * @returns Metadata describing the appended buffer view.
   */
  append(
    values: Float32Array | Uint16Array | Uint32Array,
    document: MutableDocument,
    target?: 34962 | 34963,
  ): BufferViewWithTarget {
    while (this.#bytes.length % 4 !== 0) this.#bytes.push(0);
    const byteOffset = this.#bytes.length;
    const view = new Uint8Array(
      values.buffer,
      values.byteOffset,
      values.byteLength,
    );
    for (const byte of view) this.#bytes.push(byte);
    const byteLength = view.byteLength;
    const index =
      document.bufferViews.push({
        buffer: 0,
        byteOffset,
        byteLength,
        ...(target === undefined ? {} : { target }),
      }) - 1;
    return { index, byteOffset, byteLength };
  }

  /** Finishes the aligned binary payload as a byte array.
   * @returns The complete binary payload with glTF alignment padding.
   */
  finish(): Uint8Array {
    while (this.#bytes.length % 4 !== 0) this.#bytes.push(0);
    return Uint8Array.from(this.#bytes);
  }
}

/** Encodes binary data as a Base64 string for a glTF data URI.
 * @param bytes Binary data to encode.
 * @returns The Base64 representation of the input bytes.
 */
export function encodeBase64(bytes: Uint8Array): string {
  if (typeof globalThis.btoa === "function") {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return globalThis.btoa(binary);
  }
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0;
    const b = bytes[index + 1];
    const c = bytes[index + 2];
    result += alphabet[a >> 2];
    result += alphabet[((a & 3) << 4) | ((b ?? 0) >> 4)];
    result +=
      b === undefined ? "=" : alphabet[((b & 15) << 2) | ((c ?? 0) >> 6)];
    result += c === undefined ? "=" : alphabet[c & 63];
  }
  return result;
}
