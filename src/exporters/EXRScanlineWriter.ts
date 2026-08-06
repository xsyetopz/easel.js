import type { EXRPixelArray } from "./EXRExporter.ts";

interface EXRScanlineSource {
  readonly data: EXRPixelArray;
  readonly width: number;
  readonly height: number;
  readonly type: "uint8" | "half" | "float";
}

/** Writes deterministic uncompressed RGBA scanlines in OpenEXR format. */
export function writeEXRScanlines(
  source: EXRScanlineSource,
  displayWindow: { readonly width: number; readonly height: number },
  generator: string,
): Uint8Array {
  const header = new ByteWriter();
  header.writeUint32(0x01312f76);
  header.writeUint32(2);
  writeChannelsAttribute(header);
  writeAttribute(header, "compression", "compression", Uint8Array.of(0));
  writeAttribute(
    header,
    "dataWindow",
    "box2i",
    box2i(source.width, source.height),
  );
  writeAttribute(
    header,
    "displayWindow",
    "box2i",
    box2i(displayWindow.width, displayWindow.height),
  );
  writeAttribute(header, "lineOrder", "lineOrder", Uint8Array.of(0));
  writeAttribute(header, "pixelAspectRatio", "float", float32(1));
  writeAttribute(
    header,
    "screenWindowCenter",
    "v2f",
    concat(float32(0), float32(0)),
  );
  writeAttribute(header, "screenWindowWidth", "float", float32(1));
  writeAttribute(header, "comments", "string", utf8(generator));
  header.writeUint8(0);

  const rowBytes = source.width * 4 * 4;
  const offsetsStart = header.length;
  const scanlineCount = source.height;
  const offsetTableBytes = scanlineCount * 8;
  const output = new ByteWriter();
  output.writeBytes(header.toUint8Array());
  let scanlineOffset = offsetsStart + offsetTableBytes;
  for (let row = 0; row < scanlineCount; row++) {
    output.writeUint64(scanlineOffset);
    scanlineOffset += 8 + rowBytes;
  }
  for (let row = 0; row < scanlineCount; row++) {
    output.writeInt32(row);
    output.writeInt32(rowBytes);
    for (const channel of [2, 1, 0, 3]) {
      for (let column = 0; column < source.width; column++) {
        output.writeFloat32(
          sample(source, (row * source.width + column) * 4 + channel),
        );
      }
    }
  }
  return output.toUint8Array();
}

function writeChannelsAttribute(writer: ByteWriter): void {
  const channels = ["B", "G", "R", "A"];
  const bytes = new ByteWriter();
  for (const channel of channels) {
    bytes.writeCString(channel);
    bytes.writeInt32(2);
    bytes.writeUint8(0);
    bytes.writeBytes(new Uint8Array(3));
    bytes.writeInt32(1);
    bytes.writeInt32(1);
  }
  bytes.writeUint8(0);
  writeAttribute(writer, "channels", "chlist", bytes.toUint8Array());
}

function writeAttribute(
  writer: ByteWriter,
  name: string,
  type: string,
  payload: Uint8Array,
): void {
  writer.writeCString(name);
  writer.writeCString(type);
  writer.writeUint32(payload.byteLength);
  writer.writeBytes(payload);
}

function box2i(width: number, height: number): Uint8Array {
  const bytes = new ByteWriter();
  bytes.writeInt32(0);
  bytes.writeInt32(0);
  bytes.writeInt32(width - 1);
  bytes.writeInt32(height - 1);
  return bytes.toUint8Array();
}

function float32(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setFloat32(0, value, true);
  return bytes;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function sample(source: EXRScanlineSource, index: number): number {
  const value = source.data[index] ?? 0;
  let result: number;
  if (source.type === "uint8") result = value / 255;
  else if (source.type === "half") result = decodeHalf(value);
  else result = value;
  return Number.isFinite(result) ? result : 0;
}

function decodeHalf(bits: number): number {
  const sign = (bits & 0x8000) === 0 ? 1 : -1;
  const exponent = (bits >>> 10) & 0x1f;
  const fraction = bits & 0x03ff;
  if (exponent === 0) return sign * (fraction / 0x400) * 2 ** -14;
  if (exponent === 0x1f)
    return fraction === 0 ? sign * Number.POSITIVE_INFINITY : Number.NaN;
  return sign * (1 + fraction / 0x400) * 2 ** (exponent - 15);
}

class ByteWriter {
  readonly #bytes: number[] = [];

  get length(): number {
    return this.#bytes.length;
  }

  writeUint8(value: number): void {
    this.#bytes.push(value & 0xff);
  }

  writeInt32(value: number): void {
    const normalized = value | 0;
    this.#bytes.push(
      normalized & 0xff,
      (normalized >>> 8) & 0xff,
      (normalized >>> 16) & 0xff,
      (normalized >>> 24) & 0xff,
    );
  }

  writeUint32(value: number): void {
    const normalized = value >>> 0;
    this.#bytes.push(
      normalized & 0xff,
      (normalized >>> 8) & 0xff,
      (normalized >>> 16) & 0xff,
      (normalized >>> 24) & 0xff,
    );
  }

  writeUint64(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0)
      throw new RangeError(
        "EXRExporter: output offset exceeds safe integer range.",
      );
    const low = value >>> 0;
    const high = Math.floor(value / 0x100000000) >>> 0;
    this.writeUint32(low);
    this.writeUint32(high);
  }

  writeFloat32(value: number): void {
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setFloat32(0, value, true);
    this.writeBytes(bytes);
  }

  writeCString(value: string): void {
    this.writeBytes(utf8(value));
    this.writeUint8(0);
  }

  writeBytes(bytes: Uint8Array): void {
    for (const byte of bytes) this.#bytes.push(byte);
  }

  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.#bytes);
  }
}
