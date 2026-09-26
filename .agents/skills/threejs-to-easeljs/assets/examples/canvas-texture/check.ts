import { type BasicMaterial, Mesh, PlaneGeometry, Scene } from "@xsyetopz/easel";
import { captureRenderer, frontCamera } from "../_lib/capture.ts";
import { check } from "../_lib/oracle.ts";
import * as candidate from "./candidate.ts";
import * as silent from "./silent.ts";

const C = "canvas-texture";

// Bun has no canvas. A { data, width, height } stand-in takes the texture's
// raw-pixel cache path; a real canvas takes the drawImage path, which only
// a browser runs. Both are filled only by update().
function fakeCanvas(): HTMLCanvasElement {
  return {
    data: new Uint8ClampedArray([0, 0, 255, 255]),
    width: 1,
    height: 1,
  } as unknown as HTMLCanvasElement;
}
function paint(canvas: HTMLCanvasElement, rgb: [number, number, number]) {
  const pixels = (canvas as unknown as { data: Uint8ClampedArray }).data;
  pixels.set([...rgb, 255]);
}
function centre(material: BasicMaterial): string {
  const { renderer, pixel } = captureRenderer(8, 8);
  const scene = new Scene();
  scene.background = 0;
  scene.add(new Mesh(new PlaneGeometry(4, 4), material));
  const camera = frontCamera();
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  return pixel(4, 4).join();
}

const port = candidate.hud(fakeCanvas());
check(C, "a new CanvasTexture renders untextured until update()",
  centre(port.material) === "255,255,255", centre(port.material));
port.redraw((canvas) => paint(canvas, [0, 0, 255]));
check(C, "redraw + update shows the canvas", centre(port.material) ===
  "0,0,255", centre(port.material));
port.redraw((canvas) => paint(canvas, [255, 0, 255]));
check(C, "second redraw + update shows the new pixels",
  centre(port.material) === "255,0,255", centre(port.material));

const naive = silent.hud(fakeCanvas());
naive.texture.update();
naive.redraw((canvas) => paint(canvas, [255, 0, 255]));
check(C, "naive needsUpdate alone keeps the stale frame",
  centre(naive.material) === "0,0,255", centre(naive.material));
