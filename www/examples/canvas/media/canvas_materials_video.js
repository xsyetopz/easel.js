import { BoxGeometry, OrbitControls } from "@/index.js";
import {
  addMediaStatus,
  connectVideoTexture,
  createMediaScene,
  disposeMediaState,
  startMediaLoop,
} from "./media_helpers.js";

export const meta = {
  id: "webgl_materials_video",
  name: "Video material",
  category: "canvas",
  description:
    "A muted HTML video is sampled by VideoTexture on the CPU; a procedural texture remains visible until Canvas2D can read a decoded frame.",
};

export const controls = [];

export function setup(canvas) {
  const state = createMediaScene(canvas, new BoxGeometry(3.8, 2.25, 0.08), {
    cameraPosition: [0, 0.1, 5.6],
    fov: 42,
    seed: 3,
  });
  const status = addMediaStatus(canvas, "Loading video texture…");
  const orbit = new OrbitControls(state.camera, canvas);
  orbit.target.set(0, 0, 0);
  orbit.enableDamping = true;
  const stopVideo = connectVideoTexture(state, "/textures/sintel.ogv", {
    onReady() {
      status.set("VideoTexture · CPU Canvas2D sampling");
    },
    onError() {
      status.set("Video unavailable · procedural Canvas2D fallback");
    },
  });
  const stopLoop = startMediaLoop(state, (frame) => {
    orbit.update();
    state.mesh.rotation.y = frame.elapsedTime * 0.18;
    state.mesh.rotation.x = Math.sin(frame.elapsedTime * 0.3) * 0.08;
  });
  return {
    cleanup() {
      orbit.dispose();
      disposeMediaState(state, stopVideo, stopLoop, status);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const video = globalThis.document.createElement("video");
video.muted = true;
video.loop = true;
video.playsInline = true;
video.src = "/textures/sintel.ogv";
const texture = new EASEL.VideoTexture(video);
const mesh = new EASEL.Mesh(geometry, new EASEL.BasicMaterial({ map: texture }));
video.play();
texture.update();`;

export const threeSource = `import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const video = document.createElement("video");
video.muted = true;
video.loop = true;
video.playsInline = true;
video.src = "textures/sintel.ogv";
const texture = new THREE.VideoTexture(video);
const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture }));
video.play();`;

export const example = { meta, controls, setup, easelSource, threeSource };
