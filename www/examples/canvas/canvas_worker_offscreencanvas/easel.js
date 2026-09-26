import {
  Fog,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "canvas_worker_offscreencanvas",
  upstream: "webgl_worker_offscreencanvas",
  name: "worker / offscreencanvas",
  category: "canvas",
  animated: true,
  description:
    "One hundred fogged, matcap-shaded icosahedra orbit slowly, with a jank toggle that busy-loops the main thread to show the render loop stalling.",
  differences: [
    "The three.js page shows two canvases: one rendered on the main thread and one transferred to a Web Worker with transferControlToOffscreen. Both sides here mount only the main-thread canvas, because the example viewer takes a context on the stage canvas before setup, writes canvas.width on resize, and needs a synchronous first frame, all of which a transferred canvas cannot provide.",
    "EASEL's Renderer types its canvas option as HTMLCanvasElement, so passing an OffscreenCanvas inside a worker needs a type cast even though the renderer only calls width, height, getContext('2d') and putImageData.",
    "matcap-porcelain-white.jpg has no stated licence, so it is not copied; the three.js side uses MeshMatcapMaterial's built-in grey gradient instead of the porcelain matcap.",
    "EASEL has no MeshMatcapMaterial, so the port uses LambertMaterial lit only by a HemisphereLight whose sky and ground colours reproduce that built-in matcap gradient (0.2 below to 0.8 above in linear light), baked per vertex. The light has no upstream counterpart, so the usual 1/pi intensity scaling does not apply.",
    "The START JANK button becomes a jank select control. Both the three.js and EASEL sides start their own 10,000,000-iteration interval, so turning it on stalls the page about twice as long as the single upstream button, and the result number is not displayed.",
    "The upstream count of 100 icosahedra at detail 8 (162,000 triangles) is kept; at 640x360 the EASEL side measured a median of about 37 ms per frame in the Bun smoke test, over the 33 ms budget.",
  ],
};

/** @type {import("../../../types/controls.ts").ControlDefinition[]} */
export const controls = [
  {
    type: "select",
    key: "jank",
    label: "jank",
    options: ["off", "on"],
    default: "off",
  },
];

export function setup(canvas, params) {
  // PRNG

  let seed = 1;

  function random() {
    const x = Math.sin(seed++) * 10000;

    return x - Math.floor(x);
  }

  const camera = new PerspectiveCamera({
    fov: 40,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 1000,
  });
  camera.position.z = 200;

  const scene = new Scene();
  scene.fog = new Fog({ color: 0x444466, near: 100, far: 400 }).updateLut();
  scene.background = 0x444466;

  const group = new Group();
  scene.add(group);

  // Stands in for MeshMatcapMaterial's default gradient: mix(0.2, 0.8) in
  // linear light, written here as the sRGB bytes EASEL multiplies directly.
  scene.add(new HemisphereLight(0xe7e7e7, 0x7c7c7c, 1));

  const geometry = new IcosahedronGeometry(5, 8);
  const materials = [
    new LambertMaterial({ color: 0xaa24df, vertexColors: false }),
    new LambertMaterial({ color: 0x605d90, vertexColors: false }),
    new LambertMaterial({ color: 0xe04a3f, vertexColors: false }),
    new LambertMaterial({ color: 0xe30456, vertexColors: false }),
  ];

  for (let i = 0; i < 100; i++) {
    const material = materials[i % materials.length];
    const mesh = new Mesh(geometry, material);
    mesh.position.x = random() * 200 - 100;
    mesh.position.y = random() * 200 - 100;
    mesh.position.z = random() * 200 - 100;
    mesh.scale.setScalar(random() + 1);
    group.add(mesh);
  }

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  // jank.js: the START JANK button busy-loops the main thread every frame.

  let interval;

  function jank() {
    let number = 0;

    for (let i = 0; i < 10000000; i++) {
      number += Math.random();
    }

    return number;
  }

  function update(next) {
    const enabled = next.jank === "on";
    if (enabled && interval === undefined) {
      interval = setInterval(jank, 1000 / 60);
    } else if (!enabled && interval !== undefined) {
      clearInterval(interval);
      interval = undefined;
    }
  }
  update(params);

  const animation = createExampleAnimationLoop(() => {
    // group.rotation.x = Date.now() / 4000;
    group.rotation.y = -Date.now() / 4000;

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
    update,
    cleanup() {
      animation.cleanup();
      if (interval !== undefined) clearInterval(interval);
      interval = undefined;
      geometry.dispose();
      for (const material of materials) material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

scene.fog = new EASEL.Fog({ color: 0x444466, near: 100, far: 400 }).updateLut();
scene.add(new EASEL.HemisphereLight(0xe7e7e7, 0x7c7c7c, 1));

const geometry = new EASEL.IcosahedronGeometry(5, 8);
const material = new EASEL.LambertMaterial({ color: 0xaa24df, vertexColors: false });
for (let i = 0; i < 100; i++) {
  const mesh = new EASEL.Mesh(geometry, material);
  mesh.position.set(random() * 200 - 100, random() * 200 - 100, random() * 200 - 100);
  group.add(mesh);
}

group.rotation.y = -Date.now() / 4000;
renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };
