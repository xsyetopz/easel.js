// Adapted from three.js r186 examples/webgl_test_memory.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export function setup(canvas) {
  const camera = new THREE.PerspectiveCamera(
    60,
    canvas.width / canvas.height,
    1,
    10000,
  );
  camera.position.z = 200;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(canvas.width, canvas.height, false);

  function createImage() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;

    const context = canvas.getContext("2d");
    context.fillStyle =
      "rgb(" +
      Math.floor(Math.random() * 256) +
      "," +
      Math.floor(Math.random() * 256) +
      "," +
      Math.floor(Math.random() * 256) +
      ")";
    context.fillRect(0, 0, 256, 256);

    return canvas;
  }

  //

  const animation = createExampleAnimationLoop(() => {
    const geometry = new THREE.SphereGeometry(
      50,
      Math.random() * 64,
      Math.random() * 32,
    );

    const texture = new THREE.CanvasTexture(createImage());

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      wireframe: true,
    });

    const mesh = new THREE.Mesh(geometry, material);

    scene.add(mesh);

    renderer.render(scene, camera);

    scene.remove(mesh);

    // clean up

    geometry.dispose();
    material.dispose();
    texture.dispose();
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
      renderer.dispose();
    },
  };
}

export const example = { setup };
