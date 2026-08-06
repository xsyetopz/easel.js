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

export interface BufferViewWithTarget {
  readonly index: number;
  readonly byteOffset: number;
  readonly byteLength: number;
}

export interface MutableDocument {
  asset: { version: "2.0"; generator: string };
  scene: number;
  scenes: GLTFExportScene[];
  nodes: GLTFExportNode[];
  meshes: GLTFExportMesh[];
  buffers: GLTFExportBuffer[];
  bufferViews: GLTFExportBufferView[];
  accessors: GLTFExportAccessor[];
  materials: GLTFExportMaterial[];
  textures: GLTFExportTexture[];
  images: GLTFExportImage[];
  samplers: GLTFExportSampler[];
  animations: GLTFExportAnimation[];
}

export interface MaterialLike {
  readonly type: string;
  readonly name: string;
  readonly color?: {
    readonly r: number;
    readonly g: number;
    readonly b: number;
  };
  readonly map?: Texture;
  readonly transparent: boolean;
  readonly opacity: number;
  readonly side: number;
}

export function bounds(
  values: readonly number[],
  components: number,
): { min: number[]; max: number[] } {
  const min = new Array<number>(components).fill(Number.POSITIVE_INFINITY);
  const max = new Array<number>(components).fill(Number.NEGATIVE_INFINITY);
  for (let index = 0; index < values.length; index++) {
    const component = index % components;
    min[component] = Math.min(min[component]!, values[index]!);
    max[component] = Math.max(max[component]!, values[index]!);
  }
  return { min, max };
}

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

export function tuple3(
  x: number,
  y: number,
  z: number,
): [number, number, number] {
  return [finite(x), finite(y), finite(z)];
}
export function tuple4(
  x: number,
  y: number,
  z: number,
  w: number,
): [number, number, number, number] {
  return [finite(x), finite(y), finite(z), finite(w)];
}
export function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
export function clamp(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

export class BinaryBuilder {
  readonly #bytes: number[] = [];

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

  finish(): Uint8Array {
    while (this.#bytes.length % 4 !== 0) this.#bytes.push(0);
    return Uint8Array.from(this.#bytes);
  }
}

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
