import {
  Attribute,
  Color,
  Fog,
  Geometry,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Renderer,
  Scene,
  SRGBColorSpace,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "canvas_buffergeometry_points",
  upstream: "webgl_buffergeometry_points",
  name: "buffergeometry / points",
  category: "canvas",
  animated: true,
  description:
    "A cube of 500,000 points colored by their position tumbles in dark linear fog, drawn from one Geometry with position and color attributes.",
  differences: [
    "EASEL PointsMaterial has no sizeAttenuation and takes an integer pixel radius, so the size-15 points, about 1 pixel square in three.js at this canvas size, become fixed 1-pixel-radius points (a 5-pixel plus shape, 3 pixels wide) that do not grow as they come closer, so the cube reads as a denser, nearly solid block.",
    "Drawing all 500,000 fogged points on the CPU is slow: the median EASEL frame measured about 45 ms at 640x360 in a Bun smoke test, so the animation runs near 22 frames per second instead of the display rate.",
  ],
};
export const controls = [];

export function setup(canvas) {
  //

  const camera = new PerspectiveCamera({
    fov: 27,
    aspect: canvas.width / canvas.height,
    near: 5,
    far: 3500,
  });
  camera.position.z = 2750;

  const scene = new Scene();
  scene.background = 0x050505;
  scene.fog = new Fog({
    color: 0x050505,
    near: 2000,
    far: 3500,
  }).updateLut();

  //

  const particles = 500000;

  const geometry = new Geometry();

  const positions = [];
  const colors = [];

  const color = new Color();

  const n = 1000;
  const n2 = n / 2; // particles spread in the cube

  for (let i = 0; i < particles; i++) {
    // positions

    const x = Math.random() * n - n2;
    const y = Math.random() * n - n2;
    const z = Math.random() * n - n2;

    positions.push(x, y, z);

    // colors

    const vx = x / n + 0.5;
    const vy = y / n + 0.5;
    const vz = z / n + 0.5;

    color.setRGB(vx, vy, vz, SRGBColorSpace);

    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute(
    "position",
    new Attribute(new Float32Array(positions), 3),
  );
  geometry.setAttribute("color", new Attribute(new Float32Array(colors), 3));

  geometry.computeBoundingSphere();

  //

  // EASEL points have no size attenuation and take an integer pixel radius.
  // three.js draws a size-15 point at depth z as 15 * (height / 2) / z pixels
  // across, so the radius comes from that formula at the camera distance.
  const pointRadius = (height) =>
    Math.max(1, Math.round((15 * height) / 2 / camera.position.z / 2));
  const material = new PointsMaterial({
    size: pointRadius(canvas.height),
    vertexColors: true,
  });

  const points = new Points(geometry, material);
  scene.add(points);

  //

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  //

  const animation = createExampleAnimationLoop(() => {
    const time = Date.now() * 0.001;

    points.rotation.x = time * 0.25;
    points.rotation.y = time * 0.5;

    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      material.size = pointRadius(height);
    },
    cleanup() {
      animation.cleanup();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

scene.fog = new EASEL.Fog({ color: 0x050505, near: 2000, far: 3500 }).updateLut();

const geometry = new EASEL.Geometry();
geometry.setAttribute("position", new EASEL.Attribute(new Float32Array(positions), 3));
geometry.setAttribute("color", new EASEL.Attribute(new Float32Array(colors), 3));

const points = new EASEL.Points(
  geometry,
  new EASEL.PointsMaterial({ size: 1, vertexColors: true }),
);
scene.add(points);

const time = Date.now() * 0.001;
points.rotation.x = time * 0.25;
points.rotation.y = time * 0.5;
renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };
