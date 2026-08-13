import { describe, expect, it } from "bun:test";
import { Matrix3 } from "@/math/Matrix3.js";
import { Vector2 } from "@/math/Vector2.js";
import { DataTexture } from "@/textures/DataTexture.js";
import { FramebufferTexture } from "@/textures/FramebufferTexture.js";
import { TEXTURE_BRIGHTNESS_LEVELS, Texture } from "@/textures/Texture.js";

class RawTexture extends Texture {
  readonly #rawData: ImageData;

  constructor(data: Uint8ClampedArray, width: number, height: number) {
    super();
    this.#rawData = { data, width, height } as ImageData;
  }

  override get data(): ImageData {
    return this.#rawData;
  }
}

describe("Texture explicit work", () => {
  it("marks updates without performing cache work", () => {
    const texture = new Texture();
    texture.needsUpdate = true;

    expect(texture.needsUpdate).toBe(true);
    expect(texture.data).toBeUndefined();

    expect(texture.update()).toBe(texture);
    expect(texture.needsUpdate).toBe(false);
  });

  it("builds brightness levels only when explicitly requested", () => {
    const texture = new RawTexture(
      new Uint8ClampedArray([255, 128, 64, 255]),
      1,
      1,
    );

    expect(texture.brightnessLevels).toBeUndefined();
    expect(texture.buildBrightnessLevels()).toBe(texture);
    expect(texture.brightnessLevels).toHaveLength(TEXTURE_BRIGHTNESS_LEVELS);
  });
});

function fakeImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): ImageData {
  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

describe("Texture compatibility surface", () => {
  it("tracks source versions without a GPU lifecycle", () => {
    const texture = new Texture();
    expect(texture.isTexture).toBe(true);
    expect(texture.source.isSource).toBe(true);
    expect(texture.version).toBe(0);
    texture.needsUpdate = true;
    expect(texture.version).toBe(1);
    expect(texture.source.version).toBe(1);
    expect(() => {
      texture.magFilter = 1006;
    }).toThrow("nearest sampling");
    expect(() => {
      texture.minFilter = 1008;
    }).toThrow("nearest sampling");
    expect(() => {
      texture.anisotropy = 8;
    }).toThrow("fixed to one");
    expect(() => {
      texture.format = 1022;
    }).toThrow("packed RGBA");
    expect(() => {
      texture.type = 1015;
    }).toThrow("unsigned-byte");
    expect(() => {
      texture.normalized = true;
    }).toThrow("fixed to false");
    expect(() => {
      texture.colorSpace = "srgb";
    }).toThrow("no conversion");
    expect(() => {
      texture.premultiplyAlpha = true;
    }).toThrow("fixed to false");
    expect(() => {
      texture.unpackAlignment = 2;
    }).toThrow("only supports 1 or 4");
    expect(texture.magFilter).toBe(1003);
    expect(texture.minFilter).toBe(1003);
    expect(texture.anisotropy).toBe(1);
  });

  it("copies UV transform properties and keeps clone state independent", () => {
    const texture = new Texture();
    texture.name = "atlas";
    texture.offset.set(0.25, 0.5);
    texture.repeat.set(2, 3);
    texture.center.set(0.5, 0.5);
    texture.rotation = Math.PI / 4;
    texture.updateMatrix();
    texture.userData = { category: "ui", nested: { index: 3 } };

    const clone = texture.clone();
    expect(clone).not.toBe(texture);
    expect(clone.name).toBe("atlas");
    expect(clone.offset).not.toBe(texture.offset);
    expect(clone.offset.x).toBe(texture.offset.x);
    expect(clone.matrix.elements).toEqual(texture.matrix.elements);
    expect(clone.userData).toEqual(texture.userData);
    clone.offset.x = 9;
    const cloneUserData = clone.userData as {
      nested: { index: number };
    };
    cloneUserData.nested.index = 10;
    expect(texture.offset.x).toBe(0.25);
    const textureUserData = texture.userData as {
      nested: { index: number };
    };
    expect(textureUserData.nested.index).toBe(3);
  });

  it("differentially matches installed THREE UV transforms", async () => {
    const THREEModule = (await import("three")) as unknown as {
      Texture: new () => {
        mapping: number;
        wrapS: number;
        wrapT: number;
        offset: { set(x: number, y: number): unknown };
        repeat: { set(x: number, y: number): unknown };
        center: { set(x: number, y: number): unknown };
        rotation: number;
        updateMatrix(): void;
        transformUv(uv: { x: number; y: number }): { x: number; y: number };
      };
      Vector2: new (x: number, y: number) => { x: number; y: number };
      UVMapping: number;
    };
    const texture = new Texture();
    const THREE = new THREEModule.Texture();
    texture.mapping = THREEModule.UVMapping;
    THREE.mapping = THREEModule.UVMapping;
    texture.wrapS = 1;
    texture.wrapT = 2;
    THREE.wrapS = 1000;
    THREE.wrapT = 1002;
    texture.offset.set(0.15, -0.1);
    THREE.offset.set(0.15, -0.1);
    texture.repeat.set(2, 1.5);
    THREE.repeat.set(2, 1.5);
    texture.center.set(0.5, 0.25);
    THREE.center.set(0.5, 0.25);
    texture.rotation = 0.3;
    THREE.rotation = 0.3;
    texture.updateMatrix();
    THREE.updateMatrix();
    const EASELUv = texture.transformUv(new Vector2(-0.2, 1.4));
    const THREEUv = THREE.transformUv(new THREEModule.Vector2(-0.2, 1.4));
    expect(EASELUv.x).toBeCloseTo(THREEUv.x);
    expect(EASELUv.y).toBeCloseTo(THREEUv.y);
  });

  it("matches affine UV wrapping and flip behavior", () => {
    const texture = new Texture();
    texture.mapping = 300;
    texture.wrapS = 1;
    texture.wrapT = 2;
    texture.matrixAutoUpdate = false;
    texture.matrix = new Matrix3().setUvTransform(0, 0, 1, 1, 0, 0, 0);
    const uv = texture.transformUv(new Vector2(1.25, -0.25));
    expect(uv.x).toBeCloseTo(0.25);
    expect(uv.y).toBeCloseTo(0.75);
  });

  it("serializes source images once through metadata", () => {
    const texture = new DataTexture(
      new Uint8ClampedArray([1, 2, 3, 255]),
      1,
      1,
    );
    texture.name = "pixel";
    const meta: {
      textures: Record<string, ReturnType<Texture["toJSON"]>>;
      images: Record<string, ReturnType<Texture["source"]["toJSON"]>>;
    } = { textures: {}, images: {} };
    const json = texture.toJSON(meta);
    expect(meta.textures[texture.uuid]).toBe(json);
    expect(meta.images[texture.source.uuid]?.url).toEqual({
      data: [1, 2, 3, 255],
      width: 1,
      height: 1,
      type: "Uint8ClampedArray",
    });
    expect(texture.toJSON(meta)).toBe(json);
  });

  it("keeps DataTexture defaults and clamps oversized CPU data", () => {
    const data = new Uint8ClampedArray(130 * 129 * 4);
    data[0] = 99;
    const texture = new DataTexture(data, 130, 129);
    expect(texture.width).toBe(128);
    expect(texture.height).toBe(128);
    expect(texture.data?.data[0]).toBe(99);
    expect(texture.flipY).toBe(false);
    expect(texture.unpackAlignment).toBe(1);
    expect(texture.clone()).toBeInstanceOf(DataTexture);
  });

  it("refreshes DataTexture cache after source bytes mutate", () => {
    const data = new Uint8ClampedArray([1, 2, 3, 255]);
    const texture = new DataTexture(data, 1, 1);
    data[0] = 77;
    texture.needsUpdate = true;
    texture.update();
    expect(texture.data?.data[0]).toBe(77);
  });

  it("captures framebuffer regions with zero-fill for out-of-bounds pixels", () => {
    const framebuffer = new FramebufferTexture(2, 2);
    const source = fakeImageData(
      new Uint8ClampedArray([1, 2, 3, 4, 5, 6, 7, 8]),
      2,
      1,
    );
    framebuffer.capture(source, -1, 0);
    expect(Array.from(framebuffer.data?.data ?? [])).toEqual([
      0, 0, 0, 0, 1, 2, 3, 4, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(framebuffer.clone()).toBeInstanceOf(FramebufferTexture);
  });
});
