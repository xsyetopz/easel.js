// Adapted from three.js r186 examples/webgl_math_orientation_transform.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export function setup(canvas, params) {
  const spherical = new THREE.Spherical();
  const rotationMatrix = new THREE.Matrix4();
  const targetQuaternion = new THREE.Quaternion();
  const timer = new THREE.Timer();
  timer.connect(canvas.ownerDocument);
  const speed = Math.PI / 2;

  const settings = {
    useLookAt: params.useLookAt === "on",
  };

  const camera = new THREE.PerspectiveCamera(
    70,
    canvas.width / canvas.height,
    0.01,
    10,
  );
  camera.position.z = 5;

  const scene = new THREE.Scene();

  const geometry = new THREE.ConeGeometry(0.1, 0.5, 8);
  geometry.rotateX(Math.PI * 0.5);
  const material = new THREE.MeshNormalMaterial();

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  //

  const targetGeometry = new THREE.SphereGeometry(0.05);
  const targetMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const target = new THREE.Mesh(targetGeometry, targetMaterial);
  scene.add(target);

  //

  const sphereGeometry = new THREE.SphereGeometry(2, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({
    color: 0xcccccc,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  scene.add(sphere);

  //

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  //

  let targetTimeout;

  generateTarget();

  function animate() {
    timer.update();

    const delta = timer.getDelta();

    if (mesh.quaternion.equals(targetQuaternion) === false) {
      if (settings.useLookAt === true) {
        // using lookAt() will make the mesh instantly look at the target

        mesh.lookAt(target.position);
      } else {
        // using rotateTowards() will gradually rotate the mesh towards the target
        // the "speed" variable represents the rotation speed in radians per seconds

        const step = speed * delta;
        mesh.quaternion.rotateTowards(targetQuaternion, step);
      }
    }

    renderer.render(scene, camera);
  }

  function generateTarget() {
    // generate a random point on a sphere

    spherical.theta = Math.random() * Math.PI * 2;
    spherical.phi = Math.acos(2 * Math.random() - 1);
    spherical.radius = 2;

    target.position.setFromSpherical(spherical);

    // compute target rotation

    rotationMatrix.lookAt(target.position, mesh.position, mesh.up);
    targetQuaternion.setFromRotationMatrix(rotationMatrix);

    targetTimeout = setTimeout(generateTarget, 2000);
  }

  const animation = createExampleAnimationLoop(animate);

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    },
    update(next) {
      settings.useLookAt = next.useLookAt === "on";
    },
    cleanup() {
      animation.cleanup();
      clearTimeout(targetTimeout);
      timer.dispose();
      geometry.dispose();
      material.dispose();
      targetGeometry.dispose();
      targetMaterial.dispose();
      sphereGeometry.dispose();
      sphereMaterial.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
