import { describe, expect, it } from "bun:test";
import { OrthographicCamera } from "@/cameras/OrthographicCamera.ts";
import { Scene } from "@/core/Scene.ts";
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

class AutoUpdateTestTexture extends TestTexture {
  autoUpdate = true;
  updateCalls = 0;

  update(): void {
    this.updateCalls++;
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

  it("updates auto-updating texture backgrounds before clear", () => {
    const target = makeCaptureCanvas(2, 2);
    const renderer = new Renderer({
      canvas: target.canvas,
      width: 2,
      height: 2,
    });
    const scene = new Scene();
    const texture = new AutoUpdateTestTexture(
      new Uint8ClampedArray(2 * 2 * 4),
      2,
      2,
    );
    scene.background = texture;

    renderer.render(scene, new OrthographicCamera());

    expect(texture.updateCalls).toBe(1);
  });
});
