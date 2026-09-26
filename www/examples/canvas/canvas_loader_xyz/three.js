// Adapted from three.js r186 examples/webgl_loader_xyz.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";
import { XYZLoader } from "three/addons/loaders/XYZLoader.js";

import helixText from "../../../../assets/xyz/helix_201.xyz?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export function setup(canvas) {
  const camera = new THREE.PerspectiveCamera(
    50,
    canvas.width / canvas.height,
    0.1,
    100,
  );
  camera.position.set(10, 7, 10);

  const scene = new THREE.Scene();
  scene.add(camera);
  camera.lookAt(scene.position);

  const timer = new THREE.Timer();
  timer.connect(canvas.ownerDocument);

  const loader = new XYZLoader();
  const geometry = loader.parse(helixText);
  geometry.center();

  const vertexColors = geometry.hasAttribute("color") === true;

  const material = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: vertexColors,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  //

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  const animation = createExampleAnimationLoop(() => {
    timer.update();

    const delta = timer.getDelta();

    points.rotation.x += delta * 0.2;
    points.rotation.y += delta * 0.5;

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
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
