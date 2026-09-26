// EASEL 0.7.0: no autoUpdate. Select the level every frame between
// prepare (which updates the matrices LOD reads) and render.
import {
  BasicMaterial, BoxGeometry, type Camera, LOD, Mesh, type Renderer,
  type Scene,
} from "@xsyetopz/easel";

export function makeLod(): LOD {
  const lod = new LOD();
  lod.addLevel(new Mesh(new BoxGeometry(1, 1, 1),
    new BasicMaterial({ color: 0xff0000 })), 0);
  lod.addLevel(new Mesh(new BoxGeometry(1, 1, 1),
    new BasicMaterial({ color: 0x0000ff })), 10);
  return lod;
}

export function frame(renderer: Renderer, scene: Scene, camera: Camera,
  lods: LOD[]): void {
  renderer.prepare(scene, camera);
  for (const lod of lods) lod.update(camera);
  renderer.render(scene, camera);
}
