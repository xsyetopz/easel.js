import {
  BasicMaterial,
  Mesh,
  PlaneGeometry,
  Scene,
} from "@xsyetopz/easel";
import { captureRenderer, frontCamera } from "../_lib/capture.ts";
import { check } from "../_lib/oracle.ts";
import * as candidate from "./candidate.ts";

// Bun has no requestAnimationFrame; queue callbacks and run them by hand.
const C = "renderer-loop";
const queue = new Map<number, (time: number) => void>();
let next = 1;
globalThis.requestAnimationFrame = (cb: (time: number) => void): number => {
  queue.set(next, cb);
  return next++;
};
globalThis.cancelAnimationFrame = (id: number): void => {
  queue.delete(id);
};
const { renderer: probe, pixel } = captureRenderer(1, 1);
const canvas = probe.domElement as HTMLCanvasElement;
// The mesh starts off-screen and the update moves it into view, so it shows
// only if prepare runs after the update and before render.
const scene = new Scene();
const plane = new Mesh(new PlaneGeometry(4, 4),
  new BasicMaterial({ color: 0xffffff }));
plane.position.x = 50;
scene.add(plane);
let frames = 0;
const stop = candidate.start(canvas, scene, frontCamera(), () => {
  frames++;
  plane.position.x = 0;
}, 16, 12);
for (let t = 0; t < 3; t++) {
  const [id, cb] = [...queue][0] ?? [];
  if (id === undefined || cb === undefined) break;
  queue.delete(id);
  cb(t * 16);
}
check(C, "three frames rendered through requestAnimationFrame", frames === 3,
  `${frames}`);
check(C, "canvas resized to the framebuffer", canvas.width === 16 &&
  canvas.height === 12, `${canvas.width}x${canvas.height}`);
const centre = pixel(8, 6).join();
check(C, "the moved mesh is drawn (prepare ran before render)",
  centre === "255,255,255", centre);
stop();
check(C, "stop cancels the pending frame", queue.size === 0, `${queue.size}`);
