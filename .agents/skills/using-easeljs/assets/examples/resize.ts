// Card: references/frame.md#resize
import {
  BasicMaterial,
  BoxGeometry,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
} from "@xsyetopz/easel";
import { createStubCanvas, expect } from "./harness.ts";

export function resize(
  renderer: Renderer,
  camera: PerspectiveCamera,
  width: number,
  height: number,
): void {
  renderer.setSize(width, height); // framebuffer + canvas backing store
  camera.aspect = width / height; // the setter does not rebuild projection
  camera.updateProjectionMatrix();
}

/** Width in pixels of the drawn box on the middle row. */
function boxWidth(frame: Uint8ClampedArray, width: number, height: number) {
  const row = Math.floor(height / 2) * width * 4;
  let count = 0;
  for (let x = 0; x < width; x++) if (frame[row + x * 4] === 0xff) count++;
  return count;
}

export function check(): string {
  const stub = createStubCanvas(64, 64);
  const renderer = new Renderer({ width: 64, height: 64, canvas: stub.element });
  const camera = new PerspectiveCamera({ fov: 60, aspect: 1 });
  camera.position.set(0, 0, 4);
  const scene = new Scene();
  scene.add(
    new Mesh(new BoxGeometry(1, 1, 1), new BasicMaterial({ color: 0xff0000 })),
  );

  // Setter only: projection keeps aspect 1 and the box stretches 2x wide.
  renderer.setSize(128, 64);
  camera.aspect = 2;
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  const stretched = boxWidth(stub.frame, 128, 64);

  resize(renderer, camera, 128, 64);
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  const corrected = boxWidth(stub.frame, 128, 64);

  const canvas = renderer.domElement;
  expect(canvas?.width === 128 && canvas.height === 64, "canvas not resized");
  expect(stub.frame.length === 128 * 64 * 4, "framebuffer not resized");
  expect(stretched > corrected * 1.5, "stale projection should stretch");
  return `box width on 128x64: aspect-setter-only=${stretched}px ` +
    `with-updateProjectionMatrix=${corrected}px`;
}
