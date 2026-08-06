import { BoxGeometry } from "@/index.js";
import {
  addMediaStatus,
  captureVideoFrame,
  connectVideoTexture,
  createMediaScene,
  disposeMediaState,
  startMediaLoop,
} from "./media_helpers.js";

export const meta = {
  id: "webgpu_video_frame",
  name: "VideoFrame",
  category: "canvas",
  description:
    "Uses WebCodecs VideoFrame when available and copies one frame into a bounded CPU DataTexture; VideoTexture remains the browser fallback.",
};

export const controls = [];

export function setup(canvas) {
  const state = createMediaScene(canvas, new BoxGeometry(3.8, 2.25, 0.08), {
    cameraPosition: [0, 0.1, 5.6],
    fov: 42,
    seed: 27,
  });
  const status = addMediaStatus(canvas, "Waiting for a decoded VideoFrame…");
  let captured = false;
  const stopVideo = connectVideoTexture(state, "/textures/sintel.mp4", {
    async onReady(video) {
      if (captured) return;
      captured = true;
      const texture = await captureVideoFrame(video);
      if (state.disposed === true) {
        texture?.dispose();
        return;
      }
      if (texture) {
        state.videoFrameTexture = texture;
        state.material.map = texture;
        status.set("VideoFrame copied to CPU DataTexture");
      } else {
        status.set("VideoFrame unavailable · live VideoTexture fallback");
      }
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

const frame = new globalThis.VideoFrame(video);
const pixels = new Uint8ClampedArray(frame.displayWidth * frame.displayHeight * 4);
await frame.copyTo(pixels, { format: "RGBA" });
const texture = new EASEL.DataTexture(pixels, frame.displayWidth, frame.displayHeight);
frame.close();
scene.add(new EASEL.Mesh(geometry, new EASEL.BasicMaterial({ map: texture })));`;

export const threeSource = `import * as THREE from "three";

const frame = new VideoFrame(video);
const texture = new THREE.VideoFrameTexture();
texture.setFrame(frame);
scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture })));`;

export const example = { meta, controls, setup, easelSource, threeSource };
