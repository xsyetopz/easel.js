import { Side, SphereGeometry, Vector3 } from "@/index.js";
import {
  addMediaStatus,
  connectVideoTexture,
  createMediaScene,
  disposeMediaState,
  startMediaLoop,
} from "./media_helpers.js";

export const meta = {
  id: "webgpu_video_panorama",
  name: "Video Panorama",
  category: "canvas",
  description:
    "An equirectangular video is viewed from inside a CPU sphere with pointer look controls; Canvas2D keeps the video sampling path and omits the WebGPU shader stage.",
};

export const controls = [];

function createPanoramaControls(canvas) {
  let isUserInteracting = false;
  let pointerDownX = 0;
  let pointerDownY = 0;
  let pointerDownLon = 0;
  let pointerDownLat = 0;
  let lon = 0;
  let lat = 0;
  const onPointerDown = (event) => {
    isUserInteracting = true;
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
    pointerDownLon = lon;
    pointerDownLat = lat;
  };
  const onPointerMove = (event) => {
    if (!isUserInteracting) return;
    lon = (pointerDownX - event.clientX) * 0.1 + pointerDownLon;
    lat = (pointerDownY - event.clientY) * 0.1 + pointerDownLat;
  };
  const onPointerUp = () => {
    isUserInteracting = false;
  };
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  return {
    update(camera) {
      lat = Math.max(-85, Math.min(85, lat));
      const phi = ((90 - lat) * Math.PI) / 180;
      const theta = (lon * Math.PI) / 180;
      camera.position.set(
        0.5 * Math.sin(phi) * Math.cos(theta),
        0.5 * Math.cos(phi),
        0.5 * Math.sin(phi) * Math.sin(theta),
      );
      camera.lookAt(new Vector3(0, 0, 0));
    },
    cleanup() {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
    },
  };
}

export function setup(canvas) {
  const state = createMediaScene(canvas, new SphereGeometry(5, 48, 32), {
    background: 0x080d17,
    cameraPosition: [0, 0, 0.5],
    target: [0, 0, 0],
    fov: 75,
    side: Side.Double,
    seed: 41,
  });
  state.mesh.scale.x = -1;
  const status = addMediaStatus(canvas, "Loading video panorama…");
  const panoramaControls = createPanoramaControls(canvas);

  const stopVideo = connectVideoTexture(state, "/textures/pano.mp4", {
    onReady() {
      status.set("Video panorama · CPU affine texture sampling");
    },
    onError() {
      status.set("Panorama video unavailable · procedural fallback");
    },
  });
  const stopLoop = startMediaLoop(state, () =>
    panoramaControls.update(state.camera),
  );
  return {
    cleanup() {
      panoramaControls.cleanup();
      disposeMediaState(state, stopVideo, stopLoop, status);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const video = globalThis.document.createElement("video");
video.loop = true;
video.muted = true;
video.playsInline = true;
video.src = "/textures/pano.mp4";
video.play();
const texture = new EASEL.VideoTexture(video);
const geometry = new EASEL.SphereGeometry(5, 60, 40);
geometry.scale(-1, 1, 1);
const panorama = new EASEL.Mesh(
  geometry,
  new EASEL.BasicMaterial({ map: texture, side: EASEL.Side.Double }),
);`;

export const threeSource = `import * as THREE from "three";

const video = document.createElement("video");
video.loop = true;
video.muted = true;
video.playsInline = true;
video.src = "textures/pano.mp4";
video.play();
const texture = new THREE.VideoTexture(video);
const geometry = new THREE.SphereGeometry(5, 60, 40);
geometry.scale(-1, 1, 1);
const panorama = new THREE.Mesh(
  geometry,
  new THREE.MeshBasicMaterial({ map: texture }),
);`;

export const example = { meta, controls, setup, easelSource, threeSource };
