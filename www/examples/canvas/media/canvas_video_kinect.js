import { Geometry, Points, PointsMaterial, Vector3 } from "@/index.js";
import {
  addMediaStatus,
  connectVideoTexture,
  createMediaScene,
  disposeMediaState,
  startMediaLoop,
} from "./media_helpers.js";

export const meta = {
  id: "webgl_video_kinect",
  name: "Kinect video point cloud",
  category: "canvas",
  description:
    "A decimated Kinect video frame drives CPU point positions and vertex colors; the source shader depth projection is represented by Canvas2D geometry updates.",
};

export const controls = [];

const GRID_WIDTH = 80;
const GRID_HEIGHT = 60;
const NEAR_CLIPPING = 850;
const FAR_CLIPPING = 4000;
const X_TO_Z = 1.11146;
const Y_TO_Z = 0.83359;

function createPointGeometry() {
  const positions = new Float32Array(GRID_WIDTH * GRID_HEIGHT * 3);
  const colors = new Float32Array(GRID_WIDTH * GRID_HEIGHT * 3);
  for (let row = 0; row < GRID_HEIGHT; row++) {
    for (let column = 0; column < GRID_WIDTH; column++) {
      const index = row * GRID_WIDTH + column;
      const offset = index * 3;
      const u = column / Math.max(1, GRID_WIDTH - 1);
      const v = row / Math.max(1, GRID_HEIGHT - 1);
      const wave = Math.sin((column + row) * 0.2) * 0.5 + 0.5;
      positions[offset] = (u - 0.5) * 1500;
      positions[offset + 1] = (0.5 - v) * 1100;
      positions[offset + 2] = -2200 + wave * 450;
      colors[offset] = 0.2 + wave * 0.25;
      colors[offset + 1] = 0.35 + wave * 0.35;
      colors[offset + 2] = 0.65 + wave * 0.25;
    }
  }
  const geometry = new Geometry();
  geometry.setPositions(positions);
  geometry.setColors(colors);
  geometry.computeBoundingSphere();
  return geometry;
}

function updatePointCloud(state, position, colors) {
  const image = state.videoTexture?.data;
  if (!image) return;
  const width = image.width;
  const height = image.height;
  const pixels = image.data;
  for (let row = 0; row < GRID_HEIGHT; row++) {
    for (let column = 0; column < GRID_WIDTH; column++) {
      const index = row * GRID_WIDTH + column;
      const u = column / Math.max(1, GRID_WIDTH - 1);
      const v = row / Math.max(1, GRID_HEIGHT - 1);
      const sourceX = Math.min(width - 1, Math.floor(u * width));
      const sourceY = Math.min(height - 1, Math.floor(v * height));
      const sourceOffset = (sourceY * width + sourceX) * 4;
      const red = pixels[sourceOffset] ?? 0;
      const green = pixels[sourceOffset + 1] ?? 0;
      const blue = pixels[sourceOffset + 2] ?? 0;
      const depth = (red + green + blue) / (255 * 3);
      const z = (1 - depth) * (FAR_CLIPPING - NEAR_CLIPPING) + NEAR_CLIPPING;
      position.setXYZ(
        index,
        (u - 0.5) * z * X_TO_Z,
        (0.5 - v) * z * Y_TO_Z,
        -z + 1000,
      );
      colors.setXYZ(index, red / 255, green / 255, blue / 255);
    }
  }
  position.needsUpdate = true;
  colors.needsUpdate = true;
  state.geometry.computeBoundingSphere();
}

export function setup(canvas) {
  const geometry = createPointGeometry();
  const state = createMediaScene(canvas, geometry, {
    background: 0x101722,
    cameraPosition: [0, 0, 500],
    target: [0, 0, -1000],
    fov: 50,
    seed: 47,
  });
  state.scene.remove(state.mesh);
  state.material.dispose();
  const pointsMaterial = new PointsMaterial({
    color: 0xffffff,
    size: 2,
    transparent: true,
    opacity: 1,
    depthTest: false,
    depthWrite: false,
  });
  const points = new Points(geometry, pointsMaterial);
  state.mesh = points;
  state.material = pointsMaterial;
  state.scene.add(points);
  const status = addMediaStatus(canvas, "Loading Kinect video…");
  const mouse = new Vector3(0, 0, 1);
  const center = new Vector3(0, 0, -1000);
  const onPointerMove = (event) => {
    const rect = canvas.getBoundingClientRect?.();
    const width = rect?.width || canvas.width || 1;
    const height = rect?.height || canvas.height || 1;
    const left = rect?.left || 0;
    const top = rect?.top || 0;
    mouse.x = (event.clientX - left - width * 0.5) * 8;
    mouse.y = (event.clientY - top - height * 0.5) * 8;
  };
  canvas.addEventListener("pointermove", onPointerMove);
  const stopVideo = connectVideoTexture(state, "/textures/kinect.webm", {
    onReady() {
      state.material.map = undefined;
      status.set("Kinect video · CPU depth point cloud");
    },
    onError() {
      status.set("Kinect video unavailable · procedural point cloud");
    },
  });
  const position = geometry.getAttribute("position");
  const colors = geometry.getAttribute("color");
  const stopLoop = startMediaLoop(state, () => {
    state.videoTexture?.update();
    if (position && colors) updatePointCloud(state, position, colors);
    state.camera.position.x += (mouse.x - state.camera.position.x) * 0.05;
    state.camera.position.y += (-mouse.y - state.camera.position.y) * 0.05;
    state.camera.lookAt(center);
  });
  return {
    cleanup() {
      canvas.removeEventListener("pointermove", onPointerMove);
      disposeMediaState(state, stopVideo, stopLoop, status);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const video = globalThis.document.createElement("video");
video.loop = true;
video.muted = true;
video.playsInline = true;
video.src = "/textures/kinect.webm";
const texture = new EASEL.VideoTexture(video);
const geometry = new EASEL.Geometry();
const points = new EASEL.Points(
  geometry,
  new EASEL.PointsMaterial({ color: 0xffffff, size: 2 }),
);
for (const vertex of vertices) {
  const depth = sampleVideo(texture, vertex.u, vertex.v);
  vertex.position.z = -depth + 1000;
}
geometry.computeBoundingSphere();`;

export const threeSource = `import * as THREE from "three";

const video = document.createElement("video");
video.loop = true;
video.muted = true;
video.playsInline = true;
video.src = "textures/kinect.webm";
const texture = new THREE.VideoTexture(video);
const geometry = new THREE.BufferGeometry();
const points = new THREE.Points(geometry, new THREE.ShaderMaterial({
  uniforms: { map: { value: texture }, pointSize: { value: 2 } },
  transparent: true,
}));
video.play();`;

export const example = { meta, controls, setup, easelSource, threeSource };
