import { BoxGeometry } from "@/index.js";
import {
  addMediaStatus,
  connectVideoTexture,
  createMediaScene,
  disposeMediaState,
  startMediaLoop,
} from "./media_helpers.js";

export const meta = {
  id: "webgpu_materials_video",
  name: "WebGPU video material",
  category: "canvas",
  description:
    "The browser video path from the WebGPU example is retained as a CPU VideoTexture; GPU material and shader semantics are replaced by BasicMaterial.",
};

export const controls = [];

export function setup(canvas) {
  const state = createMediaScene(canvas, new BoxGeometry(3.8, 2.25, 0.08), {
    cameraPosition: [0, 0.1, 5.6],
    fov: 42,
    seed: 19,
  });
  const status = addMediaStatus(canvas, "Loading CPU video representation…");
  const stopVideo = connectVideoTexture(state, "/textures/sintel.mp4", {
    onReady() {
      status.set("VideoTexture ready · WebGPU material represented on CPU");
    },
    onError() {
      status.set("Video unavailable · procedural Canvas2D fallback");
    },
  });
  const stopLoop = startMediaLoop(state, (frame) => {
    state.mesh.rotation.y = frame.elapsedTime * 0.3;
    state.mesh.rotation.x = Math.sin(frame.elapsedTime * 0.42) * 0.12;
  });
  return {
    cleanup() {
      disposeMediaState(state, stopVideo, stopLoop, status);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const video = globalThis.document.createElement("video");
video.src = "/textures/sintel.mp4";
video.muted = true;
video.loop = true;
video.playsInline = true;
const texture = new EASEL.VideoTexture(video);
const material = new EASEL.BasicMaterial({ map: texture });
scene.add(new EASEL.Mesh(geometry, material));`;

export const threeSource = `import * as THREE from "three";

const video = document.createElement("video");
video.src = "textures/sintel.mp4";
video.muted = true;
video.loop = true;
video.playsInline = true;
const texture = new THREE.VideoTexture(video);
const material = new THREE.MeshBasicMaterial({ map: texture });
scene.add(new THREE.Mesh(geometry, material));`;

export const example = { meta, controls, setup, easelSource, threeSource };
