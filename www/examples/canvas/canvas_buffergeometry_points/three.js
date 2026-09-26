// Adapted from three.js r186 examples/webgl_buffergeometry_points.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export function setup(canvas) {
  //

  const camera = new THREE.PerspectiveCamera(
    27,
    canvas.width / canvas.height,
    5,
    3500,
  );
  camera.position.z = 2750;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  scene.fog = new THREE.Fog(0x050505, 2000, 3500);

  //

  const particles = 500000;

  const geometry = new THREE.BufferGeometry();

  const positions = [];
  const colors = [];

  const color = new THREE.Color();

  const n = 1000;
  const n2 = n / 2; // particles spread in the cube

  for (let i = 0; i < particles; i++) {
    // positions

    const x = Math.random() * n - n2;
    const y = Math.random() * n - n2;
    const z = Math.random() * n - n2;

    positions.push(x, y, z);

    // colors

    const vx = x / n + 0.5;
    const vy = y / n + 0.5;
    const vz = z / n + 0.5;

    color.setRGB(vx, vy, vz, THREE.SRGBColorSpace);

    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  geometry.computeBoundingSphere();

  //

  const material = new THREE.PointsMaterial({ size: 15, vertexColors: true });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  //

  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(canvas.width, canvas.height, false);

  //

  const animation = createExampleAnimationLoop(() => {
    const time = Date.now() * 0.001;

    points.rotation.x = time * 0.25;
    points.rotation.y = time * 0.5;

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
      renderer.dispose();
    },
  };
}

export const example = { setup };
