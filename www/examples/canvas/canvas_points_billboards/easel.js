import {
  Attribute,
  FogExp2,
  Geometry,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Renderer,
  SRGBColorSpace,
  Scene,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "canvas_points_billboards",
  upstream: "webgl_points_billboards",
  name: "points / billboards",
  category: "canvas",
  animated: true,
  description:
    "Ten thousand randomly placed point billboards cycle through hues in exponential fog while the camera follows the pointer.",
  differences: [
    "EASEL points are filled discs with an integer pixel radius and no texture sampling or alphaTest, so solid discs stand in for the alpha-tested disc.png sprites, and disc.png is not loaded.",
    "EASEL PointsMaterial has no sizeAttenuation, so with the toggle on every point uses one radius, taken from the three.js size-35 formula at the 1000-unit camera distance (3 pixels at 640x360), instead of growing as it comes closer; with the toggle off the radius is 18 pixels, matching the 35-pixel sprites.",
  ],
};
/** @type {import("../../../types/controls.ts").ControlDefinition[]} */
export const controls = [
  {
    type: "select",
    key: "sizeAttenuation",
    label: "sizeAttenuation",
    options: ["on", "off"],
    default: "on",
  },
];

export function setup(canvas, params = {}) {
  let mouseX = 0;
  let mouseY = 0;

  const camera = new PerspectiveCamera({
    fov: 55,
    aspect: canvas.width / canvas.height,
    near: 2,
    far: 2000,
  });
  camera.position.z = 1000;

  const scene = new Scene();
  scene.fog = new FogExp2(0x000000, 0.001);

  const geometry = new Geometry();
  const vertices = [];

  for (let i = 0; i < 10000; i++) {
    const x = 2000 * Math.random() - 1000;
    const y = 2000 * Math.random() - 1000;
    const z = 2000 * Math.random() - 1000;

    vertices.push(x, y, z);
  }

  geometry.setAttribute(
    "position",
    new Attribute(new Float32Array(vertices), 3),
  );

  // EASEL points have no size attenuation and take an integer pixel radius.
  // three.js draws a size-35 attenuated point at depth z as
  // 35 * (height / 2) / z pixels across, so the attenuated radius comes from
  // that formula at the camera distance; unattenuated points are 35 across.
  let sizeAttenuation = (params.sizeAttenuation ?? "on") === "on";
  let height = canvas.height;
  const pointRadius = () =>
    sizeAttenuation
      ? Math.max(1, Math.round((35 * height) / 2 / 1000 / 2))
      : Math.round(35 / 2);

  const material = new PointsMaterial({
    size: pointRadius(),
    transparent: true,
    vertexColors: false,
  });
  material.color.setHSL(1.0, 0.3, 0.7, SRGBColorSpace);

  const particles = new Points(geometry, material);
  scene.add(particles);

  //

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  //

  // The upstream page centers the pointer on the window; the embedded stage
  // listens on its canvas and centers on the canvas.
  function onPointerMove(event) {
    if (event.isPrimary === false) return;

    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left - rect.width / 2;
    mouseY = event.clientY - rect.top - rect.height / 2;
  }
  canvas.addEventListener("pointermove", onPointerMove);

  //

  function render() {
    const time = Date.now() * 0.00005;

    camera.position.x += (mouseX - camera.position.x) * 0.05;
    camera.position.y += (-mouseY - camera.position.y) * 0.05;

    camera.lookAt(scene.position);

    const h = ((360 * (1.0 + time)) % 360) / 360;
    material.color.setHSL(h, 0.5, 0.5);

    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }

  const animation = createExampleAnimationLoop(render);

  return {
    ...animation,
    resize(width, nextHeight) {
      camera.aspect = width / nextHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(width, nextHeight);
      height = nextHeight;
      material.size = pointRadius();
    },
    update(next) {
      if (next.sizeAttenuation !== undefined) {
        sizeAttenuation = next.sizeAttenuation === "on";
        material.size = pointRadius();
      }
    },
    cleanup() {
      animation.cleanup();
      canvas.removeEventListener("pointermove", onPointerMove);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

scene.fog = new EASEL.FogExp2(0x000000, 0.001);

const geometry = new EASEL.Geometry();
geometry.setAttribute("position", new EASEL.Attribute(new Float32Array(vertices), 3));

// Integer pixel radius: no sizeAttenuation, map or alphaTest.
const material = new EASEL.PointsMaterial({ size: 3, transparent: true, vertexColors: false });
scene.add(new EASEL.Points(geometry, material));

camera.lookAt(scene.position);
material.color.setHSL(h, 0.5, 0.5);
renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };
