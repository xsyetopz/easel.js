import { describe, expect, it } from "bun:test";
import { GLTFLoader } from "@/loaders/GLTFLoader.js";
import { LambertMaterial } from "@/materials/LambertMaterial.js";
import { InstancedMesh } from "@/objects/InstancedMesh.js";
import { LOD } from "@/objects/LOD.js";
import { Mesh } from "@/objects/Mesh.js";

function makeDataUri(): string {
  const bytes = new Uint8Array(74);
  const view = new DataView(bytes.buffer);
  const positions = [0, 0, 0, 1, 0, 0, 0, 1, 0];
  positions.forEach((value, index) => {
    view.setFloat32(index * 4, value, true);
  });
  [0, 1, 2].forEach((value, index) => {
    view.setUint16(36 + index * 2, value, true);
  });
  view.setFloat32(42, 0, true);
  view.setFloat32(46, 1, true);
  [0, 0, 0, 1, 0, 0].forEach((value, index) => {
    view.setFloat32(50 + index * 4, value, true);
  });
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:application/octet-stream;base64,${btoa(binary)}`;
}

function makeInstancingDataUri(): string {
  const bytes = new Uint8Array(140);
  const view = new DataView(bytes.buffer);
  [0, 0, 0, 1, 0, 0, 0, 1, 0].forEach((value, index) => {
    view.setFloat32(index * 4, value, true);
  });
  const translations = [1, 0, 0, -1, 0, 0];
  translations.forEach((value, index) => {
    view.setFloat32(36 + index * 4, value, true);
  });
  const rotations = [0, 0, 0, 1, 0, 0, 0, 1];
  rotations.forEach((value, index) => {
    view.setFloat32(60 + index * 4, value, true);
  });
  const scales = [1, 2, 1, 2, 1, 1];
  scales.forEach((value, index) => {
    view.setFloat32(92 + index * 4, value, true);
  });
  const colors = [1, 0, 0, 0, 1, 0];
  colors.forEach((value, index) => {
    view.setFloat32(116 + index * 4, value, true);
  });
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:application/octet-stream;base64,${btoa(binary)}`;
}

function makeAnimationPointerDocument(): Record<string, unknown> {
  const values = new Float32Array([
    0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0,
  ]);
  let binary = "";
  for (const byte of new Uint8Array(values.buffer))
    binary += String.fromCharCode(byte);
  return {
    asset: { version: "2.0" },
    buffers: [
      {
        uri: `data:application/octet-stream;base64,${btoa(binary)}`,
        byteLength: values.byteLength,
      },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 8 },
      { buffer: 0, byteOffset: 8, byteLength: 24 },
      { buffer: 0, byteOffset: 32, byteLength: 32 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 2, type: "SCALAR" },
      { bufferView: 1, componentType: 5126, count: 2, type: "VEC3" },
      { bufferView: 2, componentType: 5126, count: 2, type: "VEC4" },
    ],
    materials: [
      {
        name: "Pointer material",
        pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1] },
      },
    ],
    nodes: [{ name: "Pointer node" }],
    scenes: [{ nodes: [0] }],
    animations: [
      {
        name: "Pointer animation",
        samplers: [
          { input: 0, output: 1 },
          { input: 0, output: 2, interpolation: "STEP" },
        ],
        channels: [
          {
            sampler: 0,
            target: {
              path: "pointer",
              extensions: {
                KHR_animation_pointer: { pointer: "/nodes/0/translation" },
              },
            },
          },
          {
            sampler: 1,
            target: {
              path: "pointer",
              extensions: {
                KHR_animation_pointer: {
                  pointer: "/materials/0/pbrMetallicRoughness/baseColorFactor",
                },
              },
            },
          },
        ],
      },
    ],
  };
}

function makeExtensionDocument(
  extension: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const bufferUri = makeInstancingDataUri();
  return {
    asset: { version: "2.0" },
    buffers: [{ uri: bufferUri, byteLength: 140 }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36 },
      { buffer: 0, byteOffset: 36, byteLength: 24 },
      { buffer: 0, byteOffset: 60, byteLength: 32 },
      { buffer: 0, byteOffset: 92, byteLength: 24 },
      { buffer: 0, byteOffset: 116, byteLength: 24 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
      { bufferView: 1, componentType: 5126, count: 2, type: "VEC3" },
      { bufferView: 2, componentType: 5126, count: 2, type: "VEC4" },
      { bufferView: 3, componentType: 5126, count: 2, type: "VEC3" },
      { bufferView: 4, componentType: 5126, count: 2, type: "VEC3" },
    ],
    meshes: [
      { name: "Triangle", primitives: [{ attributes: { POSITION: 0 } }] },
    ],
    nodes: [{ name: "Instances", mesh: 0, extensions: extension }],
    scenes: [{ nodes: [0] }],
  };
}

describe("GLTFLoader", () => {
  it("decodes embedded buffers, scene nodes, geometry, and CPU materials", () => {
    const result = new GLTFLoader().parse({
      asset: { version: "2.0", generator: "test" },
      buffers: [{ uri: makeDataUri(), byteLength: 74 }],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: 36 },
        { buffer: 0, byteOffset: 36, byteLength: 6 },
        { buffer: 0, byteOffset: 42, byteLength: 8 },
        { buffer: 0, byteOffset: 50, byteLength: 24 },
      ],
      accessors: [
        { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
        { bufferView: 1, componentType: 5123, count: 3, type: "SCALAR" },
        { bufferView: 2, componentType: 5126, count: 2, type: "SCALAR" },
        { bufferView: 3, componentType: 5126, count: 2, type: "VEC3" },
      ],
      images: [{ uri: "albedo.png" }],
      textures: [{ source: 0 }],
      materials: [
        {
          name: "Red",
          pbrMetallicRoughness: {
            baseColorFactor: [0.2, 0.4, 0.6, 1],
            baseColorTexture: { index: 0 },
          },
        },
      ],
      meshes: [
        {
          name: "Triangle",
          primitives: [
            { attributes: { POSITION: 0 }, indices: 1, material: 0 },
          ],
        },
      ],
      nodes: [
        {
          name: "Triangle",
          mesh: 0,
          translation: [1, 2, 3],
          extras: { source: "fixture" },
        },
      ],
      scenes: [{ name: "Main", nodes: [0] }],
      animations: [
        {
          name: "Move",
          samplers: [{ input: 2, output: 3 }],
          channels: [{ sampler: 0, target: { node: 0, path: "translation" } }],
        },
      ],
    });

    expect(result.scene.name).toBe("Main");
    expect(result.scene.children).toHaveLength(1);
    const mesh = result.scene.children[0];
    expect(mesh).toBeInstanceOf(Mesh);
    if (!(mesh instanceof Mesh)) return;
    expect(mesh.position.toArray()).toEqual([1, 2, 3]);
    expect(mesh.userData["source"]).toBe("fixture");
    expect(mesh.geometry?.getAttribute("position")?.count).toBe(3);
    expect(mesh.geometry?.index).toEqual(new Uint16Array([0, 1, 2]));
    expect(mesh.material).toBeInstanceOf(LambertMaterial);
    expect((mesh.material as LambertMaterial).color.hex).toBe(0x336699);
    expect(result.materials[0]?.baseColorTexture?.uri).toBe("albedo.png");
    expect(result.animations[0]?.channels[0]?.times).toEqual([0, 1]);
    expect(result.animations[0]?.channels[0]?.values).toEqual([
      0, 0, 0, 1, 0, 0,
    ]);
  });

  it("decodes EXT_mesh_gpu_instancing into CPU InstancedMesh transforms and colors", () => {
    const result = new GLTFLoader().parse(
      makeExtensionDocument({
        EXT_mesh_gpu_instancing: {
          attributes: { TRANSLATION: 1, ROTATION: 2, SCALE: 3, _COLOR_0: 4 },
        },
      }),
    );
    const mesh = result.scene.children[0];
    expect(mesh).toBeInstanceOf(InstancedMesh);
    if (!(mesh instanceof InstancedMesh)) return;
    expect(mesh.count).toBe(2);
    expect(mesh.instanceMatrix[12]).toBeCloseTo(1);
    expect(mesh.instanceMatrix[13]).toBeCloseTo(0);
    expect(mesh.instanceMatrix[28]).toBeCloseTo(-1);
    expect(mesh.instanceMatrix[5]).toBeCloseTo(2);
    expect(mesh.instanceColor?.slice()).toEqual(
      new Float32Array([1, 0, 0, 0, 1, 0]),
    );
    expect(result.instancing).toHaveLength(1);
    expect(result.instancing[0]?.count).toBe(2);
    expect(result.instancing[0]?.attributes["TRANSLATION"]?.values).toEqual([
      1, 0, 0, -1, 0, 0,
    ]);
    expect(mesh.userData["gltfInstancing"]).toBeDefined();
  });

  it("builds MSFT_lod node chains as CPU LOD levels with screen-coverage metadata", () => {
    const document = makeExtensionDocument({
      MSFT_lod: { ids: [1, 2] },
    });
    document["nodes"] = [
      {
        name: "High",
        mesh: 0,
        extras: { MSFT_screencoverage: [0.5, 0.2, 0.01] },
        extensions: { MSFT_lod: { ids: [1, 2] } },
      },
      { name: "Medium", mesh: 0 },
      { name: "Low", mesh: 0 },
    ];
    const result = new GLTFLoader().parse(document);
    const lod = result.scene.children[0];
    expect(lod).toBeInstanceOf(LOD);
    if (!(lod instanceof LOD)) return;
    expect(lod.levels).toHaveLength(3);
    expect(lod.currentLevel).toBe(0);
    expect(lod.levels.map((level) => level.distance)).toEqual([0, 5, 100]);
    expect(lod.levels[0]?.object.visible).toBe(true);
    expect(lod.levels[1]?.object.visible).toBe(false);
    expect(result.lods[0]?.ids).toEqual([1, 2]);
    expect(result.lods[0]?.screenCoverage).toEqual([0.5, 0.2, 0.01]);
    expect(lod.getObjectForDistance(6)).toBe(lod.levels[1]?.object);
  });

  it("preserves KHR_materials_variants names and primitive mappings as CPU metadata", () => {
    const document = makeExtensionDocument({});
    const meshes = document["meshes"] as Array<Record<string, unknown>>;
    const primitives = meshes[0]?.["primitives"] as Array<
      Record<string, unknown>
    >;
    if (!primitives?.[0]) return;
    primitives[0]["extensions"] = {
      KHR_materials_variants: { mappings: [{ material: 0, variants: [0, 1] }] },
    };
    document["extensions"] = {
      KHR_materials_variants: {
        variants: [{ name: "Red" }, { name: "Green" }],
      },
    };
    const result = new GLTFLoader().parse(document);
    expect(result.variants).toEqual([
      { index: 0, name: "Red" },
      { index: 1, name: "Green" },
    ]);
    expect(result.variantMappings).toEqual([
      { mesh: 0, primitive: 0, material: 0, variants: [0, 1] },
    ]);
  });

  it("preserves KHR_animation_pointer targets and decodes CPU channel values", () => {
    const result = new GLTFLoader().parse(makeAnimationPointerDocument());
    const channels = result.animations[0]?.channels;
    expect(channels).toHaveLength(2);
    expect(channels?.map((channel) => channel.target)).toEqual([
      { path: "pointer", pointer: "/nodes/0/translation" },
      {
        path: "pointer",
        pointer: "/materials/0/pbrMetallicRoughness/baseColorFactor",
      },
    ]);
    expect(channels?.[0]?.times).toEqual([0, 1]);
    expect(channels?.[0]?.values).toEqual([0, 0, 0, 1, 0, 0]);
    expect(channels?.[1]?.interpolation).toBe("STEP");
    expect(channels?.[1]?.values).toEqual([1, 0, 1, 0, 0, 1, 1, 0]);
  });
});
