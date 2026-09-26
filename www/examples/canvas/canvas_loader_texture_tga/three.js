// Adapted from three.js r186 examples/webgl_loader_texture_tga.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TGALoader } from "three/addons/loaders/TGALoader.js";

import crateColor8Base64 from "../../../../assets/textures/crate_color8.tga.base64?raw";
import crateGrey8Base64 from "../../../../assets/textures/crate_grey8.tga.base64?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

function decodeBase64(base64) {
  return Uint8Array.from(atob(base64), (value) => value.charCodeAt(0)).buffer;
}

export function setup(canvas) {
  const camera = new THREE.PerspectiveCamera(
    45,
    canvas.width / canvas.height,
    0.1,
    100,
  );
  camera.position.set(0, 1, 5);

  const scene = new THREE.Scene();

  //

  const loader = new TGALoader();
  const geometry = new THREE.BoxGeometry();

  // add box 1 - grey8 texture

  // The checked-in TGA files replace the relative texture URLs, so loading needs no network.
  const texture1 = loader.createDataTexture(decodeBase64(crateGrey8Base64));
  texture1.colorSpace = THREE.SRGBColorSpace;
  const material1 = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    map: texture1,
  });

  const mesh1 = new THREE.Mesh(geometry, material1);
  mesh1.position.x = -1;

  scene.add(mesh1);

  // add box 2 - tga texture

  const texture2 = loader.createDataTexture(decodeBase64(crateColor8Base64));
  texture2.colorSpace = THREE.SRGBColorSpace;
  const material2 = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    map: texture2,
  });

  const mesh2 = new THREE.Mesh(geometry, material2);
  mesh2.position.x = 1;

  scene.add(mesh2);

  //

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);

  const light = new THREE.DirectionalLight(0xffffff, 2.5);
  light.position.set(1, 1, 1);
  scene.add(light);

  //

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  //

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;

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
    cleanup() {
      animation.cleanup();
      controls.dispose();
      geometry.dispose();
      material1.dispose();
      material2.dispose();
      texture1.dispose();
      texture2.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
