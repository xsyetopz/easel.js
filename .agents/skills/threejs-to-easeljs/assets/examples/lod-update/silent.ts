// Naive port that type-checks: relies on three.js's automatic LOD update.
import type { Camera, Renderer, Scene } from "@xsyetopz/easel";

export function frame(renderer: Renderer, scene: Scene,
  camera: Camera): void {
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
}
