import { describe, expect, it } from "bun:test";
import { StereoCamera } from "@/cameras/StereoCamera.js";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.js";

describe("StereoCamera", () => {
  it("initializes with default left and right eye cameras", () => {
    const stereo = new StereoCamera();
    expect(stereo.type).toBe("StereoCamera");
    expect(stereo.eyeSep).toBe(0.064);
    expect(stereo.aspect).toBe(1);
    expect(stereo.cameraL).toBeInstanceOf(PerspectiveCamera);
    expect(stereo.cameraR).toBeInstanceOf(PerspectiveCamera);
  });

  it("enables layer 1 on the left eye and layer 2 on the right eye", () => {
    const stereo = new StereoCamera();
    expect(stereo.cameraL.layers.isEnabled(1)).toBe(true);
    expect(stereo.cameraR.layers.isEnabled(2)).toBe(true);
  });

  it("disables matrix auto-update on eye cameras", () => {
    const stereo = new StereoCamera();
    expect(stereo.cameraL.matrixAutoUpdate).toBe(false);
    expect(stereo.cameraR.matrixAutoUpdate).toBe(false);
  });

  it("update copies the source camera world matrix into both eye cameras", () => {
    const stereo = new StereoCamera();
    const camera = new PerspectiveCamera({
      fov: 50,
      aspect: 2,
      near: 0.1,
      far: 100,
    });
    camera.position.set(1, 2, 3);
    camera.updateMatrixWorld();

    stereo.update(camera);

    // matrix = matrixWorld * eyeOffset; element 12 is the translation X
    expect(stereo.cameraL.matrix.elements[12]).toBeCloseTo(
      camera.matrixWorld.elements[12] - stereo.eyeSep / 2,
      5,
    );
    expect(stereo.cameraR.matrix.elements[12]).toBeCloseTo(
      camera.matrixWorld.elements[12] + stereo.eyeSep / 2,
      5,
    );
    expect(stereo.cameraL.matrixWorldNeedsUpdate).toBe(true);
    expect(stereo.cameraR.matrixWorldNeedsUpdate).toBe(true);
  });

  it("update builds distinct left and right projection matrices", () => {
    const stereo = new StereoCamera();
    const camera = new PerspectiveCamera({
      fov: 60,
      aspect: 1.5,
      near: 0.1,
      far: 100,
    });
    camera.updateProjectionMatrix();

    stereo.update(camera);

    // The left and right projection elements[8] differ due to eye separation.
    expect(stereo.cameraL.projectionMatrix.elements[8]).not.toBe(
      stereo.cameraR.projectionMatrix.elements[8],
    );
  });

  it("reuses cached projection when camera parameters are unchanged", () => {
    const stereo = new StereoCamera();
    const camera = new PerspectiveCamera({
      fov: 50,
      aspect: 2,
      near: 0.1,
      far: 100,
    });
    camera.updateProjectionMatrix();

    stereo.update(camera);
    const leftProj0 = stereo.cameraL.projectionMatrix.elements[0];
    const rightProj8 = stereo.cameraR.projectionMatrix.elements[8];

    // Move the camera but keep lens parameters identical.
    camera.position.set(5, 0, 0);
    camera.updateMatrixWorld();
    stereo.update(camera);

    // Projection should be cached — same values as the first update.
    expect(stereo.cameraL.projectionMatrix.elements[0]).toBe(leftProj0);
    expect(stereo.cameraR.projectionMatrix.elements[8]).toBe(rightProj8);
    // But the world matrix should reflect the new position.
    expect(stereo.cameraL.matrix.elements[12]).toBeCloseTo(
      camera.matrixWorld.elements[12] - stereo.eyeSep / 2,
      5,
    );
  });

  it("rebuilds projection when eyeSep changes", () => {
    const stereo = new StereoCamera();
    const camera = new PerspectiveCamera({
      fov: 60,
      aspect: 1,
      near: 0.1,
      far: 100,
    });
    camera.updateProjectionMatrix();

    stereo.update(camera);
    const leftProj0 = stereo.cameraL.projectionMatrix.elements[0];

    stereo.eyeSep = 0.2;
    stereo.update(camera);

    expect(stereo.cameraL.projectionMatrix.elements[8]).not.toBe(leftProj0);
  });
});
