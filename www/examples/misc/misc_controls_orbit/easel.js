import {
  AmbientLight,
  ConeGeometry,
  DirectionalLight,
  FogExp2,
  InstancedMesh,
  LambertMaterial,
  Node,
  OrbitControls,
  PerspectiveCamera,
  Renderer,
  Scene,
  Shading,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "misc_controls_orbit",
  upstream: "misc_controls_orbit",
  name: "controls / orbit",
  category: "misc",
  animated: true,
  description:
    "Orbit, zoom, and pan a damped OrbitControls camera over a fogged field of 500 instanced flat-shaded cones.",
  differences: [
    "MeshPhongMaterial becomes LambertMaterial with flat shading, so the cones have no specular highlights.",
    "EASEL FogExp2 evaluates fog per vertex from a lookup table, so the fog fades across each face instead of per pixel.",
  ],
};
export const controls = [];

export function setup(canvas) {
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
  camera.position.set(400, 200, 0);

  // controls

  const orbit = new OrbitControls(camera, canvas);
  orbit.listenToKeyEvents(canvas); // optional

  orbit.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  orbit.dampingFactor = 0.05;

  orbit.screenSpacePanning = false;

  orbit.minDistance = 100;
  orbit.maxDistance = 500;

  orbit.cursorStyle = "grab";

  orbit.maxPolarAngle = Math.PI / 2;

  // world

  const geometry = new ConeGeometry(10, 30, 4, 1);
  const material = new LambertMaterial({
    color: 0xffffff,
    shading: Shading.Flat,
    vertexColors: false,
  });

  const mesh = new InstancedMesh(geometry, material, 500);
  const dummy = new Node();

  for (let i = 0; i < 500; i++) {
    dummy.position.x = Math.random() * 1600 - 800;
    dummy.position.y = 0;
    dummy.position.z = Math.random() * 1600 - 800;

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

  const animation = createExampleAnimationLoop(() => {
    orbit.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

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
      orbit.dispose();
      mesh.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const orbit = new EASEL.OrbitControls(camera, canvas);
orbit.listenToKeyEvents(canvas);
orbit.enableDamping = true;
orbit.dampingFactor = 0.05;
orbit.screenSpacePanning = false;
orbit.minDistance = 100;
orbit.maxDistance = 500;
orbit.cursorStyle = "grab";
orbit.maxPolarAngle = Math.PI / 2;

const mesh = new EASEL.InstancedMesh(
  new EASEL.ConeGeometry(10, 30, 4, 1),
  new EASEL.LambertMaterial({ color: 0xffffff, shading: EASEL.Shading.Flat }),
  500,
);

function animate() {
  orbit.update();
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
}`;

export const example = { meta, controls, setup, easelSource };
