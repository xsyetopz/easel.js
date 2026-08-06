import {
  BasicMaterial,
  DataTexture,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Side,
  SphereGeometry,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_panorama_equirectangular",
  name: "Equirectangular Panorama",
  category: "canvas",
  description:
    "A textured interior sphere uses a bounded DataTexture and double-sided CPU sampling instead of an environment map.",
};

export const controls = [];

function panoramaTexture(width = 64, height = 32) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const latitude = y / Math.max(1, height - 1);
    for (let x = 0; x < width; x++) {
      const longitude = x / width;
      const offset = (y * width + x) * 4;
      data[offset] = Math.round(25 + 95 * (1 - latitude));
      data[offset + 1] = Math.round(62 + 130 * (1 - latitude) + 35 * longitude);
      data[offset + 2] = Math.round(120 + 90 * (1 - latitude));
      data[offset + 3] = 255;
    }
  }
  return new DataTexture(data, width, height);
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x0a0f1b;
  const camera = new PerspectiveCamera({
    fov: 70,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0, 0);
  camera.lookAt(new Vector3(0, 0, -1));
  const renderer = new Renderer({ canvas, width, height });

  const texture = panoramaTexture();
  const panorama = new Mesh(
    new SphereGeometry(8, 32, 16),
    new BasicMaterial({ map: texture, side: Side.Double }),
  );
  scene.add(panorama);
  const clock = new Timer();
  let animationFrame;
  function animate(timestamp) {
    animationFrame = requestAnimationFrame(animate);
    clock.update(timestamp);
    panorama.rotation.y = clock.elapsedTime * 0.08;
    camera.rotation.y = Math.sin(clock.elapsedTime * 0.15) * 0.18;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
      texture.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const texture = new EASEL.DataTexture(panoramaPixels, 64, 32);
const panorama = new EASEL.Mesh(new EASEL.SphereGeometry(8, 32, 16),
  new EASEL.BasicMaterial({ map: texture, side: EASEL.Side.Double }));`;

export const threeSource = `import * as THREE from "three";

const texture = new THREE.TextureLoader().load("panorama.jpg");
const panorama = new THREE.Mesh(new THREE.SphereGeometry(8, 32, 16),
  new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide }));`;

export const example = { meta, controls, setup, easelSource, threeSource };
