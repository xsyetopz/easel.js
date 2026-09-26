import {
  BasicMaterial,
  Mesh,
  OrbitControls,
  PerspectiveCamera,
  PlaneGeometry,
  Renderer,
  Scene,
  VideoTexture,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "canvas_materials_video_webcam",
  upstream: "webgl_materials_video_webcam",
  name: "materials / video / webcam",
  category: "canvas",
  animated: true,
  description:
    "Click the canvas to stream the webcam onto 128 planes arranged on a sphere around the camera, then drag to look around.",
  differences: [
    "Both sides request the camera on the first click on their own canvas instead of at page load, so the side-by-side page never prompts on its own; each side opens its own stream.",
    "EASEL caches each video frame at 128x128 and samples it nearest-neighbor with affine warping, so the webcam image is much blockier than the filtered three.js texture.",
    "EASEL re-reads the video only when texture.update() runs, so the port calls it once per frame, where three.js refreshes the VideoTexture on its own.",
    "EASEL textures have no colour-space conversion, so the video pixels are used as-is instead of being tagged SRGBColorSpace.",
    "Before a stream arrives, three.js samples an empty texture and draws the planes black on the black background, while EASEL draws them in the material's white base colour until the first video frame is cached.",
  ],
};
export const controls = [];

export function setup(canvas) {
  let stream;
  let requested = false;
  let disposed = false;

  const camera = new PerspectiveCamera({
    fov: 60,
    aspect: canvas.width / canvas.height,
    near: 0.1,
    far: 100,
  });
  camera.position.z = 0.01;

  const scene = new Scene();

  // The upstream page declares a hidden <video id="video" autoplay playsinline>.
  const video = canvas.ownerDocument?.createElement?.("video");
  if (video) {
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
  }

  const texture = new VideoTexture(video);

  const geometry = new PlaneGeometry(16, 9);
  geometry.scale(0.5, 0.5, 0.5);
  const material = new BasicMaterial({ map: texture, vertexColors: false });

  const count = 128;
  const radius = 32;

  for (let i = 1, l = count; i <= l; i++) {
    const phi = Math.acos(-1 + (2 * i) / l);
    const theta = Math.sqrt(l * Math.PI) * phi;

    const mesh = new Mesh(geometry, material);
    mesh.position.setFromSphericalCoords(radius, phi, theta);
    mesh.lookAt(camera.position);
    scene.add(mesh);
  }

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  const orbit = new OrbitControls(camera, canvas);
  orbit.enableZoom = false;
  orbit.enablePan = false;

  function stopStream() {
    for (const track of stream?.getTracks() ?? []) track.stop();
    stream = undefined;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
  }

  // The camera is requested on the first click on the canvas instead of at
  // page load, so the side-by-side page never prompts on its own.
  function onClick() {
    if (requested || !video) return;
    requested = true;

    if (globalThis.navigator?.mediaDevices?.getUserMedia) {
      const constraints = {
        video: { width: 1280, height: 720, facingMode: "user" },
      };

      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((mediaStream) => {
          stream = mediaStream;
          if (disposed) {
            stopStream();
            return;
          }

          // apply the stream to the video element used in the texture

          video.srcObject = mediaStream;
          video.play().catch(() => {});
        })
        .catch((error) => {
          console.error("Unable to access the camera/webcam.", error);
        });
    } else {
      console.error("MediaDevices interface not available.");
    }
  }
  canvas.addEventListener("click", onClick);

  const animation = createExampleAnimationLoop(() => {
    // EASEL re-samples the video only on an explicit update.
    texture.update();

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
      canvas.removeEventListener("click", onClick);
      stopStream();
      orbit.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const texture = new EASEL.VideoTexture(video);
const geometry = new EASEL.PlaneGeometry(16, 9);
geometry.scale(0.5, 0.5, 0.5);
const material = new EASEL.BasicMaterial({ map: texture, vertexColors: false });

for (let i = 1; i <= 128; i++) {
  const phi = Math.acos(-1 + (2 * i) / 128);
  const theta = Math.sqrt(128 * Math.PI) * phi;
  const mesh = new EASEL.Mesh(geometry, material);
  mesh.position.setFromSphericalCoords(32, phi, theta);
  mesh.lookAt(camera.position);
  scene.add(mesh);
}

canvas.addEventListener("click", async () => {
  video.srcObject = await navigator.mediaDevices.getUserMedia({ video: true });
  video.play();
});

texture.update();
renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };
