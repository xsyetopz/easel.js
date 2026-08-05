import { describe, expect, it } from "bun:test";
import { Camera } from "@/cameras/Camera.js";
import { OrthographicCamera } from "@/cameras/OrthographicCamera.js";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.js";
import { Scene } from "@/core/Scene.js";
import { CameraHelper } from "@/helpers/CameraHelper.js";
import { Renderer } from "@/renderers/Renderer.js";

function positions(helper: CameraHelper): Float32Array {
  const array = helper.geometry?.getAttribute("position")?.array;
  if (!(array instanceof Float32Array)) throw new Error("position missing");
  return array;
}

function colors(helper: CameraHelper): Float32Array {
  const array = helper.geometry?.getAttribute("color")?.array;
  if (!(array instanceof Float32Array)) throw new Error("color missing");
  return array;
}

describe("CameraHelper", () => {
  it("does not prepare the camera or synchronize geometry in its constructor", () => {
    const camera = new PerspectiveCamera();
    let projectionUpdates = 0;
    const originalUpdate = camera.updateProjectionMatrix.bind(camera);
    camera.updateProjectionMatrix = (): void => {
      projectionUpdates++;
      originalUpdate();
    };
    camera.position.set(2, 3, 4);

    const helper = new CameraHelper(camera);

    expect(projectionUpdates).toBe(0);
    expect(camera.matrixWorld.elements[12]).toBe(0);
    expect(Array.from(positions(helper))).toEqual(new Array(150).fill(0));
  });

  it("writes the canonical 25-segment perspective frustum from prepared matrices", () => {
    const camera = new PerspectiveCamera({
      fov: 60,
      aspect: 2,
      near: 0.5,
      far: 20,
    });
    camera.updateMatrixWorld();
    const helper = new CameraHelper(camera);
    const storage = positions(helper);

    expect(helper.update()).toBe(helper);
    expect(positions(helper)).toBe(storage);
    expect(storage).toHaveLength(150);
    expect(Array.from(storage).every(Number.isFinite)).toBe(true);
    // Near and far corners use the library's WebGL-style clip range.
    expect(storage[2]).toBeCloseTo(-0.5, 6);
    expect(storage[14]).toBeCloseTo(-0.5, 6);
    expect(storage[20]).toBeCloseTo(-0.5, 6);
    expect(storage[26]).toBeCloseTo(-20, 5);
    expect(storage[8 * 3 + 2]).toBeCloseTo(-20, 5);
    expect(helper.geometry?.getAttribute("position")?.needsUpdate).toBe(true);
  });

  it("does not mutate or prepare camera matrices during update", () => {
    const camera = new PerspectiveCamera();
    camera.position.set(1, 2, 3);
    camera.updateMatrixWorld();
    const projection = camera.projectionMatrix.elements.slice();
    const world = camera.matrixWorld.elements.slice();
    camera.updateProjectionMatrix = (): never => {
      throw new Error("projection work must remain explicit");
    };
    camera.updateMatrixWorld = (): never => {
      throw new Error("world work must remain explicit");
    };
    camera.updateViewMatrix = (): never => {
      throw new Error("view work must remain explicit");
    };

    const helper = new CameraHelper(camera);
    helper.update();
    expect(camera.projectionMatrix.elements).toEqual(projection);
    expect(camera.matrixWorld.elements).toEqual(world);
  });

  it("supports orthographic projections and transformed prepared cameras", () => {
    const camera = new OrthographicCamera({
      left: -2,
      right: 2,
      top: 3,
      bottom: -3,
      near: 1,
      far: 9,
    });
    camera.position.set(4, 5, 6);
    camera.updateMatrixWorld();
    const helper = new CameraHelper(camera);
    helper.update();

    const storage = positions(helper);
    // n1 is the first endpoint and c is the first point reused by target.
    expect(Array.from(storage.slice(0, 3))).toEqual([2, 2, 5]);
    expect(Array.from(storage.slice(114, 117))).toEqual([4, 5, 5]);
    expect(Array.from(storage.slice(120, 123))).toEqual([4, 5, 6]);
    expect(Array.from(storage.slice(123, 126))).toEqual([4, 5, 5]);

    camera.rotation.y = Math.PI / 2;
    camera.updateMatrixWorld();
    helper.update();
    expect(Array.from(storage.slice(114, 117))).toEqual([3, 5, 6]);
    expect(Array.from(storage.slice(120, 123))).toEqual([4, 5, 6]);
  });

  it("keeps camera and color assignment explicit", () => {
    const first = new PerspectiveCamera();
    first.updateMatrixWorld();
    const helper = new CameraHelper(first);
    const colorStorage = colors(helper);
    const frustum = helper.colors.frustum;

    helper.colors = {
      frustum: 0x123456,
      cone: "#010203",
      up: 0x040506,
      target: 0x070809,
      cross: 0x0a0b0c,
    };
    expect(helper.colors.frustum).toBe(frustum);
    expect(colorStorage[0]).toBeCloseTo(1, 6);
    expect(colorStorage[1]).toBeCloseTo(2 / 3, 6);
    expect(colorStorage[2]).toBeCloseTo(0, 6);
    expect(colorStorage[19 * 6]).toBeCloseTo(1, 6);
    expect(colorStorage[20 * 6]).toBeCloseTo(0.2, 6);
    // Assignment changes state only; explicit publication writes storage.
    helper.updateColors();
    expect(colors(helper)).toBe(colorStorage);
    expect(colorStorage[0]).toBeCloseTo(18 / 255, 6);
    expect(colorStorage[1]).toBeCloseTo(52 / 255, 6);
    expect(colorStorage[2]).toBeCloseTo(86 / 255, 6);
    expect(helper.geometry?.getAttribute("color")?.needsUpdate).toBe(true);

    const next = new OrthographicCamera();
    helper.camera = next;
    expect(helper.camera).toBe(next);
  });

  it("rejects invalid prepared projection matrices", () => {
    const camera = new Camera();
    camera.projectionMatrix.elements.fill(0);
    const helper = new CameraHelper(camera);
    expect(() => helper.update()).toThrow("invertible prepared projection");
  });

  it("renders visible CPU line pixels after explicit preparation", () => {
    let imageData:
      | { data: Uint8ClampedArray; width: number; height: number }
      | undefined;
    const canvas = {
      width: 32,
      height: 32,
      getContext: () => ({
        imageSmoothingEnabled: false,
        putImageData: (value: unknown) => {
          imageData = value as typeof imageData;
        },
      }),
    } as unknown as HTMLCanvasElement;
    const renderer = new Renderer({ canvas, width: 32, height: 32 });
    const scene = new Scene();
    const camera = new OrthographicCamera({
      left: -2,
      right: 2,
      top: 2,
      bottom: -2,
      near: 0.1,
      far: 20,
    });
    const helper = new CameraHelper(camera);
    scene.add(helper);

    // Renderer.prepare is explicit caller work; helper.update consumes it.
    renderer.prepare(scene, camera);
    helper.update();
    renderer.render(scene, camera);

    let nonBlack = 0;
    for (let index = 0; index < (imageData?.data.length ?? 0); index += 4) {
      if (
        imageData?.data[index] ||
        imageData?.data[index + 1] ||
        imageData?.data[index + 2]
      ) {
        nonBlack++;
      }
    }
    expect(nonBlack).toBeGreaterThan(0);
  });
});
