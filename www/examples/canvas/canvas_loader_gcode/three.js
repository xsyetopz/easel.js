// Adapted from three.js r186 examples/webgl_loader_gcode.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GCodeLoader } from "three/addons/loaders/GCodeLoader.js";

import testM82 from "../../../../assets/gcode/test_m82.gcode?raw";
import testM83 from "../../../../assets/gcode/test_m83.gcode?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

const sources = { test_m82: testM82, test_m83: testM83 };

export function setup(canvas, params) {
  let model;

  let asset = String(params.asset ?? "test_m82");

  const assets = ["test_m82", "test_m83"];

  const positions = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];

  const camera = new THREE.PerspectiveCamera(
    60,
    canvas.width / canvas.height,
    1,
    1000,
  );
  camera.position.set(0, 0, 70);

  const scene = new THREE.Scene();

  const loader = new GCodeLoader();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 10;
  controls.maxDistance = 100;

  function disposeModel() {
    model.traverse((object) => {
      if (object.material) object.material.dispose();
      if (object.geometry) object.geometry.dispose();
    });

    scene.remove(model);
  }

  function loadAsset(name) {
    const object = loader.parse(sources[name]);
    model = object;
    model.position.copy(positions[assets.indexOf(name)]);
    scene.add(model);
    controls.reset();
  }

  loadAsset(asset);

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
    update(next) {
      const value = String(next.asset ?? "test_m82");
      if (value === asset) return;
      asset = value;
      if (model) disposeModel();
      loadAsset(value);
    },
    cleanup() {
      animation.cleanup();
      controls.dispose();
      if (model) disposeModel();
      renderer.dispose();
    },
  };
}

export const example = { setup };
