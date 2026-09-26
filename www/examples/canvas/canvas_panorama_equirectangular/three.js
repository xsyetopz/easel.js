// Adapted from three.js r186 examples/webgl_panorama_equirectangular.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";

import panoramaBase64 from "../../../../assets/textures/equirectangular/spruit_sunrise_2k.hdr.jpg.base64?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export function setup(canvas) {
  let isUserInteracting = false,
    onPointerDownMouseX = 0,
    onPointerDownMouseY = 0,
    lon = 0,
    onPointerDownLon = 0,
    lat = 0,
    onPointerDownLat = 0,
    phi = 0,
    theta = 0;

  const camera = new THREE.PerspectiveCamera(
    75,
    canvas.width / canvas.height,
    1,
    1100,
  );

  const scene = new THREE.Scene();

  const geometry = new THREE.SphereGeometry(500, 60, 40);
  // invert the geometry on the x-axis so that all of the faces point inward
  geometry.scale(-1, 1, 1);

  // The checked-in CC0 Poly Haven panorama replaces textures/2294472375_24a3b8ef46_o.jpg,
  // whose license is unknown, and a data URL keeps loading off the network.
  const texture = new THREE.TextureLoader().load(
    `data:image/jpeg;base64,${panoramaBase64}`,
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture });

  const mesh = new THREE.Mesh(geometry, material);

  scene.add(mesh);

  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(canvas.width, canvas.height, false);

  const previousTouchAction = canvas.style?.touchAction;
  if (canvas.style) canvas.style.touchAction = "none";
  canvas.addEventListener("pointerdown", onPointerDown);

  canvas.addEventListener("wheel", onDocumentMouseWheel);

  function onPointerDown(event) {
    if (event.isPrimary === false) return;

    isUserInteracting = true;

    onPointerDownMouseX = event.clientX;
    onPointerDownMouseY = event.clientY;

    onPointerDownLon = lon;
    onPointerDownLat = lat;

    canvas.setPointerCapture(event.pointerId);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
  }

  function onPointerMove(event) {
    if (event.isPrimary === false) return;

    lon = (onPointerDownMouseX - event.clientX) * 0.1 + onPointerDownLon;
    lat = (event.clientY - onPointerDownMouseY) * 0.1 + onPointerDownLat;
  }

  function onPointerUp(event) {
    if (event.isPrimary === false) return;

    isUserInteracting = false;

    canvas.releasePointerCapture(event.pointerId);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
  }

  function onDocumentMouseWheel(event) {
    const fov = camera.fov + event.deltaY * 0.05;

    camera.fov = THREE.MathUtils.clamp(fov, 10, 75);

    camera.updateProjectionMatrix();
  }

  const animation = createExampleAnimationLoop(() => {
    if (isUserInteracting === false) {
      lon += 0.1;
    }

    lat = Math.max(-85, Math.min(85, lat));
    phi = THREE.MathUtils.degToRad(90 - lat);
    theta = THREE.MathUtils.degToRad(lon);

    const x = 500 * Math.sin(phi) * Math.cos(theta);
    const y = 500 * Math.cos(phi);
    const z = 500 * Math.sin(phi) * Math.sin(theta);

    camera.lookAt(x, y, z);

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
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onDocumentMouseWheel);
      if (canvas.style) canvas.style.touchAction = previousTouchAction;
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
