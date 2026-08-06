import { describe, expect, it } from "bun:test";
import { DataTextureLoader } from "@/loaders/DataTextureLoader.js";
import { TIFFLoader } from "@/loaders/TIFFLoader.js";

interface TIFFFixtureOptions {
  width: number;
  height: number;
  bitsPerSample?: readonly number[];
  samplesPerPixel?: number;
  photometric?: 0 | 1 | 2;
  orientation?: number;
  rowsPerStrip?: number;
  bigEndian?: boolean;
  pixels: readonly (readonly number[])[];
}

const COMPRESSION_ERROR = /compression/u;
const HEADER_ERROR = /header/u;
const STRIP_ERROR = /strip|truncated/iu;

function makeTiff(options: TIFFFixtureOptions): ArrayBuffer {
  const bigEndian = options.bigEndian ?? false;
  const samplesPerPixel = options.samplesPerPixel ?? 3;
  const bitsPerSample = options.bitsPerSample ?? [8, 8, 8];
  const rowsPerStrip = options.rowsPerStrip ?? options.height;
  const strips: Uint8Array[] = [];
  for (let start = 0; start < options.height; start += rowsPerStrip) {
    const end = Math.min(options.height, start + rowsPerStrip);
    strips.push(
      encodePixels(
        options.pixels.slice(start, end),
        options.width,
        samplesPerPixel,
        bitsPerSample,
        bigEndian,
      ),
    );
  }

  const entries = [
    { tag: 256, type: 4, values: [options.width] },
    { tag: 257, type: 4, values: [options.height] },
    { tag: 258, type: 3, values: [...bitsPerSample] },
    { tag: 259, type: 3, values: [1] },
    { tag: 262, type: 3, values: [options.photometric ?? 2] },
    { tag: 273, type: 4, values: strips.map(() => 0) },
    { tag: 277, type: 3, values: [samplesPerPixel] },
    { tag: 278, type: 4, values: [rowsPerStrip] },
    { tag: 279, type: 4, values: strips.map((strip) => strip.length) },
    { tag: 284, type: 3, values: [1] },
    { tag: 274, type: 3, values: [options.orientation ?? 1] },
  ];
  const ifdOffset = 8;
  const ifdBytes = 2 + entries.length * 12 + 4;
  let extraOffset = ifdOffset + ifdBytes;
  const extras: { entry: (typeof entries)[number]; offset: number }[] = [];
  for (const entry of entries) {
    if (entry.values.length * typeSize(entry.type) > 4) {
      extraOffset = align(extraOffset, 2);
      extras.push({ entry, offset: extraOffset });
      extraOffset += entry.values.length * typeSize(entry.type);
    }
  }
  const pixelOffset = align(extraOffset, 2);
  const totalBytes =
    pixelOffset + strips.reduce((total, strip) => total + strip.length, 0);
  const bytes = new Uint8Array(totalBytes);
  const view = new DataView(bytes.buffer);
  writeAscii(bytes, 0, bigEndian ? "MM" : "II");
  writeUint16(view, 2, 42, bigEndian);
  writeUint32(view, 4, ifdOffset, bigEndian);
  writeUint16(view, ifdOffset, entries.length, bigEndian);
  let entryOffset = ifdOffset + 2;
  for (const entry of entries) {
    writeUint16(view, entryOffset, entry.tag, bigEndian);
    writeUint16(view, entryOffset + 2, entry.type, bigEndian);
    writeUint32(view, entryOffset + 4, entry.values.length, bigEndian);
    const valueBytes = typeSize(entry.type) * entry.values.length;
    const extraEntry = extras.find((candidate) => candidate.entry === entry);
    if (extraEntry) {
      writeUint32(view, entryOffset + 8, extraEntry.offset, bigEndian);
      writeValues(view, extraEntry.offset, entry, bigEndian);
    } else {
      writeValues(view, entryOffset + 8, entry, bigEndian);
      if (valueBytes < 4)
        bytes.fill(0, entryOffset + 8 + valueBytes, entryOffset + 12);
    }
    if (entry.tag === 273) {
      const offsets: number[] = [];
      let stripOffset = pixelOffset;
      for (const strip of strips) {
        offsets.push(stripOffset);
        stripOffset += strip.length;
      }
      if (extraEntry)
        writeValues(
          view,
          extraEntry.offset,
          { ...entry, values: offsets },
          bigEndian,
        );
      else
        writeValues(
          view,
          entryOffset + 8,
          { ...entry, values: offsets },
          bigEndian,
        );
    }
    entryOffset += 12;
  }
  writeUint32(view, entryOffset, 0, bigEndian);
  let outputOffset = pixelOffset;
  for (const strip of strips) {
    bytes.set(strip, outputOffset);
    outputOffset += strip.length;
  }
  return bytes.buffer;
}

function encodePixels(
  rows: readonly (readonly number[])[],
  width: number,
  samplesPerPixel: number,
  bitsPerSample: readonly number[],
  bigEndian: boolean,
): Uint8Array {
  const bits = bitsPerSample[0] ?? 8;
  if (bits < 8) {
    const rowBytes = Math.ceil((width * samplesPerPixel * bits) / 8);
    const output = new Uint8Array(rowBytes * rows.length);
    for (let row = 0; row < rows.length; row++) {
      let bitOffset = 0;
      for (const value of rows[row] ?? []) {
        const normalized = value & ((1 << bits) - 1);
        const byteOffset = row * rowBytes + (bitOffset >> 3);
        const shift = 8 - bits - (bitOffset & 7);
        output[byteOffset] |= normalized << shift;
        bitOffset += bits;
      }
    }
    return output;
  }
  const bytesPerSample = bits >> 3;
  const output = new Uint8Array(
    rows.length * width * samplesPerPixel * bytesPerSample,
  );
  const view = new DataView(output.buffer);
  let index = 0;
  for (const row of rows) {
    for (const value of row) {
      if (bytesPerSample === 1) output[index++] = value;
      else {
        view.setUint16(index, value, !bigEndian);
        index += 2;
      }
    }
  }
  return output;
}

function typeSize(type: number): 2 | 4 {
  return type === 3 ? 2 : 4;
}

function align(value: number, boundary: number): number {
  return (value + boundary - 1) & ~(boundary - 1);
}

function writeValues(
  view: DataView,
  offset: number,
  entry: { type: number; values: readonly number[] },
  bigEndian: boolean,
): void {
  for (const value of entry.values) {
    if (entry.type === 3) writeUint16(view, offset, value, bigEndian);
    else writeUint32(view, offset, value, bigEndian);
    const step = typeSize(entry.type);
    offset += step;
  }
}

function writeAscii(bytes: Uint8Array, offset: number, value: string): void {
  for (let index = 0; index < value.length; index++)
    bytes[offset + index] = value.charCodeAt(index);
}

function writeUint16(
  view: DataView,
  offset: number,
  value: number,
  bigEndian: boolean,
): void {
  view.setUint16(offset, value, !bigEndian);
}

function writeUint32(
  view: DataView,
  offset: number,
  value: number,
  bigEndian: boolean,
): void {
  view.setUint32(offset, value, !bigEndian);
}

function rgba(result: ReturnType<TIFFLoader["parse"]>): number[] {
  return Array.from(result.data);
}

describe("TIFFLoader", () => {
  it("extends DataTextureLoader and decodes little-endian RGB strips", () => {
    const loader = new TIFFLoader();
    expect(loader).toBeInstanceOf(DataTextureLoader);
    const result = loader.parse(
      makeTiff({
        width: 2,
        height: 2,
        rowsPerStrip: 1,
        pixels: [
          [255, 0, 0, 0, 255, 0],
          [0, 0, 255, 255, 255, 255],
        ],
      }),
    );
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.photometric).toBe("rgb");
    expect(result.stripCount).toBe(2);
    expect(rgba(result)).toEqual([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
    ]);
  });

  it("decodes big-endian RGBA data and normalizes orientation", () => {
    const result = new TIFFLoader().parse(
      makeTiff({
        width: 2,
        height: 1,
        bigEndian: true,
        samplesPerPixel: 4,
        bitsPerSample: [16, 16, 16, 16],
        orientation: 2,
        pixels: [[65535, 0, 0, 32768, 0, 65535, 0, 65535]],
      }),
    );
    expect(result.endianness).toBe("big");
    expect(result.width).toBe(2);
    expect(result.height).toBe(1);
    expect(rgba(result)).toEqual([0, 255, 0, 255, 255, 0, 0, 128]);
  });

  it("decodes white-is-zero grayscale and grayscale alpha", () => {
    const result = new TIFFLoader().parse(
      makeTiff({
        width: 2,
        height: 1,
        samplesPerPixel: 2,
        bitsPerSample: [8, 8],
        photometric: 0,
        pixels: [[0, 64, 255, 128]],
      }),
    );
    expect(result.photometric).toBe("white-is-zero");
    expect(rgba(result)).toEqual([255, 255, 255, 64, 0, 0, 0, 128]);
  });

  it("supports packed grayscale samples", () => {
    const result = new TIFFLoader().parse(
      makeTiff({
        width: 4,
        height: 1,
        bitsPerSample: [4],
        samplesPerPixel: 1,
        photometric: 1,
        pixels: [[0, 5, 10, 15]],
      }),
    );
    expect(rgba(result)).toEqual([
      0, 0, 0, 255, 85, 85, 85, 255, 170, 170, 170, 255, 255, 255, 255, 255,
    ]);
  });

  it("rejects compressed, planar, malformed, and truncated input", () => {
    const loader = new TIFFLoader();
    const compressed = new Uint8Array(
      makeTiff({ width: 1, height: 1, pixels: [[0, 0, 0]] }),
    );
    const view = new DataView(compressed.buffer);
    view.setUint16(8 + 2 + 3 * 12 + 8, 5, true);
    expect(() => loader.parse(compressed.buffer)).toThrow(COMPRESSION_ERROR);
    expect(() => loader.parse(new ArrayBuffer(7))).toThrow(HEADER_ERROR);
    const truncated = new Uint8Array(
      makeTiff({ width: 1, height: 1, pixels: [[0, 0, 0]] }),
    ).slice(0, -1);
    expect(() => loader.parse(truncated.buffer)).toThrow(STRIP_ERROR);
  });
});
