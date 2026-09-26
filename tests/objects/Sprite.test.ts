import { describe, expect, it } from "bun:test";
import { OrthographicCamera } from "@/cameras/OrthographicCamera.ts";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.ts";
import { type Intersection, Raycaster } from "@/core/Raycaster.ts";
import { Scene } from "@/core/Scene.ts";
import { SpriteMaterial } from "@/materials/SpriteMaterial.ts";
import { Vector3 } from "@/math/Vector3.ts";
import { Sprite } from "@/objects/Sprite.ts";
import { Renderer } from "@/renderers/Renderer.ts";

const SIZE = 48;

function lookAtOrigin<T extends PerspectiveCamera | OrthographicCamera>(
  camera: T,
  x: number,
  y: number,
  z: number,
): T {
  camera.position.set(x, y, z);
  camera.updateViewMatrix(true, false, true);
  camera.lookAt(new Vector3(0, 0, 0));
  camera.updateViewMatrix(true, false, true);
  return camera;
}

function pick(
  sprite: Sprite,
  camera: PerspectiveCamera | OrthographicCamera,
  x: number,
  y: number,
): Intersection[] {
  const raycaster = new Raycaster();
  raycaster.setFromCamera({ x, y }, camera);
  const hits: Intersection[] = [];
  sprite.raycast(raycaster, hits);
  return hits;
}

function renderCoverage(scene: Scene, camera: PerspectiveCamera): Uint8Array {
  let captured: ImageData | undefined;
  const context = {
    imageSmoothingEnabled: true,
    putImageData(imageData: ImageData): void {
      captured = imageData;
    },
  } as unknown as CanvasRenderingContext2D;
  const canvas = {
    width: SIZE,
    height: SIZE,
    isConnected: true,
    getContext: () => context,
  } as unknown as HTMLCanvasElement;
  const renderer = new Renderer({ canvas, width: SIZE, height: SIZE });
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  if (!captured) throw new Error("Renderer did not upload ImageData.");
  const coverage = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < coverage.length; i++) {
    coverage[i] = (captured.data[i * 4 + 2] ?? 0) > 0 ? 1 : 0;
  }
  return coverage;
}

describe("Sprite raycasting", () => {
  it("applies SpriteMaterial.rotation around the view axis", () => {
    const camera = lookAtOrigin(
      new PerspectiveCamera({ fov: 50, aspect: 1, near: 0.1, far: 100 }),
      0,
      0,
      10,
    );
    const sprite = new Sprite(new SpriteMaterial());
    sprite.scale.set(1, 5, 1);
    sprite.updateMatrixWorld(true);
    expect(pick(sprite, camera, 0.2, 0)).toHaveLength(0);
    expect(pick(sprite, camera, 0, 0.2)).toHaveLength(1);

    const material = sprite.material as SpriteMaterial;
    material.rotation = Math.PI / 2;
    expect(pick(sprite, camera, 0.2, 0)).toHaveLength(1);
    expect(pick(sprite, camera, 0, 0.2)).toHaveLength(0);
  });

  it("uses the camera's right and up axes for off-axis cameras", () => {
    const camera = lookAtOrigin(
      new PerspectiveCamera({ fov: 50, aspect: 1, near: 0.1, far: 100 }),
      8,
      8,
      8,
    );
    const sprite = new Sprite(new SpriteMaterial());
    sprite.scale.set(1, 5, 1);
    sprite.updateMatrixWorld(true);
    const hits = pick(sprite, camera, 0, 0.1);
    expect(hits).toHaveLength(1);
    const uv = (hits[0] as Intersection & { uv: { x: number; y: number } }).uv;
    expect(uv.x).toBeCloseTo(0.5, 5);
    expect(uv.y).toBeGreaterThan(0.5);
    expect(pick(sprite, camera, 0.1, 0)).toHaveLength(0);
  });

  it("returns no hit for a zero-area sprite", () => {
    const camera = lookAtOrigin(new OrthographicCamera(), 0, 0, 5);
    const sprite = new Sprite(new SpriteMaterial());
    sprite.scale.set(0, 1, 1);
    sprite.updateMatrixWorld(true);
    expect(pick(sprite, camera, 0, 0)).toHaveLength(0);
  });

  it("agrees with rasterized coverage away from the quad edges", () => {
    const scene = new Scene();
    scene.background = 0x000000;
    const sprite = new Sprite(
      new SpriteMaterial({ color: 0x0000ff, rotation: 0.6 }),
    );
    sprite.position.set(0.5, -0.25, 0.3);
    sprite.scale.set(3, 1.5, 1);
    sprite.center.set(0.2, 0.7);
    scene.add(sprite);
    scene.updateMatrixWorld(true, true, true);
    const camera = lookAtOrigin(
      new PerspectiveCamera({ fov: 50, aspect: 1, near: 0.1, far: 100 }),
      4,
      3,
      6,
    );

    const coverage = renderCoverage(scene, camera);
    let interior = 0;
    let exterior = 0;
    for (let y = 1; y < SIZE - 1; y++) {
      for (let x = 1; x < SIZE - 1; x++) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            sum += coverage[(y + dy) * SIZE + x + dx] ?? 0;
          }
        }
        if (sum !== 0 && sum !== 9) continue;
        const ndcX = ((x + 0.5) / SIZE) * 2 - 1;
        const ndcY = 1 - ((y + 0.5) / SIZE) * 2;
        const hit = pick(sprite, camera, ndcX, ndcY).length > 0;
        expect(hit).toBe(sum === 9);
        if (sum === 9) interior++;
        else exterior++;
      }
    }
    expect(interior).toBeGreaterThan(50);
    expect(exterior).toBeGreaterThan(50);
  });
});
