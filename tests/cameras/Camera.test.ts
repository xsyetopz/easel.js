import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { Camera } from "@/cameras/Camera.js";
import { OrthographicCamera } from "@/cameras/OrthographicCamera.js";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.js";
import { Raycaster } from "@/core/Raycaster.js";
import type { Matrix4 } from "@/math/Matrix4.js";
import { Vector2 } from "@/math/Vector2.js";

interface THREEProjectionCamera {
  projectionMatrix: { elements: ArrayLike<number> };
  zoom: number;
  aspect?: number;
  fov?: number;
  filmGauge: number;
  filmOffset: number;
  getFocalLength?: () => number;
  setFocalLength?: (focalLength: number) => void;
  updateProjectionMatrix(): void;
  setViewOffset(
    fullWidth: number,
    fullHeight: number,
    offsetX: number,
    offsetY: number,
    width: number,
    height: number,
  ): void;
  clearViewOffset(): void;
}

interface THREEPerspectiveCameraConstructor {
  new (
    fov: number,
    aspect: number,
    near: number,
    far: number,
  ): THREEProjectionCamera;
}

interface THREEOrthographicCameraConstructor {
  new (
    left: number,
    right: number,
    top: number,
    bottom: number,
    near: number,
    far: number,
  ): THREEProjectionCamera;
}

const THREECameras = THREE as unknown as {
  PerspectiveCamera: THREEPerspectiveCameraConstructor;
  OrthographicCamera: THREEOrthographicCameraConstructor;
};

function expectMatrixClose(
  actual: ArrayLike<number>,
  expected: ArrayLike<number>,
): void {
  expect(actual.length).toBe(expected.length);
  for (let index = 0; index < actual.length; index += 1) {
    expect(actual[index]).toBeCloseTo(expected[index] ?? 0, 5);
  }
}

function expectProjectionInverse(camera: {
  projectionMatrix: Matrix4;
  projectionMatrixInverse: Matrix4;
}): void {
  const product = camera.projectionMatrix
    .clone()
    .multiply(camera.projectionMatrixInverse);
  const elements = product.elements;
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  expectMatrixClose(elements, identity);
}

describe("Camera explicit matrix work", () => {
  it("updates its world matrix without implicitly rebuilding the inverse", () => {
    const camera = new Camera();
    camera.position.set(2, 3, 4);
    camera.updateMatrixWorld();
    expect(camera.matrixWorld.elements[12]).toBe(2);
    expect(camera.matrixWorldInverse.elements[12]).toBe(0);
  });

  it("rebuilds only the inverse matrix when explicitly requested", () => {
    const camera = new Camera();
    camera.position.set(2, 3, 4);
    camera.updateMatrixWorld();
    expect(camera.updateMatrixWorldInverse()).toBe(camera);
    expect(camera.matrixWorldInverse.elements[12]).toBe(-2);
    expect(camera.matrixWorldInverse.elements[13]).toBe(-3);
    expect(camera.matrixWorldInverse.elements[14]).toBe(-4);
  });

  it("offers an explicit convenience operation for both matrices", () => {
    const camera = new Camera();
    camera.position.set(5, 0, 0);
    expect(camera.updateViewMatrix()).toBe(camera);
    expect(camera.matrixWorld.elements[12]).toBe(5);
    expect(camera.matrixWorldInverse.elements[12]).toBe(-5);
  });
});

describe("Camera projection parity", () => {
  it("prepares a projection inverse that Raycaster can consume directly", () => {
    const camera = new PerspectiveCamera({
      fov: 47,
      aspect: 16 / 9,
      near: 0.2,
      far: 300,
    });
    expectProjectionInverse(camera);

    const raycaster = new Raycaster();
    expect(raycaster.setFromCamera({ x: 0, y: 0 }, camera)).toBe(raycaster);
    expect(raycaster.camera).toBe(camera);
    expect(raycaster.ray.origin.x).toBe(0);
    expect(raycaster.ray.origin.y).toBe(0);
    expect(raycaster.ray.origin.z).toBe(0);
  });

  it("matches THREE perspective projection, zoom, and a bounded view offset", () => {
    const camera = new PerspectiveCamera({
      fov: 47,
      aspect: 16 / 9,
      near: 0.2,
      far: 300,
    });
    const THREE = new THREECameras.PerspectiveCamera(47, 16 / 9, 0.2, 300);
    expectMatrixClose(
      camera.projectionMatrix.elements,
      THREE.projectionMatrix.elements,
    );
    expectProjectionInverse(camera);

    camera.zoom = 2;
    THREE.zoom = 2;
    camera.updateProjectionMatrix();
    THREE.updateProjectionMatrix();
    expectMatrixClose(
      camera.projectionMatrix.elements,
      THREE.projectionMatrix.elements,
    );

    expect(camera.setViewOffset(1920, 1080, 960, 0, 960, 1080)).toBe(camera);
    THREE.setViewOffset(1920, 1080, 960, 0, 960, 1080);
    expect(camera.view?.enabled).toBe(true);
    expectMatrixClose(
      camera.projectionMatrix.elements,
      THREE.projectionMatrix.elements,
    );
    expectProjectionInverse(camera);

    const offsetProjection = camera.projectionMatrix.elements.slice();
    expect(camera.clearViewOffset()).toBe(camera);
    THREE.clearViewOffset();
    expect(camera.view?.enabled).toBe(false);
    expectMatrixClose(
      camera.projectionMatrix.elements,
      THREE.projectionMatrix.elements,
    );
    expect(camera.projectionMatrix.elements).not.toEqual(offsetProjection);
    expectProjectionInverse(camera);
  });

  it("matches THREE orthographic projection, zoom, and a bounded view offset", () => {
    const camera = new OrthographicCamera({
      left: -4,
      right: 6,
      top: 3,
      bottom: -2,
      near: 0.2,
      far: 300,
    });
    const THREE = new THREECameras.OrthographicCamera(-4, 6, 3, -2, 0.2, 300);
    expectMatrixClose(
      camera.projectionMatrix.elements,
      THREE.projectionMatrix.elements,
    );

    camera.zoom = 2;
    THREE.zoom = 2;
    camera.updateProjectionMatrix();
    THREE.updateProjectionMatrix();
    expectMatrixClose(
      camera.projectionMatrix.elements,
      THREE.projectionMatrix.elements,
    );

    camera.setViewOffset(200, 100, 100, 0, 100, 100);
    THREE.setViewOffset(200, 100, 100, 0, 100, 100);
    expectMatrixClose(
      camera.projectionMatrix.elements,
      THREE.projectionMatrix.elements,
    );
    expectProjectionInverse(camera);

    const clone = camera.clone();
    expect(clone.zoom).toBe(camera.zoom);
    expect(clone.view).toEqual(camera.view);
    expectMatrixClose(
      clone.projectionMatrix.elements,
      camera.projectionMatrix.elements,
    );
    expectMatrixClose(
      clone.projectionMatrixInverse.elements,
      camera.projectionMatrixInverse.elements,
    );

    camera.clearViewOffset();
    THREE.clearViewOffset();
    expectMatrixClose(
      camera.projectionMatrix.elements,
      THREE.projectionMatrix.elements,
    );
    expectProjectionInverse(camera);
  });

  it("preserves perspective view state and inverse through copy", () => {
    const source = new PerspectiveCamera({
      fov: 52,
      aspect: 4 / 3,
      near: 0.5,
      far: 100,
      zoom: 1.5,
    });
    source.setViewOffset(800, 600, 200, 100, 400, 300);

    const copy = new PerspectiveCamera().copy(source);
    expect(copy.fov).toBe(source.fov);
    expect(copy.aspect).toBe(source.aspect);
    expect(copy.zoom).toBe(source.zoom);
    expect(copy.view).toEqual(source.view);
    expectMatrixClose(
      copy.projectionMatrix.elements,
      source.projectionMatrix.elements,
    );
    expectMatrixClose(
      copy.projectionMatrixInverse.elements,
      source.projectionMatrixInverse.elements,
    );
    expectProjectionInverse(copy);

    source.clearViewOffset();
    copy.clearViewOffset();
    expectMatrixClose(
      copy.projectionMatrix.elements,
      source.projectionMatrix.elements,
    );
  });

  it("supports film, focal-length, view-size, and JSON projection helpers", () => {
    const camera = new PerspectiveCamera({
      fov: 47,
      aspect: 16 / 9,
      near: 0.2,
      far: 300,
    });
    const THREE = new THREECameras.PerspectiveCamera(47, 16 / 9, 0.2, 300);
    camera.filmGauge = 40;
    camera.filmOffset = 3;
    THREE.filmGauge = 40;
    THREE.filmOffset = 3;
    camera.updateProjectionMatrix();
    THREE.updateProjectionMatrix();
    expectMatrixClose(
      camera.projectionMatrix.elements,
      THREE.projectionMatrix.elements,
    );

    expect(camera.filmWidth).toBeCloseTo(40);
    expect(camera.filmHeight).toBeCloseTo(22.5);
    expect(camera.effectiveFOV).toBeCloseTo(47);
    expect(camera.focalLength).toBeCloseTo(
      THREE.getFocalLength?.() ?? camera.focalLength,
    );

    camera.focalLength = 35;
    THREE.setFocalLength?.(35);
    expect(camera.fov).toBeCloseTo(THREE.fov ?? camera.fov);
    expectMatrixClose(
      camera.projectionMatrix.elements,
      THREE.projectionMatrix.elements,
    );

    const boundsMin = new Vector2();
    const boundsMax = new Vector2();
    camera.viewBoundsAt(10, boundsMin, boundsMax);
    const size = camera.viewSizeAt(10, new Vector2());
    expect(size.x).toBeCloseTo(boundsMax.x - boundsMin.x);
    expect(size.y).toBeCloseTo(boundsMax.y - boundsMin.y);

    const json = camera.toJSON();
    expect(json).toMatchObject({
      type: "PerspectiveCamera",
      fov: camera.fov,
      aspect: camera.aspect,
      near: camera.near,
      far: camera.far,
      zoom: camera.zoom,
      focus: camera.focus,
      filmGauge: camera.filmGauge,
      filmOffset: camera.filmOffset,
    });
    camera.filmOffset = Number.NaN;
    expect(() => camera.toJSON()).toThrow(RangeError);
  });

  it("serializes orthographic projection state and copies film state", () => {
    const source = new PerspectiveCamera({ fov: 52, aspect: 4 / 3 });
    source.focus = 17;
    source.filmGauge = 42;
    source.filmOffset = 2;
    const copy = source.clone();
    expect(copy.focus).toBe(source.focus);
    expect(copy.filmGauge).toBe(source.filmGauge);
    expect(copy.filmOffset).toBe(source.filmOffset);

    const orthographic = new OrthographicCamera({
      left: -4,
      right: 6,
      top: 3,
      bottom: -2,
      near: 0.2,
      far: 300,
      zoom: 1.5,
    });
    orthographic.setViewOffset(200, 100, 0, 0, 100, 100);
    const json = orthographic.toJSON();
    expect(json).toMatchObject({
      type: "OrthographicCamera",
      left: orthographic.left,
      right: orthographic.right,
      top: orthographic.top,
      bottom: orthographic.bottom,
      near: orthographic.near,
      far: orthographic.far,
      zoom: orthographic.zoom,
    });
    expect(json.view).toEqual(orthographic.view ?? undefined);
    expect(() => {
      orthographic.zoom = Number.NaN;
    }).toThrow(RangeError);
  });

  it("rejects non-finite, non-positive, or out-of-bounds view offsets", () => {
    const perspective = new PerspectiveCamera();
    const orthographic = new OrthographicCamera();
    const invalidOffsets: [number, number, number, number, number, number][] = [
      [0, 100, 0, 0, 1, 1],
      [100, 100, 0, 0, 0, 1],
      [100, 100, -1, 0, 1, 1],
      [100, 100, 100, 0, 1, 1],
      [100, 100, 0, 100, 1, 1],
      [100, 100, 0, 0, Number.NaN, 1],
    ];
    for (const values of invalidOffsets) {
      expect(() => perspective.setViewOffset(...values)).toThrow(RangeError);
      expect(() => orthographic.setViewOffset(...values)).toThrow(RangeError);
    }
    expect(() => {
      perspective.zoom = 0;
    }).toThrow(RangeError);
    expect(() => {
      orthographic.zoom = Number.POSITIVE_INFINITY;
    }).toThrow(RangeError);
  });
});
