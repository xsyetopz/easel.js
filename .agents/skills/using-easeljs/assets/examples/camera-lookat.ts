// Card: references/frame.md#camera-options-and-lookat
import {
  BasicMaterial,
  BoxGeometry,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
} from "@xsyetopz/easel";
import { countDrawnPixels, createStubCanvas, expect } from "./harness.ts";

export function createCamera(width: number, height: number) {
  // One options object; there is no (fov, aspect, near, far) overload.
  const camera = new PerspectiveCamera({
    fov: 60,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(6, 0, 0);
  // lookAt() reads the eye position from matrixWorld, so refresh it first.
  camera.updateMatrixWorld();
  camera.lookAt(0, 0, 0);
  return camera;
}

function pixelsSeen(camera: PerspectiveCamera): number {
  const stub = createStubCanvas(64, 48);
  const renderer = new Renderer({ width: 64, height: 48, canvas: stub.element });
  const scene = new Scene();
  scene.add(
    new Mesh(new BoxGeometry(1, 1, 1), new BasicMaterial({ color: 0x33ff66 })),
  );
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  return countDrawnPixels(stub.frame);
}

export function check(): string {
  const good = pixelsSeen(createCamera(64, 48));

  const stale = new PerspectiveCamera({ fov: 60, aspect: 64 / 48 });
  stale.position.set(6, 0, 0);
  stale.lookAt(0, 0, 0); // matrixWorld still holds the origin
  const bad = pixelsSeen(stale);

  const defaults = new PerspectiveCamera();
  expect(good > 0, "camera aimed after updateMatrixWorld should see the box");
  expect(bad === 0, "lookAt before updateMatrixWorld should miss the box");
  expect(
    defaults.fov === 45 && defaults.near === 0.1 && defaults.far === 2000,
    "PerspectiveCamera defaults changed",
  );
  return `updateMatrixWorld+lookAt=${good}px lookAt-only=${bad}px`;
}
