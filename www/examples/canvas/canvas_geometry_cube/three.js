// Adapted from three.js r186 examples/webgl_geometry_cube.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";

import crateBase64 from "../../../../assets/textures/crate.gif.base64?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export function setup(canvas) {
  const camera = new THREE.PerspectiveCamera(
    70,
    canvas.width / canvas.height,
    0.1,
    100,
  );
  camera.position.z = 2;

  const scene = new THREE.Scene();

  // The checked-in GIF replaces the relative texture URL, so loading needs no network.
  const texture = new THREE.TextureLoader().load(
    `data:image/gif;base64,${crateBase64}`,
  );
  texture.colorSpace = THREE.SRGBColorSpace;

  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshBasicMaterial({ map: texture });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  const animation = createExampleAnimationLoop(() => {
    mesh.rotation.x += 0.005;
    mesh.rotation.y += 0.01;

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
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
