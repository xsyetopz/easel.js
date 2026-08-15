import {
  BasicMaterial,
  BoxGeometry,
  DataTexture,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "texture-atlas-review",
  name: "Texture Atlas Review",
  category: "materials",
  animated: true,
  description: "Nearest-neighbor atlas regions cover a textured surface.",
};

export const controls = [];

function gridTexture(size = 32) {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const offset = (y * size + x) * 4;
      const line = x % 8 === 0 || y % 8 === 0;
      data[offset] = line ? 255 : x * 6;
      data[offset + 1] = line ? 255 : y * 6;
      data[offset + 2] = line ? 255 : 150;
      data[offset + 3] = 255;
    }
  }
  return new DataTexture(data, size, size);
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x131722;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(2.7, 2.2, 5.7);
  camera.updateMatrixWorld(false, false, true);
  camera.lookAt(new Vector3(0, 0, 0));
  camera.updateMatrix();
  const renderer = new Renderer({ canvas, width, height });

  const geometry = new BoxGeometry(2.4, 2.4, 2.4);
  const uv = geometry.getAttribute("uv");
  let seed = 0x12345678;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  if (uv) {
    for (let i = 0; i < uv.count; i++) uv.setXY(i, random(), random());
    uv.needsUpdate = true;
  }
  const texture = gridTexture();
  const cube = new Mesh(geometry, new BasicMaterial({ map: texture }));
  scene.add(cube);
  const clock = new Timer();
  const animation = createExampleAnimationLoop((timestamp) => {
    clock.update(timestamp);
    cube.rotation.x += clock.delta * 0.28;
    cube.rotation.y += clock.delta * 0.44;
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
uv.setXY(vertex, random(), random());
uv.needsUpdate = true;
const material = new EASEL.BasicMaterial({ map: new EASEL.DataTexture(gridPixels, 32, 32) });`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
