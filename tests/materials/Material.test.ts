import { describe, expect, it } from "bun:test";
import { Shading, Side } from "@/core/Constants.js";
import { BasicMaterial } from "@/materials/BasicMaterial.js";
import { DashedLineMaterial } from "@/materials/DashedLineMaterial.js";
import { LambertMaterial } from "@/materials/LambertMaterial.js";
import { LineMaterial } from "@/materials/LineMaterial.js";
import { Material } from "@/materials/Material.js";
import { PointsMaterial } from "@/materials/PointsMaterial.js";
import { ToonMaterial } from "@/materials/ToonMaterial.js";
import { Color } from "@/math/Color.js";
import { Texture } from "@/textures/Texture.js";

describe("Material", () => {
  it("defaults to opaque depth-tested rendering", () => {
    const material = new Material();
    expect(material.isMaterial).toBe(true);
    expect(material.transparent).toBe(false);
    expect(material.depthTest).toBe(true);
    expect(material.depthWrite).toBe(true);
    expect(material.opacity).toBe(0);
    expect(material.vertexColors).toBe(true);
    expect(material.wireframe).toBe(false);
  });

  it("transparent constructor option disables depth writes by default", () => {
    const material = new Material({ transparent: true, opacity: 4 });
    expect(material.transparent).toBe(true);
    expect(material.depthTest).toBe(true);
    expect(material.depthWrite).toBe(false);
  });

  it("explicit depthWrite overrides transparent default", () => {
    const material = new Material({ transparent: true, depthWrite: true });
    expect(material.depthWrite).toBe(true);
  });

  it("preserves the discrete CPU opacity boundary", () => {
    const material = new Material();
    for (const value of [0, 8]) {
      material.opacity = value;
      expect(material.opacity).toBe(value);
    }

    material.opacity = 3;
    for (const value of [-1, 9, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => {
        material.opacity = value;
      }).toThrow(RangeError);
      expect(material.opacity).toBe(3);
    }
    expect(() => new Material({ opacity: 0.5 })).toThrow(RangeError);
  });

  it("copies common state without sharing identity or dirty state", () => {
    const source = new Material({
      name: "overlay",
      layer: 4,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: 4,
      shading: Shading.Gouraud,
      side: Side.Double,
      visible: false,
      wireframe: true,
      vertexColors: false,
    });
    source.needsUpdate = true;

    const copy = new Material().copy(source);
    expect(copy.id).not.toBe(source.id);
    expect(copy.name).toBe("overlay");
    expect(copy.layer).toBe(4);
    expect(copy.transparent).toBe(true);
    expect(copy.depthTest).toBe(false);
    expect(copy.depthWrite).toBe(false);
    expect(copy.opacity).toBe(4);
    expect(copy.shading).toBe(Shading.Gouraud);
    expect(copy.side).toBe(Side.Double);
    expect(copy.visible).toBe(false);
    expect(copy.wireframe).toBe(true);
    expect(copy.vertexColors).toBe(false);
    expect(copy.needsUpdate).toBe(false);
  });

  it("assigns color and common values through one modern bulk operation", () => {
    const material = new BasicMaterial();
    material.assign({
      color: "#123456",
      name: "hero",
      opacity: 4,
      transparent: true,
      wireframe: true,
      vertexColors: false,
    });

    expect(material.color.hex).toBe(0x123456);
    expect(material.name).toBe("hero");
    expect(material.opacity).toBe(4);
    expect(material.transparent).toBe(true);
    expect(material.wireframe).toBe(true);
    expect(material.vertexColors).toBe(false);
  });

  it("serializes canonical common state without THREE metadata", () => {
    const material = new Material({
      name: "overlay",
      layer: 2,
      opacity: 4,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      shading: Shading.Gouraud,
      side: Side.Back,
      visible: false,
      wireframe: true,
      vertexColors: false,
    });

    expect(material.toJSON()).toEqual({
      type: "Material",
      name: "overlay",
      layer: 2,
      opacity: 4,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      shading: Shading.Gouraud,
      side: Side.Back,
      visible: false,
      wireframe: true,
      vertexColors: false,
    });
    expect(material.toJSON()).not.toHaveProperty("metadata");
  });

  it("matches installed THREE common material defaults and flags", async () => {
    type THREEMaterial = {
      isMaterial: boolean;
      color: { getHex(): number };
      transparent: boolean;
      opacity: number;
      depthTest: boolean;
      depthWrite: boolean;
      wireframe: boolean;
      vertexColors: boolean;
    };
    type THREEBasicMaterialConstructor = new (
      parameters?: Record<string, unknown>,
    ) => THREEMaterial;
    const THREE = (await import("three")) as unknown as {
      MeshBasicMaterial: THREEBasicMaterialConstructor;
    };
    const EASEL = new BasicMaterial({
      color: 0x123456,
      transparent: true,
      depthWrite: false,
      wireframe: true,
      vertexColors: true,
    });
    const installedThree = new THREE.MeshBasicMaterial({
      color: 0x123456,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      wireframe: true,
      vertexColors: true,
    });

    expect(EASEL.isMaterial).toBe(installedThree.isMaterial);
    expect(EASEL.color.hex).toBe(installedThree.color.getHex());
    expect(EASEL.transparent).toBe(installedThree.transparent);
    expect(EASEL.depthTest).toBe(installedThree.depthTest);
    expect(EASEL.depthWrite).toBe(installedThree.depthWrite);
    expect(EASEL.wireframe).toBe(installedThree.wireframe);
    expect(EASEL.vertexColors).toBe(installedThree.vertexColors);
    // EASEL intentionally keeps opacity as nine discrete CPU blend steps.
    expect(installedThree.opacity).toBe(1);
  });
});

describe("concrete materials", () => {
  it("clone and copy color/map state without sharing colors", () => {
    const map = new Texture();
    const gradientMap = new Texture();
    const materials = [
      new BasicMaterial({ color: 0x123456, map }),
      new LambertMaterial({ color: 0x234567, map }),
      new PointsMaterial({ color: 0x345678, map, size: 3 }),
      new ToonMaterial({ color: 0x456789, map, gradientMap }),
    ];

    for (const material of materials) {
      const clone = material.clone();
      expect(clone).not.toBe(material);
      expect(clone.color).not.toBe(material.color);
      expect(clone.color.hex).toBe(material.color.hex);
      expect(clone.map).toBe(material.map);
      if (material instanceof ToonMaterial) {
        expect((clone as ToonMaterial).gradientMap).toBe(gradientMap);
      }
      clone.color.set(0);
      expect(material.color.hex).not.toBe(0);
    }
  });

  it("keeps CPU line and point sizing within integer rasterizer bounds", () => {
    const line = new LineMaterial({ color: 0xff0000, linewidth: 2 });
    expect(line.isLineMaterial).toBe(true);
    expect(line.linewidth).toBe(2);
    expect(() => {
      line.linewidth = 1.5;
    }).toThrow(RangeError);

    const dashed = new DashedLineMaterial({ dashSize: 4, gapSize: 2 });
    expect(dashed.isDashedLineMaterial).toBe(true);
    expect(dashed.dashSize).toBe(4);
    expect(dashed.gapSize).toBe(2);
    expect(dashed.clone()).toMatchObject({ dashSize: 4, gapSize: 2 });

    const points = new PointsMaterial({ size: 3 });
    expect(points.isPointsMaterial).toBe(true);
    expect(points.size).toBe(3);
    expect(() => {
      points.size = 0;
    }).toThrow(RangeError);
  });

  it("serializes concrete color and map fields", () => {
    const map = new Texture();
    const gradientMap = new Texture();
    expect(new BasicMaterial({ color: 0x123456, map }).toJSON()).toMatchObject({
      type: "BasicMaterial",
      color: 0x123456,
      map: map.uuid,
    });
    expect(
      new LambertMaterial({ color: 0x234567, map }).toJSON(),
    ).toMatchObject({
      type: "LambertMaterial",
      color: 0x234567,
      map: map.uuid,
    });
    expect(
      new LineMaterial({ color: 0x345678, linewidth: 2 }).toJSON(),
    ).toEqual(
      expect.objectContaining({
        type: "LineMaterial",
        color: 0x345678,
        linewidth: 2,
      }),
    );
    expect(
      new PointsMaterial({ color: 0x456789, map, size: 3 }).toJSON(),
    ).toMatchObject({
      type: "PointsMaterial",
      color: 0x456789,
      map: map.uuid,
      size: 3,
    });
    expect(
      new ToonMaterial({ color: 0x56789a, map, gradientMap }).toJSON(),
    ).toMatchObject({
      type: "ToonMaterial",
      color: 0x56789a,
      map: map.uuid,
      gradientMap: gradientMap.uuid,
    });
  });

  it("serializes invalid mutable colors as errors instead of JSON null", () => {
    const materials = [
      new BasicMaterial(),
      new LambertMaterial(),
      new LineMaterial(),
      new PointsMaterial(),
      new ToonMaterial(),
    ];
    for (const material of materials) {
      material.color.r = Number.NaN;
      expect(() => material.toJSON()).toThrow("finite color.r");
    }
  });

  it("constructs colors from a Color value without retaining its object", () => {
    const color = new Color(0x112233);
    const material = new BasicMaterial({ color });
    color.set(0);
    expect(material.color.hex).toBe(0x112233);
  });
});
