import { describe, expect, it } from "bun:test";
import { DataTextureLoader } from "@/loaders/DataTextureLoader.js";
import { TGALoader } from "@/loaders/TGALoader.js";

interface TGAOptions {
  width: number;
  height: number;
  imageType: number;
  pixelDepth: number;
  flags?: number;
  colorMapType?: number;
  colorMapIndex?: number;
  colorMapLength?: number;
  colorMapSize?: number;
  colorMap?: readonly number[];
  id?: readonly number[];
  pixels: readonly number[];
}

function makeTga(options: TGAOptions): ArrayBuffer {
  const id = options.id ?? [];
  const colorMap = options.colorMap ?? [];
  const bytes = new Uint8Array(
    18 + id.length + colorMap.length + options.pixels.length,
  );
  bytes[0] = id.length;
  bytes[1] = options.colorMapType ?? 0;
  bytes[2] = options.imageType;
  writeUint16(bytes, 3, options.colorMapIndex ?? 0);
  writeUint16(bytes, 5, options.colorMapLength ?? 0);
  bytes[7] = options.colorMapSize ?? 0;
  writeUint16(bytes, 12, options.width);
  writeUint16(bytes, 14, options.height);
  bytes[16] = options.pixelDepth;
  bytes[17] = options.flags ?? 0x20;
  bytes.set(id, 18);
  bytes.set(colorMap, 18 + id.length);
  bytes.set(options.pixels, 18 + id.length + colorMap.length);
  return bytes.buffer;
}

function writeUint16(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 255;
  bytes[offset + 1] = value >>> 8;
}

function rgba(texture: ReturnType<TGALoader["parse"]>): number[] {
  return Array.from(texture.data);
}

describe("TGALoader", () => {
  it("extends DataTextureLoader and decodes top-left BGR pixels", () => {
    const loader = new TGALoader();
    expect(loader).toBeInstanceOf(DataTextureLoader);
    const result = loader.parse(
      makeTga({
        width: 2,
        height: 2,
        imageType: 2,
        pixelDepth: 24,
        pixels: [0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255],
      }),
    );
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(rgba(result)).toEqual([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
    ]);
  });

  it("normalizes bottom-left origin ordering", () => {
    const result = new TGALoader().parse(
      makeTga({
        width: 2,
        height: 2,
        imageType: 2,
        pixelDepth: 24,
        flags: 0,
        pixels: [255, 0, 0, 255, 255, 255, 0, 0, 255, 0, 255, 0],
      }),
    );
    expect(rgba(result)).toEqual([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
    ]);
  });

  it("decodes RLE true-color packets and 32-bit alpha", () => {
    const result = new TGALoader().parse(
      makeTga({
        width: 3,
        height: 1,
        imageType: 10,
        pixelDepth: 32,
        pixels: [0x81, 30, 20, 10, 128, 0x00, 60, 50, 40, 255],
      }),
    );
    expect(rgba(result)).toEqual([
      10, 20, 30, 128, 10, 20, 30, 128, 40, 50, 60, 255,
    ]);
  });

  it("decodes indexed palette entries with non-zero palette origin", () => {
    const result = new TGALoader().parse(
      makeTga({
        width: 2,
        height: 1,
        imageType: 1,
        pixelDepth: 8,
        colorMapType: 1,
        colorMapIndex: 4,
        colorMapLength: 2,
        colorMapSize: 24,
        colorMap: [0, 0, 255, 0, 255, 0],
        pixels: [4, 5],
      }),
    );
    expect(rgba(result)).toEqual([255, 0, 0, 255, 0, 255, 0, 255]);
  });

  it("decodes grayscale alpha and preserves top-right origin", () => {
    const result = new TGALoader().parse(
      makeTga({
        width: 2,
        height: 1,
        imageType: 3,
        pixelDepth: 16,
        flags: 0x30,
        pixels: [10, 20, 30, 40],
      }),
    );
    expect(rgba(result)).toEqual([30, 30, 30, 40, 10, 10, 10, 20]);
  });

  it("rejects unsupported, truncated, and out-of-range input", () => {
    const loader = new TGALoader();
    expect(() => loader.parse(new ArrayBuffer(17))).toThrow(/header/u);
    expect(() =>
      loader.parse(
        makeTga({
          width: 1,
          height: 1,
          imageType: 2,
          pixelDepth: 24,
          pixels: [0, 0],
        }),
      ),
    ).toThrow(/Truncated pixel/u);
    expect(() =>
      loader.parse(
        makeTga({
          width: 1,
          height: 1,
          imageType: 9,
          pixelDepth: 8,
          colorMapType: 1,
          colorMapLength: 1,
          colorMapSize: 24,
          colorMap: [0, 0, 255],
          pixels: [0x81, 0],
        }),
      ),
    ).toThrow(/RLE packet exceeds/u);
    expect(() =>
      loader.parse(
        makeTga({
          width: 1,
          height: 1,
          imageType: 1,
          pixelDepth: 8,
          colorMapType: 1,
          colorMapIndex: 4,
          colorMapLength: 1,
          colorMapSize: 24,
          colorMap: [0, 0, 255],
          pixels: [3],
        }),
      ),
    ).toThrow(/out of range/u);
  });
});
