// Adapted from three.js r186 examples/webgl_loader_pcd.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { PCDLoader } from "three/addons/loaders/PCDLoader.js";

import pcdText from "../../../../assets/pcd/simple.pcd?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export function setup(canvas, params) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    30,
    canvas.width / canvas.height,
    0.01,
    40,
  );
  camera.position.set(0, 0, 1);
  scene.add(camera);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 0.5;
  controls.maxDistance = 10;

  //scene.add( new THREE.AxesHelper( 1 ) );

  const loader = new PCDLoader();

  const points = loader.parse(new TextEncoder().encode(pcdText).buffer);
  points.geometry.center();
  points.geometry.rotateX(Math.PI);
  points.name = "ascii/simple.pcd";
  scene.add(points);

  function update(next) {
    points.material.size = Number(next.size ?? 0.005);
    points.material.color.set(String(next.color ?? "#ffffff"));
  }
  update(params);

  const animation = createExampleAnimationLoop(() => {
    renderer.render(scene, camera);
  });

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    },
    update,
    cleanup() {
      animation.cleanup();
      controls.dispose();
      points.geometry.dispose();
      points.material.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
