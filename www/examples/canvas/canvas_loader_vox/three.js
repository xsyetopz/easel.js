// Adapted from three.js r186 examples/webgl_loader_vox.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VOXLoader } from "three/addons/loaders/VOXLoader.js";

import monumentBase64 from "../../../../assets/vox/monu10.vox.base64?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

const monumentBuffer = Uint8Array.from(atob(monumentBase64), (value) =>
  value.charCodeAt(0),
).buffer;

export function setup(canvas) {
  const camera = new THREE.PerspectiveCamera(
    50,
    canvas.width / canvas.height,
    0.01,
    10,
  );
  camera.position.set(0.175, 0.075, 0.175);

  const scene = new THREE.Scene();
  scene.add(camera);

  // light

  const hemiLight = new THREE.HemisphereLight(0xcccccc, 0x444444, 3);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
  dirLight.position.set(1.5, 3, 2.5);
  scene.add(dirLight);

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight2.position.set(-1.5, -3, -2.5);
  scene.add(dirLight2);

  const loader = new VOXLoader();
  const result = loader.parse(monumentBuffer);

  const mesh = result.scene.children[0];
  mesh.position.y = 0;
  mesh.scale.setScalar(0.0015);
  scene.add(mesh);

  // renderer

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  // controls

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 0.1;
  controls.maxDistance = 0.5;

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
      mesh.geometry.dispose();
      mesh.material.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
