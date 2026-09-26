import {
  OrbitControls,
  PCDLoader,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Renderer,
  Scene,
} from "@/index.js";

import pcdText from "../../../../assets/pcd/simple.pcd?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "canvas_loader_pcd",
  upstream: "webgl_loader_pcd",
  name: "loader / pcd",
  category: "canvas",
  animated: true,
  description:
    "Load a Point Cloud Data file with PCDLoader, center it, and orbit around its colored points.",
  differences: [
    "The default file is ascii/simple.pcd instead of binary/Zaghetto.pcd because EASEL's PCDLoader only parses ASCII PCD data.",
    "The type selector is omitted; binary/Zaghetto.pcd, binary/Zaghetto_8bit.pcd, and binary_compressed/pcl_logo.pcd are binary PCD files that EASEL's PCDLoader cannot parse.",
    "EASEL point size is an integer pixel radius, so the size slider is converted to a radius from the camera distance once per frame and clamps to at least one pixel; all points share that radius instead of attenuating individually.",
  ],
};
/** @type {import("../../../types/controls.ts").ControlDefinition[]} */
export const controls = [
  {
    type: "slider",
    key: "size",
    label: "size",
    min: 0.001,
    max: 0.01,
    step: 0.001,
    default: 0.005,
  },
  { type: "color", key: "color", label: "color", default: "#ffffff" },
];

export function setup(canvas, params) {
  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  const scene = new Scene();

  const camera = new PerspectiveCamera({
    fov: 30,
    aspect: canvas.width / canvas.height,
    near: 0.01,
    far: 40,
  });
  camera.position.set(0, 0, 1);
  scene.add(camera);

  const orbit = new OrbitControls(camera, canvas);
  orbit.minDistance = 0.5;
  orbit.maxDistance = 10;

  const loader = new PCDLoader();

  const geometry = loader.parse(pcdText);
  geometry.center();
  geometry.rotateX(Math.PI);
  const points = new Points(
    geometry,
    new PointsMaterial({
      size: 1,
      vertexColors: geometry.getAttribute("color") !== undefined,
    }),
  );
  points.name = "ascii/simple.pcd";
  scene.add(points);

  // three.js sizes points in world units: gl_PointSize = size * (height / 2) / depth.
  let size = 0.005;
  let viewportHeight = canvas.height;
  function applyPointSize() {
    const depth = camera.position.distanceTo(orbit.target);
    const diameter = (size * viewportHeight * 0.5) / depth;
    points.material.size = Math.max(1, Math.round(diameter * 0.5));
  }

  function update(next) {
    size = Number(next.size ?? 0.005);
    points.material.color.set(String(next.color ?? "#ffffff"));
  }
  update(params);

  const animation = createExampleAnimationLoop(() => {
    applyPointSize();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });

  return {
    ...animation,
    resize(width, height) {
      viewportHeight = height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    },
    update,
    cleanup() {
      animation.cleanup();
      orbit.dispose();
      geometry.dispose();
      points.material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const geometry = new EASEL.PCDLoader().parse(pcdText);
geometry.center();
geometry.rotateX(Math.PI);
const points = new EASEL.Points(
  geometry,
  new EASEL.PointsMaterial({ size: 1, vertexColors: true }),
);
scene.add(points);

const orbit = new EASEL.OrbitControls(camera, canvas);
orbit.minDistance = 0.5;
orbit.maxDistance = 10;`;

export const example = { meta, controls, setup, easelSource };
