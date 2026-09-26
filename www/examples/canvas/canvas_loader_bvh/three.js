// Adapted from three.js r186 examples/webgl_loader_bvh.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { BVHLoader } from "three/addons/loaders/BVHLoader.js";

import spinText from "../../../../assets/bvh/spin.bvh?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export function setup(canvas) {
  const timer = new THREE.Timer();
  timer.connect(canvas.ownerDocument);

  const camera = new THREE.PerspectiveCamera(
    60,
    canvas.width / canvas.height,
    1,
    1000,
  );
  camera.position.set(0, 200, 300);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeeeeee);

  const grid = new THREE.GridHelper(400, 10);
  scene.add(grid);

  // renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 300;
  controls.maxDistance = 700;

  const loader = new BVHLoader();
  const result = loader.parse(spinText);

  const skeletonHelper = new THREE.SkeletonHelper(result.skeleton.bones[0]);

  scene.add(result.skeleton.bones[0]);
  scene.add(skeletonHelper);

  // play animation
  const mixer = new THREE.AnimationMixer(result.skeleton.bones[0]);
  mixer.clipAction(result.clip).play();

  const animation = createExampleAnimationLoop(() => {
    timer.update();

    const delta = timer.getDelta();

    mixer.update(delta);

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
      timer.dispose();
      controls.dispose();
      mixer.stopAllAction();
      skeletonHelper.dispose();
      grid.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
