import { describe, expect, it } from "bun:test";
import { MaterialLoader } from "@/loaders/MaterialLoader.ts";
import { BasicMaterial } from "@/materials/BasicMaterial.ts";
import { DashedLineMaterial } from "@/materials/DashedLineMaterial.ts";
import { LambertMaterial } from "@/materials/LambertMaterial.ts";
import { LineMaterial } from "@/materials/LineMaterial.ts";
import { Material } from "@/materials/Material.ts";
import { PointsMaterial } from "@/materials/PointsMaterial.ts";
import { ToonMaterial } from "@/materials/ToonMaterial.ts";
import { Texture } from "@/textures/Texture.ts";

describe("MaterialLoader", () => {
  it("round-trips every concrete CPU material and texture reference", () => {
    const map = new Texture();
    const gradientMap = new Texture();
    const loader = new MaterialLoader();
    loader.textures = new Map([
      [map.uuid, map],
      [gradientMap.uuid, gradientMap],
    ]);

    const materials = [
      new Material({ name: "base", vertexColors: false }),
      new BasicMaterial({ color: 0x123456, map, wireframe: true }),
      new LambertMaterial({ color: 0x234567, map }),
      new ToonMaterial({ color: 0x345678, map, gradientMap }),
      new LineMaterial({ color: 0x456789, linewidth: 3 }),
      new DashedLineMaterial({
        color: 0x56789a,
        linewidth: 2,
        dashSize: 4,
        gapSize: 2,
      }),
      new PointsMaterial({ color: 0x6789ab, map, size: 5 }),
    ];

    for (const material of materials) {
      const loaded = loader.parse(material.toJSON());
      expect(loaded.constructor).toBe(material.constructor);
      expect(loaded.toJSON()).toEqual(material.toJSON());
    }

    expect((loader.parse(materials[1].toJSON()) as BasicMaterial).map).toBe(
      map,
    );
    expect(
      (loader.parse(materials[3].toJSON()) as ToonMaterial).gradientMap,
    ).toBe(gradientMap);
  });

  it("rejects malformed state and unresolved texture references", () => {
    const loader = new MaterialLoader();
    expect(() => loader.parse({ type: "Material", opacity: 0.5 })).toThrow(
      "finite integer",
    );
    expect(() =>
      loader.parse({ type: "BasicMaterial", color: Number.NaN }),
    ).toThrow("color must be a finite number");
    expect(() =>
      loader.parse({ type: "BasicMaterial", map: "missing" }),
    ).toThrow('unknown map texture "missing"');
    expect(() => loader.parse({ type: "Material", visible: 1 })).toThrow(
      "visible must be a boolean",
    );
  });
});
