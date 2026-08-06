import { describe, expect, test } from "bun:test";
import {
  type NRRDDataArray,
  NRRDLoader,
  NRRDVolume,
} from "@/loaders/NRRDLoader.ts";

function withRawPayload(
  header: string,
  values: readonly number[],
  little: boolean,
): ArrayBuffer {
  const headerBytes = new TextEncoder().encode(header);
  const payload = new ArrayBuffer(values.length * 2);
  const view = new DataView(payload);
  values.forEach((value, index) => {
    view.setUint16(index * 2, value, little);
  });
  const bytes = new Uint8Array(headerBytes.byteLength + payload.byteLength);
  bytes.set(headerBytes);
  bytes.set(new Uint8Array(payload), headerBytes.byteLength);
  return bytes.buffer;
}

function values(data: NRRDDataArray): number[] {
  return Array.from(data);
}

describe("NRRDLoader", () => {
  test("parses CRLF raw big-endian volumes and extracts CPU slices", () => {
    const input = withRawPayload(
      [
        "NRRD0005",
        "type: ushort",
        "dimension: 3",
        "sizes: 2 2 2",
        "encoding: raw",
        "endian: big",
        "space: right-anterior-superior",
        "spacings: 1 2 3",
        "space origin: (10, 20, 30)",
        "",
        "",
      ].join("\r\n"),
      [1, 2, 3, 4, 5, 6, 7, 8],
      false,
    );
    const volume = new NRRDLoader().parse(input);
    expect(volume).toBeInstanceOf(NRRDVolume);
    expect(volume.dimensions).toEqual([2, 2, 2]);
    expect(volume.getData(1, 0, 1)).toBe(6);
    expect(volume.reverseAccess(5)).toEqual([1, 0, 1]);
    expect(volume.spacing).toEqual([1, 2, 3]);
    expect(volume.header.spaceOrigin).toEqual([10, 20, 30]);
    expect(values(volume.slice("z", 1).data)).toEqual([5, 6, 7, 8]);
    expect(values(volume.slice("x", 1).data)).toEqual([2, 4, 6, 8]);
  });

  test("parses ASCII and hexadecimal scalar encodings", () => {
    const loader = new NRRDLoader();
    const ascii = loader.parse(
      [
        "NRRD0004",
        "type: float",
        "dimension: 2",
        "sizes: 3 1",
        "encoding: ascii",
        "",
        "0 0.5 1",
      ].join("\n"),
    );
    expect(ascii.header.type).toBe("float32");
    expect(values(ascii.data)).toEqual([0, 0.5, 1]);
    const hex = loader.parse(
      [
        "NRRD0005",
        "type: uchar",
        "dimension: 1",
        "sizes: 3",
        "encoding: hex",
        "",
        "00 7f ff",
      ].join("\n"),
    );
    expect(values(hex.data)).toEqual([0, 127, 255]);
  });

  test("creates a bounded grayscale Canvas2D texture from a scalar plane", () => {
    const volume = new NRRDLoader().parse(
      [
        "NRRD0005",
        "type: uchar",
        "dimension: 2",
        "sizes: 3 1",
        "encoding: ascii",
        "",
        "0 127 255",
      ].join("\n"),
    );
    const texture = volume.toDataTexture("z", 0, { name: "slice" });
    expect(texture.name).toBe("slice");
    expect(texture.width).toBe(3);
    expect(texture.height).toBe(1);
    expect(Array.from(texture.data?.data ?? [])).toEqual([
      0, 0, 0, 255, 127, 127, 127, 255, 255, 255, 255, 255,
    ]);
  });

  test("rejects detached, compressed, and unsupported NRRD payloads", () => {
    const loader = new NRRDLoader();
    expect(() =>
      loader.parse(
        [
          "NRRD0005",
          "type: uchar",
          "dimension: 1",
          "sizes: 1",
          "encoding: raw",
          "data file: values.raw",
          "",
          "",
        ].join("\n"),
      ),
    ).toThrow(/detached.*data file/u);
    expect(() =>
      loader.parse(
        [
          "NRRD0005",
          "type: uchar",
          "dimension: 1",
          "sizes: 1",
          "encoding: gzip",
          "",
          "",
        ].join("\n"),
      ),
    ).toThrow(/supported encodings/u);
    expect(() =>
      loader.parse(
        [
          "NRRD0005",
          "type: block",
          "dimension: 1",
          "sizes: 1",
          "encoding: ascii",
          "",
          "",
          "0",
        ].join("\n"),
      ),
    ).toThrow(/unsupported scalar type/u);
  });
});
