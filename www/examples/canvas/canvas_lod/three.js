// Adapted from three.js r186 examples/webgl_lod.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";
import { FlyControls } from "three/addons/controls/FlyControls.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export function setup(canvas) {
  const timer = new THREE.Timer();
  timer.connect(canvas.ownerDocument);

  const camera = new THREE.PerspectiveCamera(
    45,
    canvas.width / canvas.height,
    1,
    15000,
  );
  camera.position.z = 1000;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, 1, 15000);

  const pointLight = new THREE.PointLight(0xff2200, 3, 0, 0);
  pointLight.position.set(0, 0, 0);
  scene.add(pointLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 3);
  dirLight.position.set(0, 0, 1).normalize();
  scene.add(dirLight);

  const geometry = [
    [new THREE.IcosahedronGeometry(100, 16), 50],
    [new THREE.IcosahedronGeometry(100, 8), 300],
    [new THREE.IcosahedronGeometry(100, 4), 1000],
    [new THREE.IcosahedronGeometry(100, 2), 2000],
    [new THREE.IcosahedronGeometry(100, 1), 8000],
  ];

  const material = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    wireframe: true,
  });

  for (let j = 0; j < 1000; j++) {
    const lod = new THREE.LOD();

    for (let i = 0; i < geometry.length; i++) {
      const mesh = new THREE.Mesh(geometry[i][0], material);
      mesh.scale.set(1.5, 1.5, 1.5);
      mesh.updateMatrix();
      mesh.matrixAutoUpdate = false;
      lod.addLevel(mesh, geometry[i][1]);
    }

    lod.position.x = 10000 * (0.5 - Math.random());
    lod.position.y = 7500 * (0.5 - Math.random());
    lod.position.z = 10000 * (0.5 - Math.random());
    lod.updateMatrix();
    lod.matrixAutoUpdate = false;
    scene.add(lod);
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  //

  const controls = new FlyControls(camera, renderer.domElement);
  controls.movementSpeed = 1000;
  controls.rollSpeed = Math.PI / 10;

  const animation = createExampleAnimationLoop(() => {
    timer.update();

    controls.update(timer.getDelta());

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
      timer.dispose();
      for (const [levelGeometry] of geometry) levelGeometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
