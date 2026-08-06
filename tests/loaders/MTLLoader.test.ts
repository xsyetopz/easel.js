import { afterEach, describe, expect, it } from "bun:test";
import { BasicMaterial } from "@/materials/BasicMaterial.js";
import { LambertMaterial } from "@/materials/LambertMaterial.js";
import { MTLLoader } from "@/loaders/MTLLoader.js";
import { OBJLoader } from "@/loaders/OBJLoader.js";
import { Mesh } from "@/objects/Mesh.js";
import { Texture } from "@/textures/Texture.js";
import type { ImageDataLike } from "@/utils/ImageUtils.js";

describe("MTLLoader", () => {
  it("parses multiple materials and uses Kd before Ka", () => {
    const table = new MTLLoader().parse(`
			newmtl red
			Ka 0.05 0.1 0.2
			Kd 0.8 0.1 0.2
			illum 2
			newmtl ambient-only
			Ka 0.2 0.3 0.4
		`);

    expect(Object.keys(table.materials)).toEqual(["red", "ambient-only"]);
    expect(table).toBe(table.preload());
    expect(table.create("red")).toBe(table.get("red"));
    expect(table.getIndex("ambient-only")).toBe(1);
    expect(table.toArray()).toHaveLength(2);
    expect(table.get("red")).toBeInstanceOf(LambertMaterial);
    expect(table.getDefinition("red")?.ambientColor?.hex).toBe(0x0d1a33);
    expect(table.getDefinition("red")?.diffuseColor?.hex).toBe(0xcc1a33);
    expect(table.getDefinition("red")?.baseColor.hex).toBe(0xcc1a33);
    expect(table.getDefinition("red")?.illum).toBe(2);
    expect(table.materialsInfo["red"]?.kd).toEqual([0.8, 0.1, 0.2]);
    expect((table.get("ambient-only") as LambertMaterial).color.hex).toBe(
      0x334d66,
    );
  });

  it("quantizes dissolve and Tr while retaining raw transparency metadata", () => {
    const table = new MTLLoader().parse(`
			newmtl dissolve
			d 0.51
			newmtl transparent
			Tr 0.24
			newmtl opaque
			d 1
		`);

    const dissolve = table.getDefinition("dissolve");
    if (dissolve === undefined) return;
    expect(dissolve?.dissolve).toBeCloseTo(0.51);
    expect(dissolve?.opacity).toBeCloseTo(0.51);
    expect(dissolve?.opacityLevel).toBe(4);
    expect((dissolve.material as LambertMaterial).opacity).toBe(4);
    expect((dissolve.material as LambertMaterial).transparent).toBe(true);

    const transparent = table.getDefinition("transparent");
    expect(transparent?.transparencyValue).toBeCloseTo(0.24);
    expect(transparent?.opacityLevel).toBe(2);
    expect(transparent?.transparency).toBeCloseTo(0.24);
    expect(table.getDefinition("opaque")?.opacityLevel).toBe(0);
    expect((table.get("opaque") as LambertMaterial).transparent).toBe(false);
  });

  it("retains map_Kd paths and applies an existing CPU texture", () => {
    const pixels: ImageDataLike<Uint8ClampedArray> = {
      data: new Uint8ClampedArray([255, 255, 255, 255]),
      width: 1,
      height: 1,
    };
    const texture = new Texture(pixels);
    const table = new MTLLoader(undefined, {
      materialType: "basic",
      textures: new Map([["textures/albedo.png", texture]]),
    }).parse(
      "newmtl painted\nmap_Kd -s 2 3 -o 0.25 0.5 textures/albedo.png",
      "models/",
    );
    const definition = table.getDefinition("painted");

    expect(definition?.mapKd?.path).toBe("textures/albedo.png");
    expect(definition?.mapKd?.url).toBe("models/textures/albedo.png");
    expect(definition?.mapKd?.scale).toEqual([2, 3, 1]);
    expect(definition?.mapKd?.offset).toEqual([0.25, 0.5, 0]);
    expect((table.get("painted") as BasicMaterial).map).toBe(texture);
  });

  it("reports malformed records without inventing a material", () => {
    const table = new MTLLoader().parse(`
			Kd 1 0 0
			newmtl valid
			Kd invalid color
			d not-a-number
			map_Kd
			illum unknown
			newmtl
		`);

    expect(Object.keys(table.materials)).toEqual(["valid"]);
    expect(table.warnings.length).toBeGreaterThanOrEqual(5);
    expect(table.getDefinition("valid")?.diffuseColor).toBeUndefined();
  });

  it("accepts the parsed table through OBJLoader and preserves CPU map metadata", () => {
    const texture = new Texture({
      data: new Uint8ClampedArray([255, 255, 255, 255]),
      width: 1,
      height: 1,
    });
    const table = new MTLLoader(undefined, {
      materialType: "basic",
      textures: { "albedo.png": texture },
    }).parse("newmtl blue\nKd 0.2 0.4 0.8\nmap_Kd albedo.png");
    const obj = new OBJLoader();
    obj.setMaterials(table);
    const group = obj.parse(
      "mtllib model.mtl\nusemtl blue\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3",
    );
    const mesh = group.children[0];
    if (!(mesh instanceof Mesh)) return;
    expect(mesh.material).toBeInstanceOf(BasicMaterial);
    expect((mesh.material as BasicMaterial).color.hex).toBe(0x3366cc);
    expect((mesh.material as BasicMaterial).map).toBe(texture);
    expect(mesh.userData["mapKd"]).toEqual({
      path: "albedo.png",
      url: "albedo.png",
    });
  });
});

describe("MTLLoader lifecycle", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("loads and parses text through FileLoader without synchronous decoding", async () => {
    globalThis.fetch = (() =>
      Promise.resolve(
        new Response("newmtl loaded\nKd 1 0 0"),
      )) as unknown as typeof fetch;
    const table = await new MTLLoader().loadAsync("models/model.mtl");
    expect(table.get("loaded")).toBeInstanceOf(LambertMaterial);
  });
});
