import {
  AmbientLight,
  BasicMaterial,
  Mesh,
  NRRDLoader,
  PerspectiveCamera,
  PlaneGeometry,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "volume-slice-review",
  name: "Volume Slice Review",
  category: "data",
  animated: true,
  description:
    "Step through an NRRD slice while keeping its orientation visible.",
};
export const controls = [];

function makeVolume() {
  const samples = [];
  for (let row = 0; row < 16; row++) {
    for (let column = 0; column < 16; column++) {
      const distance = Math.hypot(column - 7.5, row - 7.5);
      samples.push(Math.max(0, Math.round(255 - distance * 30)));
    }
  }
  return [
    "NRRD0005",
    "type: uchar",
    "dimension: 2",
    "sizes: 16 16",
    "encoding: ascii",
    "",
    samples.join(" "),
  ].join("\n");
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x101622;
  const camera = new PerspectiveCamera({
    fov: 42,
    aspect: width / height,
    near: 0.1,
    far: 50,
  });
  camera.position.set(0, 0, 4);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.8));
  const volume = new NRRDLoader().parse(makeVolume());
  const texture = volume.toDataTexture("z", 0, { name: "NRRD slice" });
  const plane = new Mesh(
    new PlaneGeometry(2.8, 2.8),
    new BasicMaterial({ map: texture }),
  );
  scene.add(plane);
  const timer = new Timer();
  const animation = createExampleAnimationLoop((timestamp) => {
    plane.rotation.z += timer.update().delta * 0.2;
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
const volume = new EASEL.NRRDLoader().parse(nrrdText);
const texture = volume.toDataTexture("z", 0);
scene.add(new EASEL.Mesh(new EASEL.PlaneGeometry(2, 2), new EASEL.BasicMaterial({ map: texture })));`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
