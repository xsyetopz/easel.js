// Adapted from three.js r186 examples/webgl_loader_obj.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

// Upstream loads models/obj/male02 with its MTL file and textures. That model
// has no license, so this comparison loads the CC0 Suzanne OBJ without an MTL.
import suzanneText from "../../../../fixtures/models/suzanne/suzanne.obj?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export function setup(canvas) {
  const camera = new THREE.PerspectiveCamera(
    45,
    canvas.width / canvas.height,
    0.1,
    20,
  );
  camera.position.z = 2.5;

  // scene

  const scene = new THREE.Scene();

  const ambientLight = new THREE.AmbientLight(0xffffff);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 15);
  camera.add(pointLight);
  scene.add(camera);

  // model

  const objLoader = new OBJLoader();

  const object = objLoader.parse(suzanneText);

  object.position.y = 0;
  object.scale.setScalar(0.8);
  scene.add(object);

  //

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  //

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 2;
  controls.maxDistance = 5;

  const animation = createExampleAnimationLoop(() => {
    controls.update();

    renderer.render(scene, camera);
  });

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height, false);
    },
    cleanup() {
      animation.cleanup();
      controls.dispose();
      object.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
      renderer.dispose();
    },
  };
}

export const example = { setup };
