import {
  BasicMaterial,
  DataTexture,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  SphereGeometry,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

// EASEL clamps textures to 128 x 128 texels.
const IMAGE_SIZE = 128;

export const meta = {
  id: "canvas_test_memory",
  upstream: "webgl_test_memory",
  name: "test / memory",
  category: "canvas",
  animated: true,
  description:
    "Create, render, and dispose a new random wireframe sphere, material, and solid-color texture every frame to exercise resource cleanup.",
  differences: [
    "EASEL wireframe lines ignore material.map and draw in material.color, so the port also sets the material color to the random texture color; otherwise the white lines would vanish on the white background.",
    "Each frame's texture is a 128 x 128 DataTexture filled with the random color instead of a 256 x 256 CanvasTexture, because EASEL clamps textures to 128 texels and the example must run without a DOM document.",
  ],
};
export const controls = [];

export function setup(canvas) {
  const camera = new PerspectiveCamera({
    fov: 60,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 10000,
  });
  camera.position.z = 200;

  const scene = new Scene();
  scene.background = 0xffffff;

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  function createImage(red, green, blue) {
    const data = new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4);
    for (let offset = 0; offset < data.length; offset += 4) {
      data[offset] = red;
      data[offset + 1] = green;
      data[offset + 2] = blue;
      data[offset + 3] = 255;
    }
    return data;
  }

  //

  const animation = createExampleAnimationLoop(() => {
    const geometry = new SphereGeometry(
      50,
      Math.random() * 64,
      Math.random() * 32,
    );

    const red = Math.floor(Math.random() * 256);
    const green = Math.floor(Math.random() * 256);
    const blue = Math.floor(Math.random() * 256);
    const texture = new DataTexture(
      createImage(red, green, blue),
      IMAGE_SIZE,
      IMAGE_SIZE,
    );
    texture.needsUpdate = true;

    const material = new BasicMaterial({
      map: texture,
      color: (red << 16) | (green << 8) | blue,
      wireframe: true,
    });

    const mesh = new Mesh(geometry, material);

    scene.add(mesh);

    renderer.prepare(scene, camera);
    renderer.render(scene, camera);

    scene.remove(mesh);

    // clean up

    geometry.dispose();
    material.dispose();
    texture.dispose();
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
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const geometry = new EASEL.SphereGeometry(50, Math.random() * 64, Math.random() * 32);
const texture = new EASEL.DataTexture(pixels, 128, 128);
const material = new EASEL.BasicMaterial({ map: texture, color, wireframe: true });
const mesh = new EASEL.Mesh(geometry, material);

scene.add(mesh);
renderer.prepare(scene, camera);
renderer.render(scene, camera);
scene.remove(mesh);

geometry.dispose();
material.dispose();
texture.dispose();`;

export const example = { meta, controls, setup, easelSource };
