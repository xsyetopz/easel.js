// Adapted from three.js r186 examples/webgl_loader_nrrd.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";
import { NRRDLoader } from "three/addons/loaders/NRRDLoader.js";

import stentBase64 from "../../../../assets/nrrd/stent.nrrd.base64?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

const stentBuffer = Uint8Array.from(atob(stentBase64), (value) =>
  value.charCodeAt(0),
).buffer;

export function setup(canvas, params) {
  const camera = new THREE.PerspectiveCamera(
    60,
    canvas.width / canvas.height,
    0.01,
    1e10,
  );
  camera.position.z = 300;

  const scene = new THREE.Scene();

  scene.add(camera);

  // light

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x000000, 3);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(200, 200, 200);
  scene.add(dirLight);

  const loader = new NRRDLoader();
  const volume = loader.parse(stentBuffer);

  //box helper to see the extend of the volume
  const geometry = new THREE.BoxGeometry(
    volume.xLength,
    volume.yLength,
    volume.zLength,
  );
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const cube = new THREE.Mesh(geometry, material);
  cube.visible = false;
  const box = new THREE.BoxHelper(cube);
  scene.add(box);
  box.applyMatrix4(volume.matrix);
  scene.add(cube);

  //z plane
  const sliceZ = volume.extractSlice(
    "z",
    Math.floor(volume.RASDimensions[2] / 4),
  );
  scene.add(sliceZ.mesh);

  //y plane
  const sliceY = volume.extractSlice(
    "y",
    Math.floor(volume.RASDimensions[1] / 2),
  );
  scene.add(sliceY.mesh);

  //x plane
  const sliceX = volume.extractSlice(
    "x",
    Math.floor(volume.RASDimensions[0] / 2),
  );
  scene.add(sliceX.mesh);

  function update(next) {
    for (const [slice, key] of [
      [sliceX, "indexX"],
      [sliceY, "indexY"],
      [sliceZ, "indexZ"],
    ]) {
      const index = Number(next[key] ?? slice.index);
      if (index !== slice.index) {
        slice.index = index;
        slice.repaint.call(slice);
      }
    }

    let repaintAll = false;
    for (const [property, key] of [
      ["lowerThreshold", "lowerThreshold"],
      ["upperThreshold", "upperThreshold"],
      ["windowLow", "windowLow"],
      ["windowHigh", "windowHigh"],
    ]) {
      const value = Number(next[key] ?? volume[property]);
      if (value !== volume[property]) {
        volume[property] = value;
        repaintAll = true;
      }
    }
    if (repaintAll) volume.repaintAllSlices();
  }
  update(params);

  // renderer

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  const controls = new TrackballControls(camera, renderer.domElement);
  controls.minDistance = 100;
  controls.maxDistance = 500;
  controls.rotateSpeed = 5.0;
  controls.zoomSpeed = 5;
  controls.panSpeed = 2;

  const animation = createExampleAnimationLoop(() => {
    controls.update();

    renderer.render(scene, camera);
  });

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height, false);

      controls.handleResize();
    },
    update,
    cleanup() {
      animation.cleanup();
      controls.dispose();
      geometry.dispose();
      material.dispose();
      box.geometry.dispose();
      box.material.dispose();
      for (const slice of [sliceX, sliceY, sliceZ]) {
        slice.geometry.dispose();
        slice.mesh.material.map.dispose();
        slice.mesh.material.dispose();
      }
      renderer.dispose();
    },
  };
}

export const example = { setup };
