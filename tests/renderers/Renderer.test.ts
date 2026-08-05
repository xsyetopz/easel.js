import { describe, expect, it } from "bun:test";
import { OrthographicCamera } from "@/cameras/OrthographicCamera.ts";
import { Scene } from "@/core/Scene.ts";
import { Color } from "@/math/Color.ts";
import { Renderer } from "@/renderers/Renderer.ts";
import { Fog } from "@/scenes/Fog.ts";
import { Texture } from "@/textures/Texture.ts";

interface CapturedImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

class TestTexture extends Texture {
  #imageData: CapturedImageData;

  constructor(data: Uint8ClampedArray, width: number, height: number) {
    super(undefined);
    this.#imageData = { data, width, height };
  }

  override get data(): ImageData | undefined {
    return this.#imageData as unknown as ImageData;
  }

  override get width(): number {
    return this.#imageData.width;
  }

  override get height(): number {
    return this.#imageData.height;
  }
}

class ExplicitUpdateTestTexture extends TestTexture {
  updateCalls = 0;

  override update(): this {
    this.updateCalls++;
    return this;
  }
}

function makeCaptureCanvas(width: number, height: number) {
  let captured: CapturedImageData | undefined;
  const context = {
    imageSmoothingEnabled: true,
    putImageData(imageData: ImageData): void {
      captured = imageData as unknown as CapturedImageData;
    },
  } as unknown as CanvasRenderingContext2D;
  const canvas = {
    width,
    height,
    isConnected: true,
    getContext: () => context,
  } as unknown as HTMLCanvasElement;

  return {
    canvas,
    readImageData(): CapturedImageData {
      if (!captured) throw new Error("Renderer did not upload ImageData.");
      return captured;
    },
  };
}

function makeTexture(): TestTexture {
  return new TestTexture(
    new Uint8ClampedArray([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255,
    ]),
    2,
    2,
  );
}

function pixelAt(
  imageData: CapturedImageData,
  x: number,
  y: number,
): { r: number; g: number; b: number; a: number } {
  const index = (y * imageData.width + x) << 2;
  return {
    r: imageData.data[index],
    g: imageData.data[index + 1],
    b: imageData.data[index + 2],
    a: imageData.data[index + 3],
  };
}

describe("Renderer explicit preparation", () => {
  it("uses a modern clearColor property without legacy channel overloads", () => {
    const renderer = new Renderer({ width: 2, height: 2 });
    renderer.clearColor = 0x123456;
    expect(renderer.clearColor).toBe(0x123456);
    renderer.clearColor = new Color(1, 0.5, 0);
    expect(renderer.clearColor).toBe(0xff8000);
    expect(() => {
      renderer.clearColor = 0x1000000;
    }).toThrow(RangeError);
  });

  it("updates scene and camera matrices only through prepare", () => {
    const renderer = new Renderer({ width: 2, height: 2 });
    const scene = new Scene();
    const camera = new OrthographicCamera({
      left: -1,
      right: 1,
      top: 1,
      bottom: -1,
    });
    scene.position.x = 3;
    camera.position.z = 5;

    renderer.render(scene, camera);
    expect(scene.matrixWorld.elements[12]).toBe(0);
    expect(camera.matrixWorldInverse.elements[14]).toBe(0);

    renderer.prepare(scene, camera);
    expect(scene.matrixWorld.elements[12]).toBe(3);
    expect(camera.matrixWorldInverse.elements[14]).toBe(-5);
  });
});

describe("Renderer scene background", () => {
  it("uploads a screen-space texture background before geometry", () => {
    const target = makeCaptureCanvas(2, 2);
    const renderer = new Renderer({
      canvas: target.canvas,
      width: 2,
      height: 2,
    });
    const scene = new Scene();
    scene.background = makeTexture();

    renderer.render(scene, new OrthographicCamera());
    const imageData = target.readImageData();

    expect(pixelAt(imageData, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    expect(pixelAt(imageData, 1, 0)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
    expect(pixelAt(imageData, 0, 1)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
    expect(pixelAt(imageData, 1, 1)).toEqual({ r: 255, g: 255, b: 0, a: 255 });
  });

  it("uses fog color instead of texture background when fog is set", () => {
    const target = makeCaptureCanvas(2, 2);
    const renderer = new Renderer({
      canvas: target.canvas,
      width: 2,
      height: 2,
    });
    const scene = new Scene();
    scene.background = makeTexture();
    scene.fog = new Fog({ color: 0x112233 });

    renderer.render(scene, new OrthographicCamera());
    const imageData = target.readImageData();

    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        expect(pixelAt(imageData, x, y)).toEqual({
          r: 17,
          g: 34,
          b: 51,
          a: 255,
        });
      }
    }
  });

  it("does not update texture backgrounds implicitly", () => {
    const target = makeCaptureCanvas(2, 2);
    const renderer = new Renderer({
      canvas: target.canvas,
      width: 2,
      height: 2,
    });
    const scene = new Scene();
    const texture = new ExplicitUpdateTestTexture(
      new Uint8ClampedArray(2 * 2 * 4),
      2,
      2,
    );
    scene.background = texture;

    renderer.render(scene, new OrthographicCamera());

    expect(texture.updateCalls).toBe(0);
    texture.update();
    expect(texture.updateCalls).toBe(1);
  });
});
