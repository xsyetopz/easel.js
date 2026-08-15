import type { ImageDataLike, ImagePixelArray } from "../utils/ImageUtils.ts";

/** Data accepted by a texture source for CPU sampling or serialization. */
export type SourceImage =
  | ImageDataLike<ImagePixelArray>
  | HTMLImageElement
  | HTMLCanvasElement
  | ImageBitmap
  | HTMLVideoElement
  | undefined;

/** Serializable image or raw pixel source description. */
export interface SourceJSON {
  /** Stable source identifier. */
  uuid: string;
  /** Data URL or CPU pixel payload. */
  url: string | SourcePixelJSON;
}

/** Serialized raw pixel payload. */
export interface SourcePixelJSON {
  /** Pixel values. */
  data: number[];
  /** Pixel width. */
  width: number;
  /** Pixel height. */
  height: number;
  /** Typed-array constructor name. */
  type: string;
}

/** Metadata container used to deduplicate serialized source images. */
export interface SourceSerializationMeta {
  /** Serialized source images keyed by UUID. */
  images: Record<string, SourceJSON>;
}

type SourceRecord = Record<string, unknown> & {
  data?: unknown;
  depth?: unknown;
  height?: unknown;
  src?: unknown;
  toDataURL?: unknown;
  width?: unknown;
};

let sourceId = 0;

/** A shared texture data source with versioned mutation state. */
export class Source {
  /** String marker identifying this concrete texture subtype. */
  readonly isSource = true;

  /** Numeric source identifier. */
  readonly id = sourceId++;

  /** Stable source identifier. */
  readonly uuid = globalThis.crypto.randomUUID();

  /** Image or raw pixel payload shared by texture instances. */
  data: SourceImage;

  /** Number of source update requests. */
  version = 0;

  /** Constructs a shared texture source around an optional image or pixel payload. */
  constructor(data?: SourceImage) {
    this.data = data;
  }

  /** Copies source width, height, and optional depth into a compatible vector. */
  sizeInto<TTarget extends { set: (...values: number[]) => unknown }>(
    target: TTarget,
  ): TTarget {
    const data = this.data;
    let width = 0;
    let height = 0;
    let depth = 0;

    if (isVideo(data)) {
      width = data.videoWidth;
      height = data.videoHeight;
    } else if (isRecord(data)) {
      width = finiteDimension(data.width);
      height = finiteDimension(data.height);
      depth = finiteDimension(data.depth);
    }

    if (depth > 0) {
      target.set(width, height, depth);
    } else {
      target.set(width, height);
    }
    return target;
  }

  /** Marks source data for the next CPU update. */
  set needsUpdate(value: boolean) {
    if (value) this.version++;
  }

  /** Serializes this source and optionally deduplicates it in metadata. */
  toJSON(meta?: SourceSerializationMeta | string): SourceJSON {
    const isRoot = meta === undefined || typeof meta === "string";
    if (!isRoot && meta.images[this.uuid] !== undefined) {
      return meta.images[this.uuid];
    }

    const result: SourceJSON = {
      uuid: this.uuid,
      url: serializeImage(this.data),
    };
    if (!isRoot) meta.images[this.uuid] = result;
    return result;
  }
}

function isRecord(value: unknown): value is SourceRecord {
  return typeof value === "object" && value !== null;
}

function isVideo(value: unknown): value is HTMLVideoElement {
  if (value === undefined || value === null || typeof value !== "object")
    return false;
  return "videoWidth" in value && "videoHeight" in value;
}

function finiteDimension(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

function serializeImage(data: SourceImage): string | SourcePixelJSON {
  if (data === undefined) return "";

  if (isRecord(data) && isPixelData(data)) {
    return {
      data: Array.from(data.data),
      width: data.width,
      height: data.height,
      type: data.data.constructor.name,
    };
  }

  if (isRecord(data)) {
    const source = data.src;
    if (typeof source === "string") return source;
    const toDataURL = data.toDataURL;
    if (typeof toDataURL === "function") {
      const result = toDataURL.call(data);
      if (typeof result === "string") return result;
    }
  }

  return "";
}

function isPixelData(value: SourceRecord): value is {
  data: ImagePixelArray;
  width: number;
  height: number;
} {
  const data = value.data;
  return (
    (data instanceof Uint8Array ||
      data instanceof Uint8ClampedArray ||
      data instanceof Float32Array) &&
    typeof value.width === "number" &&
    typeof value.height === "number"
  );
}
