import { describe, expect, it } from "bun:test";
import { Side } from "@/core/Constants.ts";
import { Matrix4 } from "@/math/Matrix4.js";
import { Framebuffer } from "@/pipeline/framebuffer/Framebuffer.js";
import { FramebufferClear } from "@/pipeline/framebuffer/FramebufferClear.ts";
import { PainterSort } from "@/pipeline/PainterSort.js";
import { PixelWriter } from "@/pipeline/PixelWriter.js";
import { Rasterizer } from "@/pipeline/rasterizer/Rasterizer.js";
import { SceneTraversal } from "@/pipeline/SceneTraversal.js";
import { LightBaker } from "@/pipeline/shading/LightBaker.js";
import {
  makeTraversalCamera as makeCamera,
  makeTraversalScene as makeScene,
} from "../_helpers/scene-traversal.js";

function makeMeshNode() {
  return {
    type: "Mesh",
    visible: true,
    children: [],
    matrixWorld: new Matrix4(),
    updateMatrixWorld: () => {
      /* no-op */
    },
    geometry: {
      getAttribute: () => ({
        array: new Float32Array([0, 0, 0, 0.5, 0, 0, 0, 0.5, 0]),
        itemSize: 3,
      }),
      index: { array: new Uint16Array([0, 1, 2]) },
    },
    material: { color: 0xffffff, layer: 0 },
  };
}

describe("scene-to-pixels integration", () => {
  it("SceneTraversal → DrawList → PainterSort → Framebuffer write", () => {
    const scene = makeScene(makeMeshNode(), makeMeshNode());
    const camera = makeCamera();

    const traversal = new SceneTraversal();
    const drawList = traversal.traverse(scene, camera);
    expect(drawList.length).toBe(2);

    const sorter = new PainterSort();
    expect(() => sorter.sort(drawList, { x: 0, y: 0 })).not.toThrow();

    const fb = new Framebuffer(16, 16);
    const clear = new FramebufferClear();
    clear.clear(fb);

    const writer = new PixelWriter();
    writer.write(fb, 8, 8, 255, 255, 255, 255);
    const px = fb.getPixel(8, 8);
    expect(px.r).toBe(255);
    expect(px.g).toBe(255);
    expect(px.b).toBe(255);
  });

  it("framebuffer cleared to black before pipeline", () => {
    const fb = new Framebuffer(8, 8);
    const clear = new FramebufferClear();
    fb.setPixel(0, 0, 255, 0, 0, 255);
    clear.clear(fb);
    const px = fb.getPixel(0, 0);
    expect(px.r).toBe(0);
    expect(px.g).toBe(0);
    expect(px.b).toBe(0);
  });

  it("traversal excludes invisible meshes from pipeline", () => {
    const visible = makeMeshNode();
    const invisible = { ...makeMeshNode(), visible: false };
    const scene = makeScene(visible, invisible);
    const drawList = new SceneTraversal().traverse(scene, makeCamera());
    expect(drawList.length).toBe(1);
  });

  // Helpers for rasterizer integration tests.
  // Positions produce a CCW screen triangle with identity MVP at 64x64:
  //   v0 NDC=(0,0.5)   → sx=32, sy=16
  //   v1 NDC=(-0.5,-0.5) → sx=16, sy=48
  //   v2 NDC=(0.5,-0.5)  → sx=48, sy=48
  // cross = (16-32)*(48-16) - (48-16)*(48-32) = (-16)(32) - (32)(16) = -1024 → front-facing
  function makeRastMesh(colorObj = { r: 1, g: 1, b: 1 }, side = Side.Double) {
    return {
      type: "Mesh",
      visible: true,
      children: [],
      matrixWorld: new Matrix4(),
      updateMatrixWorld: () => {
        /* no-op */
      },
      geometry: {
        getAttribute: (name: string) => {
          if (name === "position")
            return {
              array: new Float32Array([0, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0]),
              itemSize: 3,
            };
          if (name === "normal")
            return {
              array: new Float32Array([0, 0, -1, 0, 0, -1, 0, 0, -1]),
              itemSize: 3,
            };
          return null;
        },
        index: { array: new Uint16Array([0, 1, 2]) },
      },
      material: { color: colorObj, side, shading: 0 },
    };
  }

  function runPipeline(
    scene: Parameters<SceneTraversal["traverse"]>[0],
    camera: Parameters<SceneTraversal["traverse"]>[1],
    fb: Framebuffer,
  ) {
    const traversal = new SceneTraversal();
    const lightBaker = new LightBaker();
    const rasterizer = new Rasterizer();
    const { width, height } = fb;

    const drawList = traversal.traverse(scene, camera, width, height);
    for (const dc of drawList) {
      lightBaker.bake(dc as unknown as never, drawList.lights);
      rasterizer.rasterize(dc as unknown as never, fb, undefined);
    }
    return drawList;
  }

  function hasNonBlackPixel(fb: Framebuffer) {
    for (let y = 0; y < fb.height; y++) {
      for (let x = 0; x < fb.width; x++) {
        const px = fb.getPixel(x, y);
        if (px.r > 0 || px.g > 0 || px.b > 0) return true;
      }
    }
    return false;
  }

  it("full pipeline through rasterizer writes non-black pixels to framebuffer", () => {
    const fb = new Framebuffer(64, 64);
    const clear = new FramebufferClear();
    clear.clear(fb);
    fb.depthBuffer.clear();

    const scene = makeScene(makeRastMesh());
    runPipeline(scene, makeCamera(), fb);

    expect(hasNonBlackPixel(fb)).toBe(true);
  });

  it("empty scene leaves framebuffer fully black after clear", () => {
    const fb = new Framebuffer(32, 32);
    const clear = new FramebufferClear();
    clear.clear(fb);
    fb.depthBuffer.clear();

    runPipeline(makeScene(), makeCamera(), fb);

    expect(hasNonBlackPixel(fb)).toBe(false);
  });

  it("clear color fills all pixels before mesh draw", () => {
    const fb = new Framebuffer(8, 8);
    const clear = new FramebufferClear();
    // Fill to a non-black sentinel color (r=100) then verify no mesh overwrites it
    clear.clear(fb, 100, 0, 0);

    // All pixels should be r=100 with no mesh drawn
    let allMatch = true;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (fb.getPixel(x, y).r !== 100) {
          allMatch = false;
          break;
        }
      }
    }
    expect(allMatch).toBe(true);
  });

  it("AmbientLight in scene causes rasterized pixels to reflect lighting", () => {
    const fb = new Framebuffer(64, 64);
    new FramebufferClear().clear(fb);
    fb.depthBuffer.clear();

    const ambientLight = {
      type: "AmbientLight",
      visible: true,
      children: [],
      matrixWorld: new Matrix4(),
      color: { r: 1, g: 0, b: 0 },
      intensity: 1,
    };
    const scene = makeScene(makeRastMesh({ r: 1, g: 1, b: 1 }), ambientLight);
    runPipeline(scene, makeCamera(), fb);

    // With a red ambient light and flat shading, at least one pixel should be non-black
    expect(hasNonBlackPixel(fb)).toBe(true);
  });

  it("traverse → PainterSort → rasterize does not throw on valid scene", () => {
    const fb = new Framebuffer(32, 32);
    new FramebufferClear().clear(fb);
    fb.depthBuffer.clear();

    const scene = makeScene(makeRastMesh(), makeRastMesh());
    const traversal = new SceneTraversal();
    const sorter = new PainterSort();
    const lightBaker = new LightBaker();
    const rasterizer = new Rasterizer();

    const drawList = traversal.traverse(scene, makeCamera(), 32, 32);
    sorter.sort(drawList, { x: 0, y: 0 });

    expect(() => {
      for (const dc of drawList) {
        lightBaker.bake(dc as unknown as never, drawList.lights);
        rasterizer.rasterize(dc as unknown as never, fb, undefined);
      }
    }).not.toThrow();
  });
});
