// Card: references/frame.md#prepare-before-render
import {
  BasicMaterial,
  BoxGeometry,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
} from "@xsyetopz/easel";
import { countDrawnPixels, createStubCanvas, expect } from "./harness.ts";

export function drawFrame(
  renderer: Renderer,
  scene: Scene,
  camera: PerspectiveCamera,
): void {
  // render() reads prepared world matrices and camera.matrixWorldInverse;
  // prepare() is the only renderer call that rebuilds them.
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
}

function buildScene(width: number, height: number) {
  const scene = new Scene();
  const camera = new PerspectiveCamera({
    fov: 60,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0, 5);
  const mesh = new Mesh(
    new BoxGeometry(1, 1, 1),
    new BasicMaterial({ color: 0xff3300 }),
  );
  scene.add(mesh);
  return { scene, camera, mesh };
}

export function check(): string {
  const width = 64;
  const height = 48;

  const withPrepare = createStubCanvas(width, height);
  const a = buildScene(width, height);
  const rendererA = new Renderer({ width, height, canvas: withPrepare.element });
  drawFrame(rendererA, a.scene, a.camera);
  const prepared = countDrawnPixels(withPrepare.frame);

  const renderOnly = createStubCanvas(width, height);
  const b = buildScene(width, height);
  const rendererB = new Renderer({ width, height, canvas: renderOnly.element });
  rendererB.render(b.scene, b.camera);
  const unprepared = countDrawnPixels(renderOnly.frame);

  // A moved mesh stays at its old place until the next prepare().
  const before = withPrepare.frame.slice();
  a.mesh.position.x = 1.5;
  rendererA.render(a.scene, a.camera);
  const staleDiff = diffBytes(before, withPrepare.frame);
  drawFrame(rendererA, a.scene, a.camera);
  const movedDiff = diffBytes(before, withPrepare.frame);

  expect(prepared > 0, "prepare + render should draw the box");
  expect(unprepared === 0, "render without prepare should draw nothing");
  expect(staleDiff === 0, "render alone should not apply the move");
  expect(movedDiff > 0, "prepare should apply the moved position");
  return `prepared=${prepared}px render-only=${unprepared}px ` +
    `move: render-only=${staleDiff}B prepare+render=${movedDiff}B changed`;
}

function diffBytes(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let changed = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) changed++;
  return changed;
}
