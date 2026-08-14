import {
  AmbientLight,
  BasicMaterial,
  BoxGeometry,
  DataTexture,
  DirectionalLight,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "texture-surface-review",
  name: "Texture Surface Review",
  category: "materials",
  animated: true,
  description:
    "Check a textured prop under a stable camera before shipping an asset.",
};

export const controls = [];

function checkerTexture(size = 32) {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const checker = ((x >> 2) + (y >> 2)) % 2 === 0;
      const offset = (y * size + x) * 4;
      data[offset] = checker ? 245 : 45;
      data[offset + 1] = checker ? 176 : 80;
      data[offset + 2] = checker ? 70 : 135;
      data[offset + 3] = 255;
    }
  }
  return new DataTexture(data, size, size);
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x111824;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(2.8, 2.2, 5.8);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.4));
  const key = new DirectionalLight(0xffffff, 0.95);
  key.position.set(4, 5, 6);
  scene.add(key);

  const texture = checkerTexture();
  const cube = new Mesh(
    new BoxGeometry(2.5, 2.5, 2.5),
    new BasicMaterial({ map: texture }),
  );
  scene.add(cube);
  const clock = new Timer();
  const animation = createExampleAnimationLoop((timestamp) => {
    clock.update(timestamp);
    cube.rotation.x += clock.delta * 0.35;
    cube.rotation.y += clock.delta * 0.55;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
      texture.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const texture = new EASEL.DataTexture(checkerPixels, 32, 32);
const cube = new EASEL.Mesh(new EASEL.BoxGeometry(2.5, 2.5, 2.5),
  new EASEL.BasicMaterial({ map: texture }));`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
