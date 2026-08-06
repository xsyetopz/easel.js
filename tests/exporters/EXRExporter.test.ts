import { describe, expect, it } from "bun:test";
import { EXRExporter } from "@/exporters/EXRExporter.js";
import { DataTexture } from "@/textures/DataTexture.js";

function readUint32(bytes: Uint8Array, offset: number): number {
  return new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).getUint32(offset, true);
}

function findAttribute(bytes: Uint8Array, attribute: string): number {
  const needle = new TextEncoder().encode(`${attribute}\0`);
  for (let offset = 8; offset + needle.length < bytes.length; offset++) {
    if (needle.every((value, index) => bytes[offset + index] === value))
      return offset;
  }
  return -1;
}

function headerEnd(bytes: Uint8Array): number {
  let offset = 8;
  while (bytes[offset] !== 0) {
    while (bytes[offset] !== 0) offset++;
    offset++;
    while (bytes[offset] !== 0) offset++;
    offset++;
    const size = readUint32(bytes, offset);
    offset += 4 + size;
  }
  return offset + 1;
}

describe("EXRExporter", () => {
  it("writes deterministic uncompressed RGBA float scanlines", () => {
    const source = {
      data: new Float32Array([0.1, 0.2, 0.3, 1, 1.5, 2.5, 3.5, 0.75]),
      width: 2,
      height: 1,
    };
    const exporter = new EXRExporter();
    const first = exporter.parse(source);
    const second = exporter.parse(source);
    expect(Array.from(first)).toEqual(Array.from(second));
    expect(Array.from(first.slice(0, 8))).toEqual([
      0x76, 0x2f, 0x31, 0x01, 0x02, 0x00, 0x00, 0x00,
    ]);
    expect(findAttribute(first, "channels")).toBeGreaterThan(0);
    expect(findAttribute(first, "dataWindow")).toBeGreaterThan(0);
    const dataWindow = findAttribute(first, "dataWindow");
    const dataWindowSize = readUint32(
      first,
      dataWindow + "dataWindow".length + 1 + "box2i".length + 1,
    );
    expect(dataWindowSize).toBe(16);
    expect(first.length).toBeGreaterThan(100);
    const scanlineOffset = Number(
      new DataView(first.buffer).getBigUint64(headerEnd(first), true),
    );
    const dataView = new DataView(first.buffer);
    const values = Array.from({ length: 8 }, (_value, index) =>
      dataView.getFloat32(scanlineOffset + 8 + index * 4, true),
    );
    expect(values).toHaveLength(8);
    expect(values.every(Number.isFinite)).toBe(true);
    expect(values[0]).toBeCloseTo(0.3, 6);
    expect(values[1]).toBeCloseTo(3.5, 6);
    expect(values[2]).toBeCloseTo(0.2, 6);
    expect(values[3]).toBeCloseTo(2.5, 6);
    expect(values[4]).toBeCloseTo(0.1, 6);
    expect(values[5]).toBeCloseTo(1.5, 6);
    expect(values[6]).toBeCloseTo(1, 6);
    expect(values[7]).toBeCloseTo(0.75, 6);
  });

  it("accepts DataTexture RGBA bytes and exposes a promise-shaped API", async () => {
    const texture = new DataTexture(
      new Uint8ClampedArray([0, 128, 255, 255]),
      1,
      1,
    );
    const exporter = new EXRExporter();
    const synchronous = exporter.parse(texture);
    const asynchronous = await exporter.parseAsync(texture);
    expect(Array.from(asynchronous)).toEqual(Array.from(synchronous));
    expect(synchronous.length).toBeGreaterThan(100);
  });

  it("rejects malformed sources and unsupported compression instead of silently changing format", () => {
    const exporter = new EXRExporter();
    expect(() =>
      exporter.parse({ data: new Float32Array(3), width: 1, height: 1 }),
    ).toThrow("expected 4 RGBA samples");
    expect(() =>
      exporter.parse(
        { data: new Float32Array(4), width: 1, height: 1 },
        { compression: "zip" as unknown as "none" },
      ),
    ).toThrow("unsupported compression");
  });
});
