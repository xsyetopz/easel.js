import {
  AmbientLight,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  OrbitControls,
  PerspectiveCamera,
  Renderer,
  Scene,
  TransformControls,
  Vector3,
  BoxGeometry,
} from "@/index.js";

export const meta = {
  id: "misc_controls_transform",
  name: "Transform Controls",
  category: "misc",
  description: "CPU pointer transforms for Canvas2D scene nodes.",
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
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  const ambient = new AmbientLight(0xffffff, 0.4);
  const directional = new DirectionalLight(0xffffff, 0.9);
  directional.position.set(4, 5, 6);
  scene.add(ambient, directional);
  const mesh = new Mesh(
    new BoxGeometry(1.5, 1.5, 1.5),
    new LambertMaterial({ color: 0x4d8fd6 }),
  );
  scene.add(mesh);
  const transform = new TransformControls(camera, canvas);
  transform.attach(mesh);
  scene.add(transform.helper);
  transform.axis = "XYZ";
  const orbit = new OrbitControls(camera, canvas);
  orbit.enableDamping = true;
  transform.addEventListener("mouseDown", () => {
    orbit.enabled = false;
  });
  transform.addEventListener("mouseUp", () => {
    orbit.enabled = true;
  });
  let animationFrame;
  function animate() {
    animationFrame = globalThis.requestAnimationFrame(animate);
    orbit.update();
    transform.update();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      transform.dispose();
      orbit.dispose();
      if (animationFrame !== undefined)
        globalThis.cancelAnimationFrame(animationFrame);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const controls = new EASEL.TransformControls(camera, canvas);
controls.attach(mesh);
controls.setMode("translate");
controls.axis = "XYZ";`;

export const threeSource = `import * as THREE from "three";
import { TransformControls } from "three/addons/controls/TransformControls.js";

const controls = new TransformControls(camera, renderer.domElement);
controls.attach(mesh);
controls.setMode("translate");`;

export const example = { meta, controls, setup, easelSource, threeSource };
