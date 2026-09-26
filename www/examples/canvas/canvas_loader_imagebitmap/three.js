// Adapted from three.js r186 examples/webgl_loader_imagebitmap.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";

import crateBase64 from "../../../../assets/textures/crate.gif.base64?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

// The checked-in crate GIF replaces textures/planets/earth_atmos_2048.jpg,
// whose license is unknown, and a data URL replaces the cache-busted
// relative URL, so loading needs no network.
const textureUrl = `data:image/gif;base64,${crateBase64}`;

export function setup(canvas) {
  let disposed = false;
  const timeouts = [];
  const imageLoaders = [];
  const imageBitmapLoaders = [];
  const materials = [];

  function addImageBitmap() {
    const loader = new THREE.ImageBitmapLoader();
    imageBitmapLoaders.push(loader);
    loader.setOptions({ imageOrientation: "flipY" }).load(
      textureUrl,
      (imageBitmap) => {
        if (disposed) {
          imageBitmap.close();
          return;
        }

        const texture = new THREE.CanvasTexture(imageBitmap);
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.MeshBasicMaterial({ map: texture });

        // ImageBitmap should be disposed when done with it.

        texture.onUpdate = disposeImageBitmap;

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
    const loader = new THREE.ImageLoader();
    imageLoaders.push(loader);
    loader.setCrossOrigin("*").load(textureUrl, (image) => {
      if (disposed) return;

      const texture = new THREE.CanvasTexture(image);
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.MeshBasicMaterial({
        color: 0xff8888,
        map: texture,
      });
      addCube(material);
    });
  }

  const geometry = new THREE.BoxGeometry();

  function addCube(material) {
    materials.push(material);
    const cube = new THREE.Mesh(geometry, material);
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

  const camera = new THREE.PerspectiveCamera(
    30,
    canvas.width / canvas.height,
    1,
    1500,
  );
  camera.position.set(0, 4, 7);
  camera.lookAt(0, 0, 0);

  // SCENE

  const scene = new THREE.Scene();

  //

  const group = new THREE.Group();
  scene.add(group);

  const grid = new THREE.GridHelper(4, 12, 0x888888, 0x444444);
  group.add(grid);

  const cubes = new THREE.Group();
  group.add(cubes);

  // RENDERER

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  // TESTS

  timeouts.push(setTimeout(addImage, 300));
  timeouts.push(setTimeout(addImage, 600));
  timeouts.push(setTimeout(addImage, 900));
  timeouts.push(setTimeout(addImageBitmap, 1300));
  timeouts.push(setTimeout(addImageBitmap, 1600));
  timeouts.push(setTimeout(addImageBitmap, 1900));

  const animation = createExampleAnimationLoop(() => {
    group.rotation.y = performance.now() / 3000;

    renderer.render(scene, camera);
  });

  function disposeImageBitmap(texture) {
    texture.source.data.close();
    texture.onUpdate = null; // make sure this callback is executed only once per texture
  }

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height, false);
    },
    cleanup() {
      disposed = true;
      animation.cleanup();
      for (const timeout of timeouts) clearTimeout(timeout);
      for (const loader of imageBitmapLoaders) loader.abort();
      for (const loader of imageLoaders) loader.abort();
      for (const material of materials) {
        material.map.dispose();
        material.dispose();
      }
      geometry.dispose();
      grid.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
