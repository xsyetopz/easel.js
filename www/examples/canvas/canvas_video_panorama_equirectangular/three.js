// Adapted from three.js r186 examples/webgl_video_panorama_equirectangular.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { createPanoramaCanvas, drawPanoramaFrame } from "./panorama-source.js";

export function setup(canvas) {
  let isUserInteracting = false,
    lon = 0,
    lat = 0,
    phi = 0,
    theta = 0,
    onPointerDownPointerX = 0,
    onPointerDownPointerY = 0,
    onPointerDownLon = 0,
    onPointerDownLat = 0;

  const distance = 0.5;

  const camera = new THREE.PerspectiveCamera(
    75,
    canvas.width / canvas.height,
    0.25,
    10,
  );

  const scene = new THREE.Scene();

  const geometry = new THREE.SphereGeometry(5, 60, 40);
  // invert the geometry on the x-axis so that all of the faces point inward
  geometry.scale(-1, 1, 1);

  // A generated equirectangular canvas replaces the unlicensed pano.webm video.
  const source = createPanoramaCanvas(canvas.ownerDocument);
  const sourceContext = source.getContext("2d");
  drawPanoramaFrame(sourceContext, 0);

  const texture = new THREE.CanvasTexture(source);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(canvas.width, canvas.height, false);

  function onPointerDown(event) {
    isUserInteracting = true;
    // Keeps the drag when the pointer leaves the canvas, as upstream's
    // document listeners do.
    canvas.setPointerCapture?.(event.pointerId);

    onPointerDownPointerX = event.clientX;
    onPointerDownPointerY = event.clientY;

    onPointerDownLon = lon;
    onPointerDownLat = lat;
  }

  function onPointerMove(event) {
    if (isUserInteracting === true) {
      lon = (onPointerDownPointerX - event.clientX) * 0.1 + onPointerDownLon;
      lat = (onPointerDownPointerY - event.clientY) * 0.1 + onPointerDownLat;
    }
  }

  function onPointerUp() {
    isUserInteracting = false;
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);

  const animation = createExampleAnimationLoop((timestamp) => {
    drawPanoramaFrame(sourceContext, timestamp);
    texture.needsUpdate = true;

    lat = Math.max(-85, Math.min(85, lat));
    phi = THREE.MathUtils.degToRad(90 - lat);
    theta = THREE.MathUtils.degToRad(lon);

    camera.position.x = distance * Math.sin(phi) * Math.cos(theta);
    camera.position.y = distance * Math.cos(phi);
    camera.position.z = distance * Math.sin(phi) * Math.sin(theta);

    camera.lookAt(0, 0, 0);

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
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
