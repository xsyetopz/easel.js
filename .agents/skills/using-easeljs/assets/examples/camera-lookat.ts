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
  // lookAt() refreshes the world matrices itself, as in three.js.
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

  const defaults = new PerspectiveCamera();
  expect(good > 0, "camera aimed right after position.set should see the box");
  expect(
    defaults.fov === 45 && defaults.near === 0.1 && defaults.far === 2000,
    "PerspectiveCamera defaults changed",
  );
  return `lookAt=${good}px`;
}
