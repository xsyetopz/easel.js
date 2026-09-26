import { describe, expect, it } from "bun:test";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.js";
import { Shading } from "@/core/Constants.ts";
import { Scene } from "@/core/Scene.js";
import { PlaneGeometry } from "@/geometry/primitives/PlaneGeometry.js";
import { PointLight } from "@/lights/PointLight.js";
import { BasicMaterial } from "@/materials/BasicMaterial.js";
import { LambertMaterial } from "@/materials/LambertMaterial.js";
import type { Material } from "@/materials/Material.js";
import { Mesh } from "@/objects/Mesh.js";
import type { Framebuffer } from "@/pipeline/framebuffer/Framebuffer.js";
import { TriangleBuffer } from "@/pipeline/TriangleBuffer.js";
import { Renderer } from "@/renderers/Renderer.js";
import { Fog } from "@/scenes/Fog.js";
import {
  appendCenterTriangle,
  makeRasterizerFixture,
} from "../../_helpers/rasterizer.ts";

type Rgb = readonly [number, number, number];

function litColors(framebuffer: Framebuffer): Set<string> {
  const colors = new Set<string>();
  for (let y = 0; y < framebuffer.height; y++) {
    for (let x = 0; x < framebuffer.width; x++) {
      const { r, g, b } = framebuffer.getPixel(x, y);
      if (r || g || b) colors.add(`${r},${g},${b}`);
    }
  }
  return colors;
}

function fogTriangle(factor: number): TriangleBuffer {
  const triangles = new TriangleBuffer(1);
  appendCenterTriangle(triangles, -1);
  triangles.fogFactor.fill(factor, 0, 3);
  triangles.buildSortOrder();
  return triangles;
}

function dominantColor(image: { data: Uint8ClampedArray }): Rgb {
  const counts = new Map<string, number>();
  for (let index = 0; index < image.data.length; index += 4) {
    const r = image.data[index] ?? 0;
    const g = image.data[index + 1] ?? 0;
    const b = image.data[index + 2] ?? 0;
    if (!(r || g || b)) continue;
    const key = `${r},${g},${b}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best = "0,0,0";
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  const [r = 0, g = 0, b = 0] = best.split(",").map(Number);
  return [r, g, b];
}

function renderPlane(
  material: Material,
  configure: (scene: Scene) => void,
): Rgb {
  let image: { data: Uint8ClampedArray } | undefined;
  const canvas = {
    width: 32,
    height: 32,
    isConnected: true,
    getContext: () => ({
      imageSmoothingEnabled: false,
      putImageData: (value: unknown) => {
        image = value as typeof image;
      },
    }),
  } as unknown as HTMLCanvasElement;
  const scene = new Scene();
  scene.add(new Mesh(new PlaneGeometry(2, 2), material));
  configure(scene);
  const camera = new PerspectiveCamera({
    fov: 60,
    aspect: 1,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0, 3);
  const renderer = new Renderer({ canvas, width: 32, height: 32 });
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  if (!image) throw new Error("Renderer did not upload ImageData.");
  return dominantColor(image);
}

function expectColorNear(actual: Rgb, expected: Rgb): void {
  for (let channel = 0; channel < 3; channel++) {
    const delta = (actual[channel] ?? 0) - (expected[channel] ?? 0);
    expect(Math.abs(delta)).toBeLessThanOrEqual(1);
  }
}

describe("wireframe shading", () => {
  it("uses baked Gouraud vertex lighting instead of the unlit base color", () => {
    const { rasterizer, framebuffer } = makeRasterizerFixture();
    const triangles = new TriangleBuffer(1);
    appendCenterTriangle(triangles, -1);
    triangles.buildSortOrder();
    rasterizer.rasterize(
      {
        triangles,
        material: { color: { r: 1, g: 1, b: 1 }, wireframe: true },
        shadedColorData: new Float32Array([1, 0.5, 0, 1, 0.5, 0, 1, 0.25, 0]),
        shadedColorStride: 9,
      },
      framebuffer,
      undefined,
    );
    expect([...litColors(framebuffer)]).toEqual(["255,106,0"]);
  });

  it("applies the triangle's average fog factor to wireframe edges", () => {
    const { rasterizer, framebuffer } = makeRasterizerFixture();
    rasterizer.rasterize(
      {
        triangles: fogTriangle(0.5),
        material: { color: { r: 1, g: 1, b: 1 }, wireframe: true },
      },
      framebuffer,
      undefined,
      { r: 0, g: 0, b: 1 },
    );
    expect([...litColors(framebuffer)]).toEqual(["128,128,255"]);
  });

  it("renders lit and fogged wireframes with the filled mesh color", () => {
    const addLight = (scene: Scene) => {
      const light = new PointLight(0xff8000, 1, 0, 0);
      light.position.set(0, 0, 2);
      scene.add(light);
    };
    for (const shading of [Shading.Gouraud, Shading.Flat]) {
      const filled = renderPlane(new LambertMaterial({ shading }), addLight);
      const wire = renderPlane(
        new LambertMaterial({ shading, wireframe: true }),
        addLight,
      );
      expect(filled[1]).toBeLessThan(200);
      expectColorNear(wire, filled);
    }

    const addFog = (scene: Scene) => {
      scene.fog = new Fog({ color: 0x000000, near: 1, far: 5 });
    };
    const fogged = renderPlane(new BasicMaterial(), addFog);
    const foggedWire = renderPlane(
      new BasicMaterial({ wireframe: true }),
      addFog,
    );
    expect(fogged[0]).toBeLessThan(200);
    expectColorNear(foggedWire, fogged);
  });
});
