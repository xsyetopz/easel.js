import {
  AmbientLight,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  OrbitControls,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  TorusKnotGeometry,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../runtime/example-animation.ts";

export const meta = {
  id: "product-turntable",
  name: "Product Turntable",
  category: "interaction",
  animated: true,
  description: "A damped turntable camera rotates around a prop.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(3, 2, 6);
  camera.updateMatrixWorld(false, false, true);
  camera.lookAt(new Vector3(0, 0, 0));
  camera.updateMatrix();
  const orbit = new OrbitControls(camera, canvas);
  orbit.target.set(0, 0, 0);
  orbit.enableDamping = true;
  orbit.rotateSpeed = 0.35;
  orbit.zoomSpeed = 0.5;
  orbit.panSpeed = 0.5;
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const light = new DirectionalLight(0xffffff, 0.9);
  light.position.set(4, 5, 6);
  scene.add(light);
  const mesh = new Mesh(
    new TorusKnotGeometry(1, 0.3, 48, 10),
    new LambertMaterial({ color: 0x588fd4 }),
  );
  scene.add(mesh);
  const clock = new Timer();
  const animation = createExampleAnimationLoop((_timestamp) => {
    mesh.rotation.y += clock.update().delta * 0.35;
    orbit.update();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
      orbit.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const controls = new EASEL.OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, 0, 0);
controls.update();`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
