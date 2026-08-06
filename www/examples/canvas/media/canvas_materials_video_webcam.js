import { BoxGeometry, OrbitControls } from "@/index.js";
import {
  addMediaStatus,
  connectVideoTexture,
  createMediaScene,
  disposeMediaState,
  requestWebcam,
  startMediaLoop,
} from "./media_helpers.js";

export const meta = {
  id: "webgl_materials_video_webcam",
  name: "Webcam video material",
  category: "canvas",
  description:
    "A permission-gated webcam stream feeds VideoTexture and CPU Canvas2D sampling, with a visible fallback when camera access is unavailable.",
};

export const controls = [];

export function setup(canvas) {
  const state = createMediaScene(canvas, new BoxGeometry(3.8, 2.25, 0.08), {
    cameraPosition: [0, 0.1, 5.6],
    fov: 42,
    seed: 11,
  });
  const status = addMediaStatus(canvas, "Requesting camera permission…");
  const orbit = new OrbitControls(state.camera, canvas);
  orbit.target.set(0, 0, 0);
  orbit.enableDamping = true;
  const stopVideo = connectVideoTexture(state, undefined, {
    onReady() {
      status.set("Webcam VideoTexture · CPU Canvas2D sampling");
    },
    onError() {
      status.set("Camera unavailable · procedural Canvas2D fallback");
    },
  });
  const stopWebcam =
    state.video !== null
      ? requestWebcam(
          state.video,
          () => status.set("Camera stream ready · waiting for a decoded frame"),
          () => status.set("Camera permission denied · procedural fallback"),
        )
      : () => undefined;
  const stopLoop = startMediaLoop(state, (frame) => {
    orbit.update();
    state.mesh.rotation.y = frame.elapsedTime * 0.18;
    state.mesh.rotation.x = Math.sin(frame.elapsedTime * 0.3) * 0.08;
  });
  return {
    cleanup() {
      orbit.dispose();
      stopWebcam();
      disposeMediaState(state, stopVideo, stopLoop, status);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const video = globalThis.document.createElement("video");
video.muted = true;
video.playsInline = true;
const stream = await globalThis.navigator.mediaDevices.getUserMedia({ video: true, audio: false });
video.srcObject = stream;
const texture = new EASEL.VideoTexture(video);
const mesh = new EASEL.Mesh(geometry, new EASEL.BasicMaterial({ map: texture }));
video.play();`;

export const threeSource = `import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const video = document.createElement("video");
video.muted = true;
video.playsInline = true;
const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
video.srcObject = stream;
const texture = new THREE.VideoTexture(video);
const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture }));
video.play();`;

export const example = { meta, controls, setup, easelSource, threeSource };
