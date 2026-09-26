// EASEL 0.7.0: no PBR, no Phong specular, no shadow maps. Lambert with
// baked Gouraud lighting; shadows, if needed, are baked into vertex colours
// or textures. Intensities are divided by PI (see light-intensity).
import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  Scene,
  Shading,
} from "@xsyetopz/easel";

export function build(): Scene {
  const scene = new Scene();
  const light = new DirectionalLight(0xffffff, 2 / Math.PI);
  light.position.set(3, 5, 2);
  const mesh = new Mesh(
    new BoxGeometry(),
    new LambertMaterial({ color: 0x44aa88, shading: Shading.Gouraud }),
  );
  scene.add(new AmbientLight(0xffffff, 0.2 / Math.PI), light, mesh);
  return scene;
}
