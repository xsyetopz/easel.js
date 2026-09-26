// EASEL 0.7.0: CPU framebuffer. Width and height are framebuffer pixels
// (cost scales with them); there is no pixel ratio, loop, or setClearColor,
// and each frame calls prepare before render.
import type { Camera, Scene } from "@xsyetopz/easel";
import { Renderer } from "@xsyetopz/easel";

export function start(
  canvas: HTMLCanvasElement,
  scene: Scene,
  camera: Camera,
  update: (time: number) => void,
  width = 320,
  height = 240,
): () => void {
  const renderer = new Renderer({ canvas, width, height });
  renderer.clearColor = 0x101820;
  let request = 0;
  const frame = (time: number): void => {
    update(time);
    renderer.prepare(scene, camera); // world matrices; render never does
    renderer.render(scene, camera);
    request = requestAnimationFrame(frame);
  };
  request = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(request);
    renderer.dispose();
  };
}
