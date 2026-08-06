import { Side, SphereGeometry } from "@/index.js";
import {
  addMediaStatus,
  connectVideoTexture,
  createMediaScene,
  disposeMediaState,
  startMediaLoop,
} from "./media_helpers.js";

export const meta = {
  id: "webgl_video_panorama_equirectangular",
  name: "Video panorama",
  category: "canvas",
  description:
    "An equirectangular video is sampled on an interior CPU sphere; Canvas2D uses affine UVs rather than GPU panorama shaders.",
};

export const controls = [];

export function setup(canvas) {
  const state = createMediaScene(canvas, new SphereGeometry(8, 32, 16), {
    background: 0x080d17,
    cameraPosition: [0, 0, 0],
    target: [0, 0, -1],
    fov: 72,
    side: Side.Double,
    seed: 33,
  });
  const status = addMediaStatus(canvas, "Loading equirectangular video…");
  const stopVideo = connectVideoTexture(state, "/textures/pano.mp4", {
    onReady() {
      status.set("Panorama VideoTexture · CPU affine UV sampling");
    },
    onError() {
      status.set("Panorama video unavailable · procedural fallback");
    },
  });
  const stopLoop = startMediaLoop(state, (frame) => {
    state.mesh.rotation.y = frame.elapsedTime * 0.08;
    state.camera.rotation.y = Math.sin(frame.elapsedTime * 0.15) * 0.18;
    state.camera.rotation.x = Math.sin(frame.elapsedTime * 0.09) * 0.05;
  });
  return {
    cleanup() {
      disposeMediaState(state, stopVideo, stopLoop, status);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const video = globalThis.document.createElement("video");
video.src = "/textures/pano.mp4";
video.muted = true;
video.loop = true;
video.playsInline = true;
const texture = new EASEL.VideoTexture(video);
const panorama = new EASEL.Mesh(
  new EASEL.SphereGeometry(8, 32, 16),
  new EASEL.BasicMaterial({ map: texture, side: EASEL.Side.Double }),
);`;

export const threeSource = `import * as THREE from "three";

const video = document.createElement("video");
video.src = "textures/pano.mp4";
video.muted = true;
video.loop = true;
video.playsInline = true;
const texture = new THREE.VideoTexture(video);
const panorama = new THREE.Mesh(
  new THREE.SphereGeometry(8, 32, 16),
  new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide }),
);`;

export const example = { meta, controls, setup, easelSource, threeSource };
