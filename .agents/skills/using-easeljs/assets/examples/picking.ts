// Card: references/input-picking.md#raycast-picking
import {
  BasicMaterial,
  BoxGeometry,
  type Camera,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Renderer,
  Scene,
} from "@xsyetopz/easel";
import { createStubCanvas, expect } from "./harness.ts";

export function pick(
  event: { clientX: number; clientY: number },
  canvas: HTMLCanvasElement,
  renderer: Renderer,
  scene: Scene,
  camera: PerspectiveCamera,
): Mesh | undefined {
  // CSS pixels -> normalized device coordinates; CSS size may differ from
  // the backing store (canvas.width/height).
  const rect = canvas.getBoundingClientRect();
  const ndc = {
    x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    y: 1 - ((event.clientY - rect.top) / rect.height) * 2,
  };
  renderer.prepare(scene, camera); // camera and node matrices up to date
  const raycaster = new Raycaster();
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObject(scene, true)[0];
  return hit?.object instanceof Mesh ? hit.object : undefined;
}

function rayHits(
  x: number,
  y: number,
  scene: Scene,
  camera: Camera,
): number {
  const raycaster = new Raycaster();
  raycaster.setFromCamera({ x, y }, camera);
  return raycaster.intersectObject(scene, true).length;
}

export function check(): string {
  // 320x180 backing store scaled by CSS to 960x540.
  const stub = createStubCanvas(320, 180, 960, 540);
  const renderer = new Renderer({ width: 320, height: 180, canvas: stub.element });
  const camera = new PerspectiveCamera({ fov: 60, aspect: 320 / 180 });
  camera.position.set(0, 0, 5);
  const scene = new Scene();
  const box = new Mesh(
    new BoxGeometry(1, 1, 1),
    new BasicMaterial({ color: 0xffffff }),
  );
  box.position.x = 1.5;
  scene.add(box);
  renderer.prepare(scene, camera);

  // Box center projects near CSS x = 480 + 0.5 * 480 * 1.5 / (5 * tan 30deg
  // * 16/9) ~ 620; y at the vertical middle, 270.
  const hit = pick({ clientX: 620, clientY: 270 }, stub.element, renderer,
    scene, camera);
  const miss = pick({ clientX: 300, clientY: 270 }, stub.element, renderer,
    scene, camera);
  // Dividing CSS pixels by canvas.width (320) instead of rect.width (960)
  // puts the ray off screen: x = 620 / 320 * 2 - 1.
  const wrongScale = rayHits((620 / 320) * 2 - 1, 1 - (270 / 180) * 2, scene,
    camera);

  // Move the box, then cast at its old spot (CSS x 620) without prepare():
  // the stale world matrix still reports a hit.
  box.position.x = -1.5;
  const staleHits = rayHits(620 / 480 - 1, 0, scene, camera);
  const afterPrepare = pick({ clientX: 620, clientY: 270 }, stub.element,
    renderer, scene, camera);

  expect(hit === box, "click over the box should hit it");
  expect(miss === undefined, "click beside the box should miss");
  expect(wrongScale === 0, "canvas.width-based NDC should miss");
  expect(staleHits > 0, "stale matrices should still hit the old spot");
  expect(afterPrepare === undefined, "prepared pick should miss old spot");
  return `hit=${hit === box} miss=${miss === undefined} ` +
    `canvas.width-ndc-hits=${wrongScale} ` +
    `moved box, old spot: no-prepare hits=${staleHits} ` +
    `prepared hit=${afterPrepare !== undefined}`;
}
