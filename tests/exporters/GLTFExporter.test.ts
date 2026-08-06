import { describe, expect, it } from "bun:test";
import { AnimationClip } from "@/animation/AnimationClip.js";
import { VectorTrack } from "@/animation/tracks/VectorTrack.js";
import { Attribute } from "@/geometry/Attribute.js";
import { BoxGeometry } from "@/geometry/primitives/BoxGeometry.js";
import { GLTFExporter } from "@/exporters/GLTFExporter.js";
import { BasicMaterial } from "@/materials/BasicMaterial.js";
import { Mesh } from "@/objects/Mesh.js";
import { Scene } from "@/core/Scene.js";
import { Texture } from "@/textures/Texture.js";

describe("GLTFExporter", () => {
  it("serializes deterministic CPU geometry, attributes, transforms, and material metadata", () => {
    const texture = new Texture();
    texture.image = {
      src: "textures/albedo.png",
    } as unknown as HTMLImageElement;
    const material = new BasicMaterial({
      name: "Albedo",
      color: 0x336699,
      transparent: true,
      opacity: 2,
      map: texture,
    });
    const mesh = new Mesh(new BoxGeometry(1, 2, 3), material);
    mesh.name = "Box";
    mesh.position.set(1, 2, 3);
    const first = new GLTFExporter().parse(mesh);
    const second = new GLTFExporter().parse(mesh);

    expect(first.json).toEqual(second.json);
    expect(Array.from(first.binary)).toEqual(Array.from(second.binary));
    expect(first.json.asset.version).toBe("2.0");
    expect(first.json.nodes[0]?.mesh).toBe(0);
    expect(first.json.nodes[0]?.translation).toEqual([1, 2, 3]);
    expect(first.json.meshes[0]?.primitives[0]?.attributes).toHaveProperty(
      "POSITION",
    );
    expect(first.json.meshes[0]?.primitives[0]?.attributes).toHaveProperty(
      "NORMAL",
    );
    expect(first.json.meshes[0]?.primitives[0]?.attributes).toHaveProperty(
      "TEXCOORD_0",
    );
    expect(
      first.json.materials?.[0]?.pbrMetallicRoughness.baseColorFactor,
    ).toEqual([0.2, 0.4, 0.6, 0.75]);
    expect(first.json.materials?.[0]?.alphaMode).toBe("BLEND");
    expect(first.json.images?.[0]?.uri).toBe("textures/albedo.png");
    expect(
      first.json.buffers[0]?.uri?.startsWith(
        "data:application/octet-stream;base64,",
      ),
    ).toBe(true);
  });

  it("round-trips exported geometry through GLTFLoader-compatible buffer options", async () => {
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), new BasicMaterial());
    const result = await new GLTFExporter().parseAsync(mesh, {
      embedBuffers: false,
    });
    expect(result.json.buffers[0]?.uri).toBe("scene.bin");
    expect(result.json.bufferViews.length).toBeGreaterThan(0);
    expect(result.json.accessors.length).toBeGreaterThan(0);
  });

  it("serializes vector animation tracks into glTF channels", () => {
    const scene = new Scene();
    const mesh = new Mesh(new BoxGeometry(), new BasicMaterial());
    mesh.name = "Mover";
    scene.add(mesh);
    const animation = new AnimationClip("Move", -1, [
      new VectorTrack("Mover.position", [0, 1], [0, 0, 0, 1, 2, 3]),
    ]);
    const result = new GLTFExporter().parse(scene, { animations: [animation] });
    expect(result.json.animations?.[0]?.name).toBe("Move");
    expect(result.json.animations?.[0]?.channels[0]?.target).toEqual({
      node: 1,
      path: "translation",
    });
    expect(result.json.animations?.[0]?.samplers[0]?.interpolation).toBe(
      "LINEAR",
    );
  });

  it("normalizes CPU vertex normals for glTF output by default", () => {
    const geometry = new BoxGeometry(1, 1, 1);
    geometry.setNormals(
      new Float32Array(Array.from({ length: 24 }, () => [0, 0, 2]).flat()),
    );
    const mesh = new Mesh(geometry, new BasicMaterial());
    const result = new GLTFExporter().parse(mesh);
    const normalAccessorIndex =
      result.json.meshes[0]?.primitives[0]?.attributes["NORMAL"];
    expect(normalAccessorIndex).toBeDefined();
    if (normalAccessorIndex === undefined) return;
    const accessor = result.json.accessors[normalAccessorIndex];
    expect(accessor?.type).toBe("VEC3");
    const view = result.json.bufferViews[accessor?.bufferView ?? -1];
    expect(view).toBeDefined();
    if (!view) return;
    const values = new Float32Array(
      result.binary.buffer,
      result.binary.byteOffset + view.byteOffset,
      3,
    );
    expect(Array.from(values)).toEqual([0, 0, 1]);
  });

  it("exports CPU tangent attributes when present", () => {
    const geometry = new BoxGeometry(1, 1, 1);
    geometry.setAttribute(
      "tangent",
      new Attribute(
        new Float32Array(Array.from({ length: 24 }, () => [1, 0, 0, 1]).flat()),
        4,
      ),
    );
    const result = new GLTFExporter().parse(
      new Mesh(geometry, new BasicMaterial()),
    );
    expect(
      result.json.meshes[0]?.primitives[0]?.attributes["TANGENT"],
    ).toBeDefined();
  });
});
