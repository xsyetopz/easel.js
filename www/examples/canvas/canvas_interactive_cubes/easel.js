import {
  BoxGeometry,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Renderer,
  Scene,
  toRadians,
  Vector2,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { pointerToNdc } from "../../../runtime/example-pointer.ts";

export const meta = {
  id: "canvas_interactive_cubes",
  upstream: "webgl_interactive_cubes",
  name: "interactive / cubes",
  category: "canvas",
  animated: true,
  description:
    "Two thousand randomly colored, rotated, and scaled Lambert cubes are raycast every frame while the camera slowly orbits, and the cube under the pointer turns red.",
  differences: [
    "EASEL bakes Lambert lighting per vertex (Gouraud) instead of per fragment, and it rasterizes the cubes on the CPU without anti-aliasing, so cube edges are jagged where the three.js renderer enables antialias.",
  ],
};
export const controls = [];

export function setup(canvas) {
  let INTERSECTED;
  let theta = 0;

  const pointer = new Vector2();
  const radius = 5;

  const camera = new PerspectiveCamera({
    fov: 70,
    aspect: canvas.width / canvas.height,
    near: 0.1,
    far: 100,
  });

  const scene = new Scene();
  scene.background = 0xf0f0f0;

  const light = new DirectionalLight(0xffffff, 3);
  light.position.set(1, 1, 1).normalize();
  scene.add(light);

  const geometry = new BoxGeometry();
  const materials = [];

  for (let i = 0; i < 2000; i++) {
    const material = new LambertMaterial({
      color: Math.random() * 0xffffff,
      vertexColors: false,
    });
    materials.push(material);
    const object = new Mesh(geometry, material);

    object.position.x = Math.random() * 40 - 20;
    object.position.y = Math.random() * 40 - 20;
    object.position.z = Math.random() * 40 - 20;

    object.rotation.x = Math.random() * 2 * Math.PI;
    object.rotation.y = Math.random() * 2 * Math.PI;
    object.rotation.z = Math.random() * 2 * Math.PI;

    object.scale.x = Math.random() + 0.5;
    object.scale.y = Math.random() + 0.5;
    object.scale.z = Math.random() + 0.5;

    scene.add(object);
  }

  const raycaster = new Raycaster();

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  canvas.addEventListener("mousemove", onPointerMove);

  function onPointerMove(event) {
    pointerToNdc(event, canvas, pointer);
  }

  //

  function render() {
    theta += 0.1;

    camera.position.x = radius * Math.sin(toRadians(theta));
    camera.position.y = radius * Math.sin(toRadians(theta));
    camera.position.z = radius * Math.cos(toRadians(theta));
    camera.lookAt(scene.position);

    camera.updateMatrixWorld();

    // find intersections

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(scene.children, false);

    if (intersects.length > 0) {
      if (INTERSECTED !== intersects[0].object) {
        if (INTERSECTED)
          INTERSECTED.material.emissive.hex = INTERSECTED.currentHex;

        INTERSECTED = intersects[0].object;
        INTERSECTED.currentHex = INTERSECTED.material.emissive.hex;
        INTERSECTED.material.emissive.hex = 0xff0000;
      }
    } else {
      if (INTERSECTED)
        INTERSECTED.material.emissive.hex = INTERSECTED.currentHex;

      INTERSECTED = undefined;
    }

    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }

  const animation = createExampleAnimationLoop(() => {
    render();
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
      canvas.removeEventListener("mousemove", onPointerMove);
      geometry.dispose();
      for (const material of materials) material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const light = new EASEL.DirectionalLight(0xffffff, 3);
light.position.set(1, 1, 1).normalize();
scene.add(light);

const geometry = new EASEL.BoxGeometry();
const object = new EASEL.Mesh(
  geometry,
  new EASEL.LambertMaterial({ color: Math.random() * 0xffffff, vertexColors: false }),
);
scene.add(object);

camera.lookAt(scene.position);
camera.updateMatrixWorld();

const raycaster = new EASEL.Raycaster();
raycaster.setFromCamera(pointer, camera);
const hit = raycaster.intersectObjects(scene.children, false)[0];
if (hit) hit.object.material.emissive.hex = 0xff0000;

renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };
