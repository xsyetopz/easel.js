import {
  PCDLoader,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Renderer,
  Scene,
  Timer,
} from "@/index.js";

import source from "../../../../assets/pcd/simple.pcd?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "point-cloud-review",
  name: "Point Cloud Review",
  category: "assets",
  animated: true,
  description:
    "Inspect 213 authored positions and RGB samples from an ASCII PCD file.",
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
  camera.position.z = 4.6;
  const renderer = new Renderer({ canvas, width, height });
  const geometry = new PCDLoader().parse(source);
  geometry.center();
  const points = new Points(
    geometry,
    new PointsMaterial({ vertexColors: true, size: 3 }),
  );
  points.scale.setScalar(1.8);
  scene.add(points);
  const timer = new Timer();
  const animation = createExampleAnimationLoop(() => {
    points.rotation.y += timer.update().delta * 0.18;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
      geometry.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const geometry = new EASEL.PCDLoader().parse(pcdText);
geometry.center();
const points = new EASEL.Points(
  geometry,
  new EASEL.PointsMaterial({ vertexColors: true, size: 3 }),
);`;
export const example = { meta, controls, setup, easelSource };
