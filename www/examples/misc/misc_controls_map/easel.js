import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  FogExp2,
  InstancedMesh,
  LambertMaterial,
  MapControls,
  Node,
  PerspectiveCamera,
  Renderer,
  Scene,
  Shading,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "misc_controls_map",
  upstream: "misc_controls_map",
  name: "controls / map",
  category: "misc",
  animated: true,
  description:
    "Pan, rotate, and zoom a damped MapControls camera over a fogged city of 500 instanced flat-shaded boxes.",
  differences: [
    "MeshPhongMaterial becomes LambertMaterial with flat shading, so the boxes have no specular highlights.",
    "EASEL FogExp2 evaluates fog per vertex from a lookup table, so the fog fades across each face instead of per pixel.",
  ],
};

/** @type {import("../../../types/controls.ts").ControlDefinition[]} */
export const controls = [
  {
    type: "select",
    key: "zoomToCursor",
    label: "zoomToCursor",
    options: ["on", "off"],
    default: "off",
  },
  {
    type: "select",
    key: "screenSpacePanning",
    label: "screenSpacePanning",
    options: ["on", "off"],
    default: "off",
  },
];

export function setup(canvas, params) {
  const scene = new Scene();
  scene.background = 0xcccccc;
  scene.fog = new FogExp2(0xcccccc, 0.002);

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  const camera = new PerspectiveCamera({
    fov: 60,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 1000,
  });
  camera.position.set(0, 200, -200);

  // controls

  const map = new MapControls(camera, canvas);

  map.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  map.dampingFactor = 0.05;

  map.screenSpacePanning = false;

  map.minDistance = 100;
  map.maxDistance = 500;

  map.maxPolarAngle = Math.PI / 2;

  // world

  const geometry = new BoxGeometry();
  geometry.translate(0, 0.5, 0);
  const material = new LambertMaterial({
    color: 0xeeeeee,
    shading: Shading.Flat,
    vertexColors: false,
  });

  const mesh = new InstancedMesh(geometry, material, 500);
  const dummy = new Node();

  for (let i = 0; i < 500; i++) {
    dummy.position.x = Math.random() * 1600 - 800;
    dummy.position.y = 0;
    dummy.position.z = Math.random() * 1600 - 800;
    dummy.scale.x = 20;
    dummy.scale.y = Math.random() * 80 + 10;
    dummy.scale.z = 20;

    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  scene.add(mesh);

  // lights

  const dirLight1 = new DirectionalLight(0xffffff, 3);
  dirLight1.position.set(1, 1, 1);
  scene.add(dirLight1);

  const dirLight2 = new DirectionalLight(0x002288, 3);
  dirLight2.position.set(-1, -1, -1);
  scene.add(dirLight2);

  const ambientLight = new AmbientLight(0x555555, 1);
  scene.add(ambientLight);

  function applyParams(next) {
    if (next.zoomToCursor !== undefined) {
      map.zoomToCursor = next.zoomToCursor === "on";
    }
    if (next.screenSpacePanning !== undefined) {
      map.screenSpacePanning = next.screenSpacePanning === "on";
    }
  }
  applyParams(params);

  const animation = createExampleAnimationLoop(() => {
    map.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

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
    update(next) {
      applyParams(next);
    },
    cleanup() {
      animation.cleanup();
      map.dispose();
      mesh.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const controls = new EASEL.MapControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;

const geometry = new EASEL.BoxGeometry();
geometry.translate(0, 0.5, 0);
const mesh = new EASEL.InstancedMesh(
  geometry,
  new EASEL.LambertMaterial({ color: 0xeeeeee, shading: EASEL.Shading.Flat }),
  500,
);

function animate() {
  controls.update();
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
}`;

export const example = { meta, controls, setup, easelSource };
