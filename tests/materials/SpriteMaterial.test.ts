import { describe, expect, it } from "bun:test";
import { Shading } from "@/core/Constants.js";
import { SpriteMaterial } from "@/materials/SpriteMaterial.js";
import { Color } from "@/math/Color.js";
import { Texture } from "@/textures/Texture.js";

describe("SpriteMaterial", () => {
  it("defaults to white color, no map, zero rotation, transparent, no depth writes", () => {
    const material = new SpriteMaterial();
    expect(material.isMaterial).toBe(true);
    expect(material.isSpriteMaterial).toBe(true);
    expect(material.type).toBe("SpriteMaterial");
    expect(material.color.hex).toBe(0xffffff);
    expect(material.map).toBe(undefined);
    expect(material.rotation).toBe(0);
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.depthTest).toBe(true);
    expect(material.shading).toBe(Shading.Flat);
  });

  it("accepts constructor options", () => {
    const map = new Texture();
    const material = new SpriteMaterial({
      color: 0x123456,
      map,
      rotation: Math.PI / 4,
      transparent: false,
      depthWrite: true,
      opacity: 4,
      name: "label",
    });
    expect(material.color.hex).toBe(0x123456);
    expect(material.map).toBe(map);
    expect(material.rotation).toBeCloseTo(Math.PI / 4);
    expect(material.transparent).toBe(false);
    expect(material.depthWrite).toBe(true);
    expect(material.opacity).toBe(4);
    expect(material.name).toBe("label");
  });

  it("defaults transparent to true even without explicit options", () => {
    const material = new SpriteMaterial({});
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
  });

  it("constructs color from a Color value without retaining its object", () => {
    const color = new Color(0x112233);
    const material = new SpriteMaterial({ color });
    color.set(0);
    expect(material.color.hex).toBe(0x112233);
  });

  it("clones without sharing color identity or retaining map reference", () => {
    const map = new Texture();
    const material = new SpriteMaterial({
      color: 0x123456,
      map,
      rotation: Math.PI / 2,
    });
    const clone = material.clone();
    expect(clone).not.toBe(material);
    expect(clone.color).not.toBe(material.color);
    expect(clone.color.hex).toBe(material.color.hex);
    expect(clone.map).toBe(material.map);
    expect(clone.rotation).toBe(material.rotation);
    clone.color.set(0);
    expect(material.color.hex).not.toBe(0);
  });

  it("copies public state from another sprite material", () => {
    const map = new Texture();
    const source = new SpriteMaterial({
      color: 0x654321,
      map,
      rotation: 1.5,
      transparent: false,
      depthWrite: true,
      opacity: 2,
      name: "src",
    });
    const dest = new SpriteMaterial();
    dest.copy(source);
    expect(dest.color.hex).toBe(0x654321);
    expect(dest.map).toBe(map);
    expect(dest.rotation).toBe(1.5);
    expect(dest.transparent).toBe(false);
    expect(dest.depthWrite).toBe(true);
    expect(dest.opacity).toBe(2);
    expect(dest.name).toBe("src");
  });

  it("serializes canonical state including color, rotation, and map", () => {
    const map = new Texture();
    const material = new SpriteMaterial({
      color: 0x123456,
      map,
      rotation: 0.5,
    });
    expect(material.toJSON()).toMatchObject({
      type: "SpriteMaterial",
      color: 0x123456,
      rotation: 0.5,
      map: map.uuid,
      transparent: true,
      depthWrite: false,
    });
  });

  it("omits map from JSON when undefined", () => {
    const material = new SpriteMaterial({ color: 0xffffff });
    const json = material.toJSON();
    expect(json).not.toHaveProperty("map");
    expect(json).not.toHaveProperty("opacity");
  });

  it("serializes invalid mutable colors as errors", () => {
    const material = new SpriteMaterial();
    material.color.r = Number.NaN;
    expect(() => material.toJSON()).toThrow("finite color.r");
  });

  it("assigns color and common values through assign", () => {
    const material = new SpriteMaterial();
    material.assign({
      color: "#abcdef",
      rotation: 1,
      name: "tag",
      opacity: 4,
    });
    expect(material.color.hex).toBe(0xabcdef);
    expect(material.rotation).toBe(1);
    expect(material.name).toBe("tag");
    expect(material.opacity).toBe(4);
  });

  it("matches installed THREE SpriteMaterial defaults", async () => {
    type THREESpriteMaterial = {
      isSpriteMaterial: boolean;
      color: { getHex(): number };
      map: unknown;
      rotation: number;
      transparent: boolean;
      depthTest: boolean;
    };
    type THREESpriteMaterialConstructor = new (
      parameters?: Record<string, unknown>,
    ) => THREESpriteMaterial;
    const THREE = (await import("three")) as unknown as {
      SpriteMaterial: THREESpriteMaterialConstructor;
    };
    const easel = new SpriteMaterial({ color: 0x123456 });
    const threeMat = new THREE.SpriteMaterial({ color: 0x123456 });

    expect(easel.isSpriteMaterial).toBe(threeMat.isSpriteMaterial);
    expect(easel.color.hex).toBe(threeMat.color.getHex());
    expect(easel.transparent).toBe(threeMat.transparent);
    // EASEL intentionally defaults depthWrite to false for transparent sprite
    // materials; three.js leaves it at the Material base default of true.
    expect(easel.depthTest).toBe(threeMat.depthTest);
    expect(easel.rotation).toBe(threeMat.rotation);
  });
});
