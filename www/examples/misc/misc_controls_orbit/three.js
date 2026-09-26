// Adapted from three.js r186 examples/misc_controls_orbit.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export function setup(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcccccc);
  scene.fog = new THREE.FogExp2(0xcccccc, 0.002);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  const camera = new THREE.PerspectiveCamera(
    60,
    canvas.width / canvas.height,
    1,
    1000,
  );
  camera.position.set(400, 200, 0);

  // controls

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.listenToKeyEvents(canvas); // optional

  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.05;

  controls.screenSpacePanning = false;

  controls.minDistance = 100;
  controls.maxDistance = 500;

  controls.cursorStyle = "grab";

  controls.maxPolarAngle = Math.PI / 2;

  // world

  const geometry = new THREE.ConeGeometry(10, 30, 4, 1);
  const material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    flatShading: true,
  });

  const mesh = new THREE.InstancedMesh(geometry, material, 500);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < 500; i++) {
    dummy.position.x = Math.random() * 1600 - 800;
    dummy.position.y = 0;
    dummy.position.z = Math.random() * 1600 - 800;

    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  scene.add(mesh);

  // lights

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 3);
  dirLight1.position.set(1, 1, 1);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0x002288, 3);
  dirLight2.position.set(-1, -1, -1);
  scene.add(dirLight2);

  const ambientLight = new THREE.AmbientLight(0x555555);
  scene.add(ambientLight);

  const animation = createExampleAnimationLoop(() => {
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

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
      mesh.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
