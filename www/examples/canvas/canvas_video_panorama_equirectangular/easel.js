import {
  BasicMaterial,
  CanvasTexture,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  SphereGeometry,
  toRadians,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { createPanoramaCanvas, drawPanoramaFrame } from "./panorama-source.js";

export const meta = {
  id: "canvas_video_panorama_equirectangular",
  upstream: "webgl_video_panorama_equirectangular",
  name: "video / panorama / equirectangular",
  category: "canvas",
  animated: true,
  description:
    "An animated equirectangular panorama is mapped onto the inside of an inverted sphere; drag to look around from its centre.",
  differences: [
    "textures/pano.webm and pano.mp4 carry no licence notice, so both sides substitute a generated 512x256 equirectangular canvas animation (sky, ground, a circling sun and pillars every 30 degrees) drawn each frame and used as a CanvasTexture instead of a VideoTexture.",
    "EASEL caches the panorama at 128x128 and samples it nearest-neighbor with affine warping, so the surroundings are blocky and bend across the 60x40 sphere's faces instead of being filtered and perspective-correct.",
    "EASEL re-reads the canvas only on an explicit texture.update() after needsUpdate is set, so the port does both every frame.",
    "EASEL textures have no colour-space conversion, so the panorama is not tagged SRGBColorSpace.",
    "Pointer listeners are on the canvas with pointer capture instead of on the document, so drags start only on the example.",
  ],
};
export const controls = [];

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

  const camera = new PerspectiveCamera({
    fov: 75,
    aspect: canvas.width / canvas.height,
    near: 0.25,
    far: 10,
  });

  const scene = new Scene();

  const geometry = new SphereGeometry(5, 60, 40);
  // invert the geometry on the x-axis so that all of the faces point inward
  geometry.scale(-1, 1, 1);

  // A generated equirectangular canvas replaces the unlicensed pano.webm video.
  const source = createPanoramaCanvas(canvas.ownerDocument);
  const sourceContext = source?.getContext("2d");
  if (sourceContext) drawPanoramaFrame(sourceContext, 0);

  const texture = new CanvasTexture(source);
  const material = new BasicMaterial({ map: texture, vertexColors: false });

  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

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
    if (sourceContext) {
      drawPanoramaFrame(sourceContext, timestamp);
      texture.needsUpdate = true;
      texture.update();
    }

    lat = Math.max(-85, Math.min(85, lat));
    phi = toRadians(90 - lat);
    theta = toRadians(lon);

    camera.position.x = distance * Math.sin(phi) * Math.cos(theta);
    camera.position.y = distance * Math.cos(phi);
    camera.position.z = distance * Math.sin(phi) * Math.sin(theta);

    camera.updateMatrixWorld();
    camera.lookAt(0, 0, 0);

    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
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

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const geometry = new EASEL.SphereGeometry(5, 60, 40);
geometry.scale(-1, 1, 1);

const texture = new EASEL.CanvasTexture(panoramaCanvas);
const material = new EASEL.BasicMaterial({ map: texture, vertexColors: false });
scene.add(new EASEL.Mesh(geometry, material));

drawPanoramaFrame(panoramaContext, time);
texture.needsUpdate = true;
texture.update();

const phi = EASEL.toRadians(90 - lat);
const theta = EASEL.toRadians(lon);
camera.position.set(
  0.5 * Math.sin(phi) * Math.cos(theta),
  0.5 * Math.cos(phi),
  0.5 * Math.sin(phi) * Math.sin(theta),
);
camera.updateMatrixWorld();
camera.lookAt(0, 0, 0);
renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };
