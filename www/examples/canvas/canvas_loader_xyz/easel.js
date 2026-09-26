import {
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Renderer,
  Scene,
  Timer,
  XYZLoader,
} from "@/index.js";

import helixText from "../../../../assets/xyz/helix_201.xyz?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "canvas_loader_xyz",
  upstream: "webgl_loader_xyz",
  name: "loader / xyz",
  category: "canvas",
  animated: true,
  description:
    "Parse an XYZ point-cloud helix with XYZLoader and spin it as a centered Points object.",
  differences: [
    "EASEL PointsMaterial.size is an integer pixel radius without distance attenuation, so the 0.1 world-unit point size becomes a fixed 1-pixel radius.",
    "Points are drawn as aliased square pixels because EASEL has no antialiasing.",
  ],
};
export const controls = [];

export function setup(canvas) {
  const camera = new PerspectiveCamera({
    fov: 50,
    aspect: canvas.width / canvas.height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(10, 7, 10);

  const scene = new Scene();
  scene.add(camera);
  camera.updateMatrixWorld();
  camera.lookAt(scene.position);

  const timer = new Timer();
  timer.connect(canvas.ownerDocument);

  const loader = new XYZLoader();
  const geometry = loader.parse(helixText);
  geometry.center();

  const vertexColors = geometry.hasAttribute("color") === true;

  const material = new PointsMaterial({ size: 1, vertexColors: vertexColors });

  const points = new Points(geometry, material);
  scene.add(points);

  //

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  const animation = createExampleAnimationLoop(() => {
    timer.update();

    const delta = timer.delta;

    points.rotation.x += delta * 0.2;
    points.rotation.y += delta * 0.5;

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
      animation.cleanup();
      timer.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const geometry = new EASEL.XYZLoader().parse(helixText);
geometry.center();

const vertexColors = geometry.hasAttribute("color") === true;
const material = new EASEL.PointsMaterial({ size: 1, vertexColors });
const points = new EASEL.Points(geometry, material);
scene.add(points);

const delta = timer.update().delta;
points.rotation.x += delta * 0.2;
points.rotation.y += delta * 0.5;
renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };
