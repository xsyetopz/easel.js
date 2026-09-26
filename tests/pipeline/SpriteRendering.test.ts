import { describe, expect, it } from "bun:test";
import { OrthographicCamera } from "@/cameras/OrthographicCamera.ts";
import { Scene } from "@/core/Scene.ts";
import { PlaneGeometry } from "@/geometry/primitives/PlaneGeometry.ts";
import { DirectionalLight } from "@/lights/DirectionalLight.ts";
import { BasicMaterial } from "@/materials/BasicMaterial.ts";
import { SpriteMaterial } from "@/materials/SpriteMaterial.ts";
import { Mesh } from "@/objects/Mesh.ts";
import { Sprite } from "@/objects/Sprite.ts";
import { SceneTraversal } from "@/pipeline/SceneTraversal.ts";
import { Renderer } from "@/renderers/Renderer.ts";
import { Texture } from "@/textures/Texture.ts";
import { getFirstTriangleBufferLength } from "../_helpers/scene-traversal.ts";

const SIZE = 64;
const SPRITE_RGB = { r: 0x66, g: 0x99, b: 0xff };

interface CapturedImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  count: number;
}

class TestTexture extends Texture {
  readonly #imageData: CapturedImageData;

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

function makeQuadrantTexture(): TestTexture {
  // Row 0: red, green. Row 1: blue, yellow.
  return new TestTexture(
    new Uint8ClampedArray([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255,
    ]),
    2,
    2,
  );
}

// Eight pixels per world unit, looking down -Z at the origin.
function makeCamera(): OrthographicCamera {
  const camera = new OrthographicCamera({
    left: -4,
    right: 4,
    top: 4,
    bottom: -4,
    near: 0.1,
    far: 100,
  });
  camera.position.z = 10;
  return camera;
}

function makeScene(): Scene {
  const scene = new Scene();
  scene.background = 0x000000;
  return scene;
}

function render(scene: Scene): CapturedImageData {
  let captured: CapturedImageData | undefined;
  const context = {
    imageSmoothingEnabled: true,
    putImageData(imageData: ImageData): void {
      captured = imageData as unknown as CapturedImageData;
    },
  } as unknown as CanvasRenderingContext2D;
  const canvas = {
    width: SIZE,
    height: SIZE,
    isConnected: true,
    getContext: () => context,
  } as unknown as HTMLCanvasElement;
  const renderer = new Renderer({ canvas, width: SIZE, height: SIZE });
  const camera = makeCamera();
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  if (!captured) throw new Error("Renderer did not upload ImageData.");
  return captured;
}

function pixelAt(image: CapturedImageData, x: number, y: number): Rgb {
  const index = (y * image.width + x) << 2;
  return {
    r: image.data[index] ?? 0,
    g: image.data[index + 1] ?? 0,
    b: image.data[index + 2] ?? 0,
  };
}

function boundsOf(image: CapturedImageData, color: Rgb): Bounds {
  const bounds = { minX: SIZE, minY: SIZE, maxX: -1, maxY: -1, count: 0 };
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const pixel = pixelAt(image, x, y);
      if (pixel.r !== color.r || pixel.g !== color.g || pixel.b !== color.b) {
        continue;
      }
      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.maxY = Math.max(bounds.maxY, y);
      bounds.count++;
    }
  }
  return bounds;
}

function expectNear(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1);
}

function makeSprite(options: { rotation?: number } = {}): Sprite {
  return new Sprite(new SpriteMaterial({ color: "#69f", ...options }));
}

describe("SceneTraversal sprite quads", () => {
  it("emits one two-triangle draw call for a sprite", () => {
    const scene = makeScene();
    const sprite = makeSprite();
    scene.add(sprite);
    const camera = makeCamera();
    scene.updateMatrixWorld(true, true);
    camera.updateViewMatrix(true, false);

    const traversal = new SceneTraversal();
    const drawList = traversal.traverse(
      scene as never,
      camera as never,
      SIZE,
      SIZE,
    );
    expect(drawList.length).toBe(1);
    const drawCall = drawList.calls[0];
    expect(drawCall?.mesh).toBe(sprite);
    expect(drawCall?.vertCount).toBe(4);
    expect(getFirstTriangleBufferLength(drawList)).toBe(2);

    const projected = drawCall?.projectedVerts;
    const again = traversal.traverse(
      scene as never,
      camera as never,
      SIZE,
      SIZE,
    );
    expect(again.calls[0]).toBe(drawCall);
    expect(again.calls[0]?.projectedVerts).toBe(projected);
  });

  it("skips sprites outside the frustum unless frustum culling is disabled", () => {
    const scene = makeScene();
    const sprite = makeSprite();
    sprite.position.x = 20;
    scene.add(sprite);
    const camera = makeCamera();
    scene.updateMatrixWorld(true, true);
    camera.updateViewMatrix(true, false);

    const traversal = new SceneTraversal();
    expect(
      traversal.traverse(scene as never, camera as never, SIZE, SIZE).length,
    ).toBe(0);
    sprite.frustumCulled = false;
    expect(
      traversal.traverse(scene as never, camera as never, SIZE, SIZE).length,
    ).toBe(1);
  });
});

describe("Renderer sprite rasterization", () => {
  it("covers the scaled quad around the projected position in the material color", () => {
    const scene = makeScene();
    const sprite = makeSprite();
    sprite.scale.set(2, 2, 1);
    scene.add(sprite);
    const light = new DirectionalLight(0xffffff, 1);
    light.position.set(1, 0, 0);
    scene.add(light);

    const bounds = boundsOf(render(scene), SPRITE_RGB);
    expect(bounds.count).toBeGreaterThan(200);
    expectNear(bounds.minX, 24);
    expectNear(bounds.maxX, 39);
    expectNear(bounds.minY, 24);
    expectNear(bounds.maxY, 39);
  });

  it("anchors the quad at center so (0.5, 0) puts the bottom edge on the position", () => {
    const scene = makeScene();
    const sprite = makeSprite();
    sprite.scale.set(2, 2, 1);
    sprite.center.set(0.5, 0);
    scene.add(sprite);

    const bounds = boundsOf(render(scene), SPRITE_RGB);
    expectNear(bounds.minX, 24);
    expectNear(bounds.maxX, 39);
    expectNear(bounds.minY, 16);
    expectNear(bounds.maxY, 31);
  });

  it("rotates the quad around the view axis by SpriteMaterial.rotation", () => {
    const scene = makeScene();
    const wide = makeSprite();
    wide.scale.set(4, 1, 1);
    scene.add(wide);
    const unrotated = boundsOf(render(scene), SPRITE_RGB);
    expectNear(unrotated.maxX - unrotated.minX, 31);
    expectNear(unrotated.maxY - unrotated.minY, 7);

    const rotatedScene = makeScene();
    const rotated = makeSprite({ rotation: Math.PI / 2 });
    rotated.scale.set(4, 1, 1);
    rotatedScene.add(rotated);
    const bounds = boundsOf(render(rotatedScene), SPRITE_RGB);
    expectNear(bounds.maxX - bounds.minX, 7);
    expectNear(bounds.maxY - bounds.minY, 31);
    expectNear(bounds.minY, 16);
    expectNear(bounds.minX, 28);
  });

  it("is depth-occluded by a nearer opaque mesh", () => {
    const red = { r: 255, g: 0, b: 0 };
    const occluder = new Mesh(
      new PlaneGeometry(2, 2),
      new BasicMaterial({ color: 0xff0000 }),
    );
    occluder.position.z = 1;

    const behindScene = makeScene();
    const behind = makeSprite();
    behind.scale.set(4, 4, 1);
    behindScene.add(occluder, behind);
    const image = render(behindScene);
    expect(pixelAt(image, 32, 32)).toEqual(red);
    expect(pixelAt(image, 20, 32)).toEqual(SPRITE_RGB);
    const occluded = boundsOf(image, red);
    expectNear(occluded.minX, 24);
    expectNear(occluded.maxX, 39);

    const frontScene = makeScene();
    const front = makeSprite();
    front.scale.set(4, 4, 1);
    front.position.z = 2;
    frontScene.add(occluder.clone(), front);
    expect(pixelAt(render(frontScene), 32, 32)).toEqual(SPRITE_RGB);
  });

  it("samples the map with the same UV orientation as a plane mesh", () => {
    const map = makeQuadrantTexture();
    const spriteScene = makeScene();
    const sprite = new Sprite(new SpriteMaterial({ map }));
    sprite.scale.set(4, 4, 1);
    spriteScene.add(sprite);
    const spriteImage = render(spriteScene);

    const planeScene = makeScene();
    planeScene.add(
      new Mesh(new PlaneGeometry(4, 4), new BasicMaterial({ map })),
    );
    const planeImage = render(planeScene);

    const samples: [number, number][] = [
      [20, 20],
      [44, 20],
      [20, 44],
      [44, 44],
    ];
    const colors = samples.map(([x, y]) => pixelAt(spriteImage, x, y));
    for (const [index, [x, y]] of samples.entries()) {
      expect(colors[index]).toEqual(pixelAt(planeImage, x, y));
    }
    const distinct = new Set(colors.map(({ r, g, b }) => `${r},${g},${b}`));
    expect(distinct.size).toBe(4);
    expect(colors).toContainEqual({ r: 255, g: 0, b: 0 });
    expect(colors).toContainEqual({ r: 255, g: 255, b: 0 });
  });
});

describe("SceneTraversal material visibility", () => {
  it("skips a mesh whose material is hidden but still draws its children", () => {
    const scene = makeScene();
    const hidden = new Mesh(
      new PlaneGeometry(1, 1),
      new BasicMaterial({ visible: false }),
    );
    const child = new Mesh(new PlaneGeometry(1, 1), new BasicMaterial());
    hidden.add(child);
    scene.add(hidden);
    const camera = makeCamera();
    scene.updateMatrixWorld(true, true);
    camera.updateViewMatrix(true, false);

    const drawList = new SceneTraversal().traverse(
      scene as never,
      camera as never,
      SIZE,
      SIZE,
    );

    expect(drawList.calls.map((call) => call.mesh)).toEqual([child]);
  });
});
