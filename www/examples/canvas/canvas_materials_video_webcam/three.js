// Adapted from three.js r186 examples/webgl_materials_video_webcam.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export function setup(canvas) {
  let stream;
  let requested = false;
  let disposed = false;

  const camera = new THREE.PerspectiveCamera(
    60,
    canvas.width / canvas.height,
    0.1,
    100,
  );
  camera.position.z = 0.01;

  const scene = new THREE.Scene();

  // The upstream page declares a hidden <video id="video" autoplay playsinline>.
  const video = canvas.ownerDocument.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;

  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;

  const geometry = new THREE.PlaneGeometry(16, 9);
  geometry.scale(0.5, 0.5, 0.5);
  const material = new THREE.MeshBasicMaterial({ map: texture });

  const count = 128;
  const radius = 32;

  for (let i = 1, l = count; i <= l; i++) {
    const phi = Math.acos(-1 + (2 * i) / l);
    const theta = Math.sqrt(l * Math.PI) * phi;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.setFromSphericalCoords(radius, phi, theta);
    mesh.lookAt(camera.position);
    scene.add(mesh);
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;

  function stopStream() {
    for (const track of stream?.getTracks() ?? []) track.stop();
    stream = undefined;
    video.pause();
    video.srcObject = null;
  }

  // The camera is requested on the first click on the canvas instead of at
  // page load, so the side-by-side page never prompts on its own.
  function onClick() {
    if (requested) return;
    requested = true;

    if (navigator.mediaDevices?.getUserMedia) {
      const constraints = {
        video: { width: 1280, height: 720, facingMode: "user" },
      };

      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((mediaStream) => {
          stream = mediaStream;
          if (disposed) {
            stopStream();
            return;
          }

          // apply the stream to the video element used in the texture

          video.srcObject = mediaStream;
          video.play().catch(() => {});
        })
        .catch((error) => {
          console.error("Unable to access the camera/webcam.", error);
        });
    } else {
      console.error("MediaDevices interface not available.");
    }
  }
  canvas.addEventListener("click", onClick);

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
      disposed = true;
      animation.cleanup();
      canvas.removeEventListener("click", onClick);
      stopStream();
      controls.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
