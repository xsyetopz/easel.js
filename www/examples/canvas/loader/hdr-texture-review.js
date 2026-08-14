import {
  AmbientLight,
  BasicMaterial,
  Color,
  DataTexture,
  DirectionalLight,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  SphereGeometry,
  Timer,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "hdr-texture-review",
  name: "Data Texture Review",
  category: "assets",
  animated: true,
  description: "Check packed RGBA data on a neutral textured surface.",
};

export const controls = [];

function makeRgbaBytes() {
  const colors = [
    [255, 220, 180, 129],
    [180, 220, 255, 129],
    [100, 140, 220, 128],
    [40, 60, 110, 128],
  ];
  const bytes = new Uint8ClampedArray(colors.length * 2 * 4);
  let offset = 0;
  for (let row = 0; row < 2; row++) {
    for (const color of colors) {
      bytes.set(color, offset);
      offset += color.length;
    }
  }
  return bytes;
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = new Color(0x121826);
  const camera = new PerspectiveCamera({
    fov: 42,
    aspect: width / height,
    near: 0.1,
    far: 50,
  });
  camera.position.set(0, 0, 4);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  const texture = new DataTexture(makeRgbaBytes(), 4, 2);
  texture.buildBrightnessLevels();
  scene.add(new AmbientLight(0xffffff, 0.6));
  const light = new DirectionalLight(0xffffff, 0.7);
  light.position.set(2, 3, 4);
  scene.add(light);
  const mesh = new Mesh(
    new SphereGeometry(1.15, 24, 16),
    new BasicMaterial({ map: texture, color: 0xffffff }),
  );
  scene.add(mesh);
  const timer = new Timer();
  const animation = createExampleAnimationLoop((timestamp) => {
    mesh.rotation.y += timer.update().delta * 0.3;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const texture = new EASEL.DataTexture(rgbaBytes, 4, 2);
texture.buildBrightnessLevels();
const material = new EASEL.BasicMaterial({ map: texture });`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
