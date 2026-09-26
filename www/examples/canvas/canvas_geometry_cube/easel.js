import {
  BasicMaterial,
  BoxGeometry,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  TextureLoader,
} from "@/index.js";

import crateBase64 from "../../../../assets/textures/crate.gif.base64?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "canvas_geometry_cube",
  upstream: "webgl_geometry_cube",
  name: "geometry / cube",
  category: "canvas",
  animated: true,
  description:
    "A unit box textured with the wooden crate GIF tumbles slowly around its X and Y axes.",
  differences: [
    "EASEL caches the 256x256 crate.gif at 128x128 and samples it nearest-neighbor with affine warping, so the wood grain is blockier and bends across each face instead of being filtered and perspective-correct.",
    "EASEL's TextureLoader.load returns nothing, so the port assigns the map in the load callback, and the cube draws untextured white for the first frames, before the data-URL GIF is decoded.",
  ],
};
export const controls = [];

export function setup(canvas) {
  let disposed = false;

  const camera = new PerspectiveCamera({
    fov: 70,
    aspect: canvas.width / canvas.height,
    near: 0.1,
    far: 100,
  });
  camera.position.z = 2;

  const scene = new Scene();

  const geometry = new BoxGeometry();
  const material = new BasicMaterial();

  // The checked-in GIF replaces the relative texture URL, so loading needs no network.
  new TextureLoader().load(
    `data:image/gif;base64,${crateBase64}`,
    (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      material.map = texture;
    },
  );

  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  const animation = createExampleAnimationLoop(() => {
    mesh.rotation.x += 0.005;
    mesh.rotation.y += 0.01;

    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    },
    cleanup() {
      disposed = true;
      animation.cleanup();
      geometry.dispose();
      material.map?.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const camera = new EASEL.PerspectiveCamera({ fov: 70, aspect, near: 0.1, far: 100 });
camera.position.z = 2;

const material = new EASEL.BasicMaterial();
new EASEL.TextureLoader().load(crateUrl, (texture) => {
  material.map = texture;
});

const mesh = new EASEL.Mesh(new EASEL.BoxGeometry(), material);
scene.add(mesh);

mesh.rotation.x += 0.005;
mesh.rotation.y += 0.01;
renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };
