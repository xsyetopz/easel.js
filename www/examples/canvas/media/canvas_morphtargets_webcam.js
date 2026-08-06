import {
  Attribute,
  BasicMaterial,
  LambertMaterial,
  Mesh,
  PlaneGeometry,
  SphereGeometry,
} from "@/index.js";
import {
  addMediaStatus,
  connectVideoTexture,
  createMediaScene,
  disposeMediaState,
  requestWebcam,
  startMediaLoop,
} from "./media_helpers.js";

export const meta = {
  id: "webgl_morphtargets_webcam",
  name: "Morph targets webcam",
  category: "canvas",
  description:
    "A webcam video plane and authored CPU face morphs reproduce the browser-media path without requiring a GPU face detector or external model asset.",
};

export const controls = [];

function createMorphFace() {
  const geometry = new SphereGeometry(1.45, 24, 16);
  const position = geometry.getAttribute("position");
  const base = new Float32Array(position?.array ?? 0);
  const smile = new Float32Array(base);
  const blink = new Float32Array(base);
  for (let index = 0; index < base.length; index += 3) {
    const x = base[index];
    const y = base[index + 1];
    const z = base[index + 2];
    const mouth = z > 0.75 && y < -0.05;
    const eyeBand = z > 0.9 && Math.abs(y - 0.38) < 0.22;
    smile[index] = x;
    smile[index + 1] = y + (mouth ? Math.abs(x) * 0.14 : 0);
    smile[index + 2] = z + (mouth ? 0.05 : 0);
    blink[index] = x;
    blink[index + 1] = eyeBand ? y * 0.86 : y;
    blink[index + 2] = z;
  }
  const smileAttribute = new Attribute(smile, 3);
  smileAttribute.name = "smile";
  const blinkAttribute = new Attribute(blink, 3);
  blinkAttribute.name = "blink";
  geometry.morphAttributes = { position: [smileAttribute, blinkAttribute] };
  const face = new Mesh(geometry, new LambertMaterial({ color: 0xe1a17f }));
  const eyeMaterial = new BasicMaterial({ color: 0x151a28 });
  const eyes = [-0.52, 0.52].map((x) => {
    const eye = new Mesh(new SphereGeometry(0.17, 12, 8), eyeMaterial);
    eye.position.set(x, 0.42, 1.35);
    return eye;
  });
  return { geometry, position, base, smile, blink, face, eyeMaterial, eyes };
}

function connectWebcam(state, status) {
  const stopVideo = connectVideoTexture(state, undefined, {
    onReady() {
      status.set("Webcam video · CPU morph target preview");
    },
    onError() {
      status.set("Webcam unavailable · CPU morph target preview");
    },
  });
  const webcamVideo = Reflect.get(state, "video");
  const stopWebcam = webcamVideo
    ? requestWebcam(
        webcamVideo,
        () => status.set("Webcam ready · CPU morph target preview"),
        () =>
          status.set(
            "Webcam permission unavailable · CPU morph target preview",
          ),
      )
    : () => undefined;
  return () => {
    stopWebcam();
    stopVideo?.();
  };
}

function applyMorph(position, base, targets, weights) {
  if (!position) return;
  for (let vertex = 0; vertex < position.count; vertex++) {
    const offset = vertex * 3;
    let x = base[offset] ?? 0;
    let y = base[offset + 1] ?? 0;
    let z = base[offset + 2] ?? 0;
    for (let targetIndex = 0; targetIndex < targets.length; targetIndex++) {
      const target = targets[targetIndex];
      const weight = weights[targetIndex] ?? 0;
      x += ((target[offset] ?? x) - (base[offset] ?? x)) * weight;
      y += ((target[offset + 1] ?? y) - (base[offset + 1] ?? y)) * weight;
      z += ((target[offset + 2] ?? z) - (base[offset + 2] ?? z)) * weight;
    }
    position.setXYZ(vertex, x, y, z);
  }
  position.needsUpdate = true;
}

export function setup(canvas) {
  const state = createMediaScene(canvas, new PlaneGeometry(8, 4.5), {
    background: 0x666666,
    cameraPosition: [0, 0, 6],
    target: [0, 0, 0],
    fov: 63,
    seed: 53,
  });
  state.mesh.position.z = -3;
  state.material.layer = -1;
  state.material.depthTest = false;
  state.material.depthWrite = false;
  const morph = createMorphFace();
  morph.face.position.z = 0.2;
  state.scene.add(morph.face);
  for (const eye of morph.eyes) {
    eye.position.z += 0.2;
    state.scene.add(eye);
  }
  const status = addMediaStatus(
    canvas,
    "Requesting webcam for CPU morph preview…",
  );
  const stopWebcam = connectWebcam(state, status);
  const stopLoop = startMediaLoop(state, (frame) => {
    const smileWeight = (Math.sin(frame.elapsedTime * 1.25) + 1) * 0.5;
    const blinkWeight = Math.max(0, Math.sin(frame.elapsedTime * 2.4) ** 32);
    applyMorph(
      morph.position,
      morph.base,
      [morph.smile, morph.blink],
      [smileWeight, blinkWeight],
    );
    morph.face.rotation.y = Math.sin(frame.elapsedTime * 0.28) * 0.2;
    morph.eyes[0].rotation.z = blinkWeight * 0.08;
    morph.eyes[1].rotation.z = -blinkWeight * 0.08;
    morph.geometry.computeVertexNormals();
    morph.geometry.computeBoundingSphere();
  });
  return {
    cleanup() {
      stopWebcam();
      disposeMediaState(state, undefined, stopLoop, status);
      morph.face.material?.dispose();
      morph.eyeMaterial.dispose();
      morph.geometry.dispose();
      for (const eye of morph.eyes) eye.geometry?.dispose();
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
const videoMesh = new EASEL.Mesh(
  new EASEL.PlaneGeometry(8, 4.5),
  new EASEL.BasicMaterial({ map: texture, depthTest: false, depthWrite: false }),
);
const face = new EASEL.Mesh(faceGeometry, new EASEL.LambertMaterial({ color: 0xe1a17f }));
applyMorph(faceGeometry, base, targets, weights);
video.play();`;

export const threeSource = `import * as THREE from "three";
import { FaceLandmarker, FilesetResolver } from "https:${"/"}${"/"}cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35";

const video = document.createElement("video");
video.muted = true;
video.playsInline = true;
const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
video.srcObject = stream;
const texture = new THREE.VideoTexture(video);
const videoMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ map: texture, depthTest: false, depthWrite: false }),
);
const face = new THREE.Mesh(faceGeometry, new THREE.MeshNormalMaterial());
const faceLandmarker = await FaceLandmarker.createFromOptions(
  await FilesetResolver.forVisionTasks("https:${"/"}${"/"}cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"),
  { outputFaceBlendshapes: true, runningMode: "VIDEO", numFaces: 1 },
);`;

export const example = { meta, controls, setup, easelSource, threeSource };
