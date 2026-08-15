import {
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Renderer,
  Scene,
  Timer,
  XYZLoader,
} from "@/index.js";

import source from "../../../../assets/xyz/helix_201.xyz?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "xyz-point-cloud-review",
  name: "XYZ Point Cloud Review",
  category: "assets",
  animated: true,
  description: "Review a 201-sample helix stored as plain XYZ measurements.",
};
export const controls = [];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x121826;
  const camera = new PerspectiveCamera({
    fov: 42,
    aspect: width / height,
    near: 0.1,
    far: 50,
  });
  camera.position.z = 5;
  const renderer = new Renderer({ canvas, width, height });
  const geometry = new XYZLoader().parse(source);
  geometry.center();
  const material = new PointsMaterial({ color: 0x8be9fd, size: 4 });
  const points = new Points(geometry, material);
  points.scale.setScalar(1.6);
  scene.add(points);
  const timer = new Timer();
  const animation = createExampleAnimationLoop(() => {
    points.rotation.y += timer.update().delta * 0.22;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const geometry = new EASEL.XYZLoader().parse(xyzText);
geometry.center();
const points = new EASEL.Points(geometry, pointsMaterial);`;
export const example = { meta, controls, setup, easelSource };
