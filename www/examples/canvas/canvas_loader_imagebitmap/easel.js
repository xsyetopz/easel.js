import {
  BasicMaterial,
  BoxGeometry,
  GridHelper,
  Group,
  ImageBitmapLoader,
  ImageLoader,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Texture,
} from "@/index.js";

import crateBase64 from "../../../../assets/textures/crate.gif.base64?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

// The checked-in crate GIF replaces textures/planets/earth_atmos_2048.jpg,
// whose license is unknown, and a data URL replaces the cache-busted
// relative URL, so loading needs no network.
const textureUrl = `data:image/gif;base64,${crateBase64}`;

export const meta = {
  id: "canvas_loader_imagebitmap",
  upstream: "webgl_loader_imagebitmap",
  name: "loader / imagebitmap",
  category: "canvas",
  animated: true,
  description:
    "Six cubes appear one by one over a rotating grid, three textured through ImageLoader with a red tint and three through ImageBitmapLoader.",
  differences: [
    "Both sides texture the cubes with the checked-in crate.gif instead of earth_atmos_2048.jpg, whose license is unknown, and load it from a data URL without the cache-busting query string.",
    "EASEL's CanvasTexture accepts only a canvas, so the port wraps the HTMLImageElement and the ImageBitmap in a plain Texture and caches it explicitly with needsUpdate and update(), because the EASEL renderer does not refresh textures on its own.",
    "EASEL applies flipY to ImageBitmap sources, unlike WebGL, so the bitmap textures set flipY to false to undo the imageOrientation 'flipY' decode and stay upright like the image textures.",
    "EASEL calls Texture.onUpdate with no argument, so the ImageBitmap is closed through a closure instead of texture.source.data.",
    "EASEL Texture.colorSpace rejects SRGBColorSpace because EASEL samples texture bytes without color conversion, so the assignments are dropped.",
    "EASEL caches the 256x256 crate at 128x128 and samples it nearest-neighbor with affine warping, so the grain is blockier and bends across each face.",
    "Cube positions and rotations are random, so the two sides place their cubes differently.",
    "Edges are aliased because EASEL has no antialiasing.",
  ],
};
export const controls = [];

export function setup(canvas) {
  let disposed = false;
  const timeouts = [];
  const imageLoaders = [];
  const imageBitmapLoaders = [];
  const materials = [];

  function addImageBitmap() {
    const loader = new ImageBitmapLoader();
    imageBitmapLoaders.push(loader);
    loader.setOptions({ imageOrientation: "flipY" }).load(
      textureUrl,
      (imageBitmap) => {
        if (disposed) {
          imageBitmap.close();
          return;
        }

        const texture = new Texture(imageBitmap);
        texture.flipY = false;
        const material = new BasicMaterial({ map: texture });

        // ImageBitmap should be disposed when done with it.

        texture.onUpdate = () => disposeImageBitmap(texture);
        texture.needsUpdate = true;
        texture.update().buildBrightnessLevels();

        addCube(material);
      },
      (p) => {
        console.log(p);
      },
      (e) => {
        if (!disposed) console.log(e);
      },
    );
  }

  function addImage() {
    const loader = new ImageLoader();
    imageLoaders.push(loader);
    loader.crossOrigin = "*";
    loader.load(textureUrl, (image) => {
      if (disposed) return;

      const texture = new Texture(image);
      texture.needsUpdate = true;
      texture.update().buildBrightnessLevels();
      const material = new BasicMaterial({ color: 0xff8888, map: texture });
      addCube(material);
    });
  }

  const geometry = new BoxGeometry();

  function addCube(material) {
    materials.push(material);
    const cube = new Mesh(geometry, material);
    cube.position.set(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
    );
    cube.rotation.set(
      Math.random() * 2 * Math.PI,
      Math.random() * 2 * Math.PI,
      Math.random() * 2 * Math.PI,
    );
    cubes.add(cube);
  }

  // CAMERA

  const camera = new PerspectiveCamera({
    fov: 30,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 1500,
  });
  camera.position.set(0, 4, 7);
  camera.updateMatrixWorld();
  camera.lookAt(0, 0, 0);

  // SCENE

  const scene = new Scene();

  //

  const group = new Group();
  scene.add(group);

  const grid = new GridHelper(4, 12, 0x888888, 0x444444);
  group.add(grid);

  const cubes = new Group();
  group.add(cubes);

  // RENDERER

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  // TESTS

  timeouts.push(setTimeout(addImage, 300));
  timeouts.push(setTimeout(addImage, 600));
  timeouts.push(setTimeout(addImage, 900));
  timeouts.push(setTimeout(addImageBitmap, 1300));
  timeouts.push(setTimeout(addImageBitmap, 1600));
  timeouts.push(setTimeout(addImageBitmap, 1900));

  const animation = createExampleAnimationLoop(() => {
    group.rotation.y = performance.now() / 3000;

    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });

  function disposeImageBitmap(texture) {
    texture.source.data.close();
    texture.onUpdate = undefined; // make sure this callback is executed only once per texture
  }

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
      for (const timeout of timeouts) clearTimeout(timeout);
      for (const loader of imageBitmapLoaders) loader.abort();
      for (const loader of imageLoaders) loader.abort();
      for (const material of materials) {
        material.map?.dispose();
        material.dispose();
      }
      geometry.dispose();
      grid.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

new EASEL.ImageBitmapLoader()
  .setOptions({ imageOrientation: "flipY" })
  .load(url, (imageBitmap) => {
    const texture = new EASEL.Texture(imageBitmap);
    texture.flipY = false;
    texture.onUpdate = () => imageBitmap.close();
    texture.needsUpdate = true;
    texture.update().buildBrightnessLevels();
    cubes.add(new EASEL.Mesh(geometry, new EASEL.BasicMaterial({ map: texture })));
  });

group.add(new EASEL.GridHelper(4, 12, 0x888888, 0x444444));
group.rotation.y = performance.now() / 3000;
renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };
