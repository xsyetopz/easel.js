import { describe, expect, it } from "bun:test";
import { DataTextureLoader } from "@/loaders/DataTextureLoader.js";
import {
  HDRLoader,
  type HDRParseResult,
  RGBELoader,
} from "@/loaders/HDRLoader.js";
import { DataTexture } from "@/textures/DataTexture.js";

function makeHdr(
  width: number,
  height: number,
  pixels: readonly number[],
  format = "32-bit_rgbe",
): ArrayBuffer {
  const header = `#?RADIANCE\nFORMAT=${format}\n-Y ${height} +X ${width}\n`;
  const encoded = new TextEncoder().encode(header);
  const bytes = new Uint8Array(encoded.length + pixels.length);
  bytes.set(encoded);
  bytes.set(pixels, encoded.length);
  return bytes.buffer;
}

function makeHdrWithoutSeparator(
  width: number,
  height: number,
  pixels: readonly number[],
): ArrayBuffer {
  const header = `#?RADIANCE\nFORMAT=32-bit_rgbe\n-Y ${height} +X ${width}\n`;
  const encoded = new TextEncoder().encode(header);
  const bytes = new Uint8Array(encoded.length + pixels.length);
  bytes.set(encoded);
  bytes.set(pixels, encoded.length);
  return bytes.buffer;
}

function makeRleHdr(width: number, height: number): ArrayBuffer {
  const pixels: number[] = [];
  for (let channel = 0; channel < 4; channel++) {
    pixels.push(
      128 + width,
      channel === 0 ? 255 : channel === 1 ? 128 : channel === 3 ? 128 : 0,
    );
  }
  return makeHdr(
    width,
    height,
    [2, 2, width >> 8, width & 255, ...pixels],
    "32-bit_rle_rgbe",
  );
}

function data(result: HDRParseResult): number[] {
  return Array.from(result.data);
}

describe("HDRLoader", () => {
  it("extends DataTextureLoader and decodes flat RGBE pixels to tonemapped RGBA", () => {
    const loader = new HDRLoader();
    expect(loader).toBeInstanceOf(DataTextureLoader);
    const result = loader.parse(
      makeHdr(2, 1, [255, 0, 0, 128, 0, 255, 0, 129]),
    );

    expect(result.width).toBe(2);
    expect(result.height).toBe(1);
    expect(result.format).toBe("32-bit_rgbe");
    expect(Array.from(result.linearData)).toEqual([1, 0, 0, 1, 0, 2, 0, 1]);
    expect(data(result)).toEqual([188, 0, 0, 255, 0, 213, 0, 255]);
  });

  it("decodes Radiance channel RLE scanlines and creates a DataTexture", () => {
    const result = new HDRLoader().parse(makeRleHdr(8, 1));

    expect(result.format).toBe("32-bit_rle_rgbe");
    expect(Array.from(result.linearData)).toEqual(
      Array.from({ length: 8 }, () => [1, 0.501960813999176, 0, 1]).flat(),
    );
    const texture = new HDRLoader().toDataTexture(result);
    expect(texture).toBeInstanceOf(DataTexture);
    expect(texture.width).toBe(8);
    expect(texture.height).toBe(1);
    expect(Array.from(texture.data?.data ?? [])).toEqual(data(result));
    texture.dispose();
  });

  it("does not consume a binary first pixel that happens to equal a newline", () => {
    const result = new HDRLoader().parse(
      makeHdrWithoutSeparator(1, 1, [10, 20, 30, 128]),
    );
    expect(result.linearData[0]).toBeCloseTo(10 / 255);
  });

  it("supports exposure overrides, black pixels, and the RGBELoader alias", () => {
    const loader = new RGBELoader();
    const result = loader.parse(makeHdr(1, 1, [255, 255, 255, 0]));

    expect(result.linearData[0]).toBe(0);
    expect(data(result)).toEqual([0, 0, 0, 255]);
    const texture = loader.toDataTexture(result, {
      exposure: 0,
      toneMapping: "none",
    });
    expect(Array.from(texture.data?.data ?? [])).toEqual([0, 0, 0, 255]);
    texture.dispose();
  });

  it("rejects malformed, unsupported, and bounded payloads", () => {
    const loader = new HDRLoader();
    expect(() => loader.parse(new ArrayBuffer(0))).toThrow(/Header/u);
    expect(() =>
      loader.parse(makeHdr(1, 1, [0, 0, 0, 128], "32-bit_rle_xyze")),
    ).toThrow(/FORMAT/u);
    expect(() =>
      loader.parse(makeHdr(1, 1, [255, 0, 0], "32-bit_rgbe")),
    ).toThrow(/pixel data/u);
    expect(() =>
      loader.parse(makeHdrWithoutSeparator(8, 1, [2, 2, 0, 8, 136, 255])),
    ).toThrow(/scanline/u);

    const hugeHeader = new TextEncoder().encode(
      "#?RADIANCE\nFORMAT=32-bit_rgbe\n-Y 500000 +X 500000\n\n",
    );
    expect(() => new HDRLoader().parse(hugeHeader.buffer)).toThrow(/large/u);
  });
});
