import { describe, expect, it } from "bun:test";
import { DataTextureLoader } from "@/loaders/DataTextureLoader.js";
import { DDSLoader } from "@/loaders/DDSLoader.js";
import { DataTexture } from "@/textures/DataTexture.js";

interface DDSFixtureOptions {
  readonly width: number;
  readonly height: number;
  readonly bitsPerPixel?: 24 | 32;
  readonly flags?: number;
  readonly mipmapCount?: number;
  readonly pixelFlags?: number;
  readonly fourCC?: number;
  readonly redMask?: number;
  readonly greenMask?: number;
  readonly blueMask?: number;
  readonly alphaMask?: number;
  readonly caps2?: number;
  readonly pitch?: number;
  readonly pixels: readonly number[];
}

function makeDds(options: DDSFixtureOptions): ArrayBuffer {
  const bitsPerPixel = options.bitsPerPixel ?? 32;
  const bytes = new Uint8Array(128 + options.pixels.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x20534444, true);
  view.setUint32(4, 124, true);
  view.setUint32(8, options.flags ?? 0x1007, true);
  view.setUint32(12, options.height, true);
  view.setUint32(16, options.width, true);
  view.setUint32(
    20,
    options.pitch ?? options.width * (bitsPerPixel >> 3),
    true,
  );
  view.setUint32(28, options.mipmapCount ?? 1, true);
  view.setUint32(76, 32, true);
  view.setUint32(80, options.pixelFlags ?? 0x41, true);
  view.setUint32(84, options.fourCC ?? 0, true);
  view.setUint32(88, bitsPerPixel, true);
  view.setUint32(92, options.redMask ?? 0x00ff0000, true);
  view.setUint32(96, options.greenMask ?? 0x0000ff00, true);
  view.setUint32(100, options.blueMask ?? 0x000000ff, true);
  view.setUint32(104, options.alphaMask ?? 0xff000000, true);
  view.setUint32(116, options.caps2 ?? 0, true);
  bytes.set(options.pixels, 128);
  return bytes.buffer;
}

function rgba(result: ReturnType<DDSLoader["parse"]>): number[] {
  return Array.from(result.data);
}

describe("DDSLoader", () => {
  it("extends DataTextureLoader and decodes BGRA32 pixels", () => {
    const loader = new DDSLoader();
    expect(loader).toBeInstanceOf(DataTextureLoader);
    const result = loader.parse(
      makeDds({
        width: 2,
        height: 1,
        pixels: [30, 20, 10, 40, 3, 2, 1, 255],
      }),
    );

    expect(result.pixelFormat).toBe("bgra8");
    expect(result.width).toBe(2);
    expect(result.height).toBe(1);
    expect(result.mipmapCount).toBe(1);
    expect(result.isCubemap).toBe(false);
    expect(result.compressed).toBe(false);
    expect(rgba(result)).toEqual([10, 20, 30, 40, 1, 2, 3, 255]);
  });

  it("decodes RGBA32 and BGR24 byte layouts into RGBA output", () => {
    const loader = new DDSLoader();
    const rgbaResult = loader.parse(
      makeDds({
        width: 1,
        height: 1,
        redMask: 0x000000ff,
        greenMask: 0x0000ff00,
        blueMask: 0x00ff0000,
        alphaMask: 0xff000000,
        pixels: [9, 8, 7, 6],
      }),
    );
    expect(rgbaResult.pixelFormat).toBe("rgba8");
    expect(rgba(rgbaResult)).toEqual([9, 8, 7, 6]);

    const bgrResult = loader.parse(
      makeDds({
        width: 1,
        height: 1,
        bitsPerPixel: 24,
        alphaMask: 0,
        pixels: [70, 80, 90],
      }),
    );
    expect(bgrResult.pixelFormat).toBe("bgr8");
    expect(rgba(bgrResult)).toEqual([90, 80, 70, 255]);
  });

  it("decodes mipmaps and converts a selected level to DataTexture", () => {
    const loader = new DDSLoader();
    const result = loader.parse(
      makeDds({
        width: 2,
        height: 2,
        flags: 0x21007,
        mipmapCount: 2,
        pixels: [
          30, 20, 10, 255, 60, 50, 40, 255, 90, 80, 70, 255, 120, 110, 100, 255,
          3, 2, 1, 200,
        ],
      }),
    );

    expect(result.mipmapCount).toBe(2);
    expect(
      result.mipmaps.map((mipmap) => [mipmap.width, mipmap.height]),
    ).toEqual([
      [2, 2],
      [1, 1],
    ]);
    expect(Array.from(result.mipmaps[1]?.data ?? [])).toEqual([1, 2, 3, 200]);

    const texture = loader.toDataTexture(result, 1);
    expect(texture).toBeInstanceOf(DataTexture);
    expect(texture.width).toBe(1);
    expect(texture.height).toBe(1);
    expect(Array.from(texture.data?.data ?? [])).toEqual([1, 2, 3, 200]);
    texture.dispose();

    expect(
      loader.parse(
        makeDds({
          width: 2,
          height: 2,
          flags: 0x21007,
          mipmapCount: 2,
          pixels: [
            30, 20, 10, 255, 60, 50, 40, 255, 90, 80, 70, 255, 120, 110, 100,
            255, 3, 2, 1, 200,
          ],
        }),
        false,
      ).mipmapCount,
    ).toBe(1);
  });

  it("rejects compressed, cubemap, malformed, and truncated payloads", () => {
    const loader = new DDSLoader();
    expect(() => loader.parse(new ArrayBuffer(127))).toThrow(/header/u);
    expect(() =>
      loader.parse(
        makeDds({
          width: 1,
          height: 1,
          pixelFlags: 0x4,
          fourCC: 0x31545844,
          pixels: [],
        }),
      ),
    ).toThrow(/Compressed DXT\/BCn.*only uncompressed RGBA\/BGRA/u);
    expect(() =>
      loader.parse(
        makeDds({
          width: 1,
          height: 1,
          caps2: 0x200,
          pixels: [0, 0, 0, 255],
        }),
      ),
    ).toThrow(/Cubemap.*2D DataTexture/u);
    expect(() =>
      loader.parse(
        makeDds({
          width: 1,
          height: 1,
          redMask: 0x0000ffff,
          pixels: [0, 0, 0, 255],
        }),
      ),
    ).toThrow(/red channel mask/u);
    expect(() =>
      loader.parse(
        makeDds({
          width: 2,
          height: 2,
          pixels: [0, 0, 0, 255],
        }),
      ),
    ).toThrow(/Truncated pixel data/u);
  });
});
