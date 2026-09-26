// Adapted from three.js r186 examples/webgl_worker_offscreencanvas.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

// The scene is inlined from examples/jsm/offscreen/scene.js; the page mounts
// only its onscreen (main-thread) canvas, see the EASEL module's differences.
export function setup(canvas, params) {
  // PRNG

  let seed = 1;

  function random() {
    const x = Math.sin(seed++) * 10000;

    return x - Math.floor(x);
  }

  const camera = new THREE.PerspectiveCamera(
    40,
    canvas.width / canvas.height,
    1,
    1000,
  );
  camera.position.z = 200;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x444466, 100, 400);
  scene.background = new THREE.Color(0x444466);

  const group = new THREE.Group();
  scene.add(group);

  // matcap-porcelain-white.jpg has no stated licence, so the materials use
  // MeshMatcapMaterial's built-in gradient instead of loading it.
  const geometry = new THREE.IcosahedronGeometry(5, 8);
  const materials = [
    new THREE.MeshMatcapMaterial({ color: 0xaa24df }),
    new THREE.MeshMatcapMaterial({ color: 0x605d90 }),
    new THREE.MeshMatcapMaterial({ color: 0xe04a3f }),
    new THREE.MeshMatcapMaterial({ color: 0xe30456 }),
  ];

  for (let i = 0; i < 100; i++) {
    const material = materials[i % materials.length];
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = random() * 200 - 100;
    mesh.position.y = random() * 200 - 100;
    mesh.position.z = random() * 200 - 100;
    mesh.scale.setScalar(random() + 1);
    group.add(mesh);
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  renderer.setSize(canvas.width, canvas.height, false);

  // jank.js: the START JANK button busy-loops the main thread every frame.

  let interval;

  function jank() {
    let number = 0;

    for (let i = 0; i < 10000000; i++) {
      number += Math.random();
    }

    return number;
  }

  function update(next) {
    const enabled = next.jank === "on";
    if (enabled && interval === undefined) {
      interval = setInterval(jank, 1000 / 60);
    } else if (!enabled && interval !== undefined) {
      clearInterval(interval);
      interval = undefined;
    }
  }
  update(params);

  const animation = createExampleAnimationLoop(() => {
    // group.rotation.x = Date.now() / 4000;
    group.rotation.y = -Date.now() / 4000;

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
      if (interval !== undefined) clearInterval(interval);
      interval = undefined;
      geometry.dispose();
      for (const material of materials) material.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
