import { describe, expect, test } from "bun:test";
import {
  buildMesh,
  buildVoxelVolume,
  type VOXChunk,
  VOXLoader,
} from "@/loaders/VOXLoader.ts";
import { Group } from "@/objects/Group.ts";
import { Mesh } from "@/objects/Mesh.ts";

function u32(value: number): number[] {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return [...bytes];
}

function i32(value: number): number[] {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setInt32(0, value, true);
  return [...bytes];
}

function stringValue(value: string): number[] {
  const bytes = new TextEncoder().encode(value);
  return [...u32(bytes.byteLength), ...bytes];
}

function dictionary(values: Record<string, string> = {}): number[] {
  const entries = Object.entries(values);
  return [
    ...u32(entries.length),
    ...entries.flatMap(([key, value]) => [
      ...stringValue(key),
      ...stringValue(value),
    ]),
  ];
}

function chunk(
  id: string,
  content: number[],
  children: number[] = [],
): Uint8Array {
  const bytes = new Uint8Array(12 + content.length + children.length);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < 4; index++) bytes[index] = id.charCodeAt(index);
  view.setUint32(4, content.length, true);
  view.setUint32(8, children.length, true);
  bytes.set(content, 12);
  bytes.set(children, 12 + content.length);
  return bytes;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(
    parts.reduce((size, part) => size + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function voxFile(version: 150 | 200, children: Uint8Array[]): ArrayBuffer {
  const mainChildren = concat(...children);
  const main = chunk("MAIN", [], [...mainChildren]);
  const output = new Uint8Array(8 + main.length);
  output.set([86, 79, 88, 32, ...u32(version)], 0);
  output.set(main, 8);
  return output.buffer;
}

function modelChunks(
  voxels: number[],
  x = 2,
  y = 1,
  z = 1,
): [Uint8Array, Uint8Array] {
  return [
    chunk("SIZE", [...u32(x), ...u32(y), ...u32(z)]),
    chunk("XYZI", [...u32(voxels.length / 4), ...voxels]),
  ];
}

function paletteChunk(color: number): Uint8Array {
  const values: number[] = [];
  for (let index = 0; index < 256; index++)
    values.push(...u32(index === 0 ? color : 0xff000000));
  return chunk("RGBA", values);
}

describe("VOXLoader", () => {
  test("parses VOX 150 chunks, applies RGBA palette, and builds greedy CPU geometry", () => {
    const [size, xyzi] = modelChunks([0, 0, 0, 1, 1, 0, 0, 1]);
    const result = new VOXLoader().parse(
      voxFile(150, [size, xyzi, paletteChunk(0xff3366cc)]),
    );
    expect(result.chunks).toHaveLength(1);
    const chunk = result.chunks[0];
    expect(chunk).toBeDefined();
    expect(chunk?.size).toEqual({ x: 2, y: 1, z: 1 });
    expect(chunk?.data).toEqual(new Uint8Array([0, 0, 0, 1, 1, 0, 0, 1]));
    expect(result.palette[1]).toBe(0xff3366cc);
    expect(chunk?.palette).toBe(result.palette);
    if (chunk === undefined) throw new Error("Expected a VOX chunk.");
    const mesh = buildMesh(chunk);
    expect(mesh).toBeInstanceOf(Mesh);
    expect(mesh.geometry?.getAttribute("color")?.getX(0)).toBeCloseTo(
      0xcc / 255,
    );
    // Two adjacent equal-colored voxels share their internal face and produce six quads.
    expect(mesh.geometry?.index?.length).toBe(36);
    expect(mesh.geometry?.getAttribute("position")?.count).toBe(24);
  });

  test("decodes CPU occupancy and palette-index volume without a GPU texture", () => {
    const [size, xyzi] = modelChunks([1, 0, 0, 2, 0, 0, 0, 3], 2, 1, 1);
    const result = new VOXLoader().parse(voxFile(200, [size, xyzi]));
    const volume = result.chunks[0];
    expect(volume).toBeDefined();
    if (volume === undefined) throw new Error("Expected a VOX chunk.");
    const voxels = volume;
    expect(buildMesh(voxels).geometry?.getAttribute("position")?.count).toBe(
      40,
    );
    const data = buildVoxelVolume(voxels);
    expect([...data.occupancy]).toEqual([255, 255]);
    expect([...data.colors]).toEqual([3, 2]);
    expect(data.size).toEqual({ x: 2, y: 1, z: 1 });
  });

  test("builds nTRN, nSHP, and nGRP graph transforms as CPU nodes", () => {
    const [size, xyzi] = modelChunks([0, 0, 0, 1], 1, 1, 1);
    const shape = chunk("nSHP", [
      ...u32(2),
      ...dictionary({ _name: "VoxelShape" }),
      ...u32(1),
      ...u32(0),
      ...dictionary({ _f: "0" }),
    ]);
    const transform = chunk("nTRN", [
      ...u32(0),
      ...dictionary({ _name: "Translated" }),
      ...u32(2),
      ...u32(0xffffffff),
      ...i32(0),
      ...u32(1),
      ...dictionary({ _t: "1 2 3" }),
    ]);
    const group = chunk("nGRP", [
      ...u32(3),
      ...dictionary({ _name: "Group" }),
      ...u32(1),
      ...u32(2),
    ]);
    const result = new VOXLoader().parse(
      voxFile(150, [size, xyzi, transform, shape, group]),
    );
    expect(result.nodes[0]?.type).toBe("transform");
    expect(result.nodes[2]?.type).toBe("shape");
    expect(result.scene).toBeInstanceOf(Mesh);
    expect(result.scene?.name).toBe("Translated");
    expect(result.scene?.position.toArray()).toEqual([1, 3, -2]);

    const rootGroup = chunk("nGRP", [
      ...u32(0),
      ...dictionary({ _name: "Group" }),
      ...u32(1),
      ...u32(2),
    ]);
    const grouped = new VOXLoader().parse(
      voxFile(150, [size, xyzi, rootGroup, shape]),
    );
    expect(grouped.scene).toBeInstanceOf(Group);
    expect(grouped.scene?.children).toHaveLength(1);
  });

  test("rejects truncated, unsupported, and invalid voxel data", () => {
    expect(() => new VOXLoader().parse(new ArrayBuffer(0))).toThrow(
      /truncated/u,
    );
    expect(() =>
      new VOXLoader().parse(
        voxFile(150, [chunk("SIZE", [...u32(1), ...u32(1), ...u32(1)])]),
      ),
    ).toThrow(/missing an XYZI/u);
    const [size, xyzi] = modelChunks([1, 0, 0, 0], 1, 1, 1);
    expect(() => new VOXLoader().parse(voxFile(150, [size, xyzi]))).toThrow(
      /invalid voxel/u,
    );
    expect(() =>
      new VOXLoader().parse(
        voxFile(150, [
          chunk("SIZE", [...u32(1), ...u32(1), ...u32(1)]),
          chunk("XYZI", [...u32(1), 2, 0, 0, 1]),
        ]),
      ),
    ).toThrow(/invalid voxel/u);
  });

  test("buildMesh validates externally supplied chunks", () => {
    const invalid: VOXChunk = {
      size: { x: 1, y: 1, z: 1 },
      data: new Uint8Array([2, 0, 0, 1]),
      palette: [0, 0xffffffff],
    };
    expect(() => buildMesh(invalid)).toThrow(/outside/u);
  });
});
