import {
  BasicMaterial,
  clamp,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  SphereGeometry,
  TextureLoader,
  toRadians,
} from "@/index.js";

import panoramaBase64 from "../../../../assets/textures/equirectangular/spruit_sunrise_2k.hdr.jpg.base64?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "canvas_panorama_equirectangular",
  upstream: "webgl_panorama_equirectangular",
  name: "panorama / equirectangular",
  category: "canvas",
  animated: true,
  description:
    "An equirectangular panorama mapped inside an inverted sphere; the view pans slowly, drag to look around and scroll to zoom.",
  differences: [
    "Both sides show Greg Zaal's CC0 Poly Haven panorama spruit_sunrise_2k.hdr.jpg from the three.js repository instead of 2294472375_24a3b8ef46_o.jpg, whose license is unknown.",
    "EASEL caches the 2048x1024 panorama at 128x128 and samples it nearest-neighbor with affine warping, so the full-screen view is very blocky and bends across each sphere face instead of being filtered and perspective-correct.",
    "EASEL's TextureLoader.load returns nothing, so the port assigns the map in the load callback, and the sphere draws untextured white until the data-URL JPEG is decoded.",
    "EASEL Texture.colorSpace rejects SRGBColorSpace because EASEL samples texture bytes without color conversion, so the assignment is dropped.",
    "Pointer move, pointer up and wheel listeners are attached to the canvas, with pointer capture, instead of the document, so dragging and zooming only start over the example.",
  ],
};
export const controls = [];

export function setup(canvas) {
  let disposed = false;
  let isUserInteracting = false,
    onPointerDownMouseX = 0,
    onPointerDownMouseY = 0,
    lon = 0,
    onPointerDownLon = 0,
    lat = 0,
    onPointerDownLat = 0,
    phi = 0,
    theta = 0;

  const camera = new PerspectiveCamera({
    fov: 75,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 1100,
  });

  const scene = new Scene();

  const geometry = new SphereGeometry(500, 60, 40);
  // invert the geometry on the x-axis so that all of the faces point inward
  geometry.scale(-1, 1, 1);

  const material = new BasicMaterial();

  // The checked-in CC0 Poly Haven panorama replaces textures/2294472375_24a3b8ef46_o.jpg,
  // whose license is unknown, and a data URL keeps loading off the network.
  new TextureLoader().load(
    `data:image/jpeg;base64,${panoramaBase64}`,
    (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      material.map = texture;
    },
  );

  const mesh = new Mesh(geometry, material);

  scene.add(mesh);

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  const previousTouchAction = canvas.style?.touchAction;
  if (canvas.style) canvas.style.touchAction = "none";
  canvas.addEventListener("pointerdown", onPointerDown);

  canvas.addEventListener("wheel", onDocumentMouseWheel);

  function onPointerDown(event) {
    if (event.isPrimary === false) return;

    isUserInteracting = true;

    onPointerDownMouseX = event.clientX;
    onPointerDownMouseY = event.clientY;

    onPointerDownLon = lon;
    onPointerDownLat = lat;

    canvas.setPointerCapture(event.pointerId);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
  }

  function onPointerMove(event) {
    if (event.isPrimary === false) return;

    lon = (onPointerDownMouseX - event.clientX) * 0.1 + onPointerDownLon;
    lat = (event.clientY - onPointerDownMouseY) * 0.1 + onPointerDownLat;
  }

  function onPointerUp(event) {
    if (event.isPrimary === false) return;

    isUserInteracting = false;

    canvas.releasePointerCapture(event.pointerId);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
  }

  function onDocumentMouseWheel(event) {
    const fov = camera.fov + event.deltaY * 0.05;

    camera.fov = clamp(fov, 10, 75);

    camera.updateProjectionMatrix();
  }

  const animation = createExampleAnimationLoop(() => {
    if (isUserInteracting === false) {
      lon += 0.1;
    }

    lat = Math.max(-85, Math.min(85, lat));
    phi = toRadians(90 - lat);
    theta = toRadians(lon);

    const x = 500 * Math.sin(phi) * Math.cos(theta);
    const y = 500 * Math.cos(phi);
    const z = 500 * Math.sin(phi) * Math.sin(theta);

    camera.updateMatrixWorld();
    camera.lookAt(x, y, z);

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
      disposed = true;
      animation.cleanup();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onDocumentMouseWheel);
      if (canvas.style) canvas.style.touchAction = previousTouchAction;
      geometry.dispose();
      material.map?.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const geometry = new EASEL.SphereGeometry(500, 60, 40);
geometry.scale(-1, 1, 1);

const material = new EASEL.BasicMaterial();
new EASEL.TextureLoader().load(panoramaUrl, (texture) => {
  material.map = texture;
});
scene.add(new EASEL.Mesh(geometry, material));

lon += 0.1;
phi = EASEL.toRadians(90 - lat);
theta = EASEL.toRadians(lon);
camera.updateMatrixWorld();
camera.lookAt(
  500 * Math.sin(phi) * Math.cos(theta),
  500 * Math.cos(phi),
  500 * Math.sin(phi) * Math.sin(theta),
);
renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };
