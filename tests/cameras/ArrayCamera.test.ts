import { describe, expect, it } from "bun:test";
import { ArrayCamera } from "@/cameras/ArrayCamera.js";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.js";

describe("ArrayCamera", () => {
  it("defaults to an empty sub-camera array", () => {
    const camera = new ArrayCamera();
    expect(camera.isArrayCamera).toBe(true);
    expect(camera.isMultiViewCamera).toBe(false);
    expect(camera.arrayCameras).toEqual([]);
    expect(camera.type).toBe("ArrayCamera");
  });

  it("accepts sub cameras through the constructor", () => {
    const sub = new PerspectiveCamera({ fov: 60, aspect: 2 });
    const camera = new ArrayCamera({ arrayCameras: [sub] });
    expect(camera.arrayCameras).toHaveLength(1);
    expect(camera.arrayCameras[0]).toBe(sub);
  });

  it("inherits perspective projection from PerspectiveCamera", () => {
    const camera = new ArrayCamera({
      fov: 50,
      aspect: 16 / 9,
      near: 1,
      far: 100,
    });
    expect(camera.fov).toBe(50);
    expect(camera.aspect).toBe(16 / 9);
    expect(camera.near).toBe(1);
    expect(camera.far).toBe(100);
    expect(camera.projectionMatrix.elements[0]).not.toBe(0);
  });

  it("clones with independent copies of sub cameras", () => {
    const sub = new PerspectiveCamera({ fov: 70 });
    const camera = new ArrayCamera({ arrayCameras: [sub] });
    const clone = camera.clone();
    expect(clone).toBeInstanceOf(ArrayCamera);
    expect(clone.arrayCameras).toHaveLength(1);
    expect(clone.arrayCameras[0]).not.toBe(sub);
    expect(clone.arrayCameras[0].fov).toBe(70);
  });

  it("copy duplicates the sub-camera array", () => {
    const sub = new PerspectiveCamera({ fov: 80 });
    const source = new ArrayCamera({ arrayCameras: [sub] });
    const target = new ArrayCamera();
    expect(target.copy(source)).toBe(target);
    expect(target.arrayCameras).toHaveLength(1);
    expect(target.arrayCameras[0]).not.toBe(sub);
    expect(target.arrayCameras[0].fov).toBe(80);
  });
});
