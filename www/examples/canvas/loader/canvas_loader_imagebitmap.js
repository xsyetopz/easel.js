import {
  AmbientLight,
  BasicMaterial,
  BoxGeometry,
  DataTexture,
  Group,
  ImageBitmapLoader,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Texture,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_loader_imagebitmap",
  name: "ImageBitmap loader",
  category: "canvas",
  description:
    "Loads a deterministic image through ImageBitmap when available and samples it with the CPU Canvas2D renderer.",
};
export const controls = [];

const IMAGE_URI = `data:image/svg+xml,${globalThis.encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" fill="#17233d"/><circle cx="16" cy="16" r="11" fill="#5da9e9"/><path d="M5 17c5-5 12-6 22-2-3 6-8 10-14 11-4-2-7-5-8-9Z" fill="#f0a34a"/><circle cx="11" cy="12" r="2" fill="#fff"/></svg>',
)}`;

function makeFallbackTexture() {
  const width = 32;
  const height = 32;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const index = (row * width + column) * 4;
      const wave = Math.sin((column + row) * 0.35) * 16;
      data[index] = Math.max(0, Math.min(255, 25 + wave));
      data[index + 1] = Math.max(0, Math.min(255, 50 + wave));
      data[index + 2] = Math.max(0, Math.min(255, 95 + wave));
      data[index + 3] = 255;
    }
  }
  const texture = new DataTexture(data, width, height);
  texture.update().buildBrightnessLevels();
  return texture;
}

function textureFromBitmap(bitmap) {
  const texture = new Texture(bitmap);
  texture.flipY = false;
  texture.needsUpdate = true;
  texture.update().buildBrightnessLevels();
  return texture;
}

function addTexturedCube({
  group,
  geometry,
  texture,
  position,
  color = 0xffffff,
}) {
  const material = new BasicMaterial({ map: texture, color });
  const cube = new Mesh(geometry, material);
  cube.position.copy(position);
  cube.rotation.set(0.2, -0.35, 0.1);
  group.add(cube);
  return { cube, material };
}

function createRenderState(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x101622;
  const camera = new PerspectiveCamera({
    fov: 38,
    aspect: width / height,
    near: 0.1,
    far: 50,
  });
  camera.position.set(0, 0.3, 6.5);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.8));

  const group = new Group();
  scene.add(group);
  const geometry = new BoxGeometry(1.65, 1.65, 1.65);
  const fallbackTexture = makeFallbackTexture();
  const fallback = addTexturedCube({
    group,
    geometry,
    texture: fallbackTexture,
    position: new Vector3(-1.05, 0, 0),
    color: 0xffd7a3,
  });
  return {
    scene,
    camera,
    renderer,
    group,
    geometry,
    fallbackTexture,
    fallback,
    bitmapTexture: undefined,
    bitmapMaterial: undefined,
    bitmap: undefined,
    bitmapCube: undefined,
    loader: undefined,
    disposed: false,
  };
}

function addBitmapCube(state, imageBitmap) {
  if (state.disposed) {
    imageBitmap.close?.();
    return;
  }
  state.bitmap = imageBitmap;
  state.bitmapTexture = textureFromBitmap(imageBitmap);
  const added = addTexturedCube({
    group: state.group,
    geometry: state.geometry,
    texture: state.bitmapTexture,
    position: new Vector3(1.05, 0, 0),
  });
  state.bitmapCube = added.cube;
  state.bitmapMaterial = added.material;
  imageBitmap.close?.();
  state.bitmap = undefined;
}

function addFallbackCube(state) {
  if (state.disposed || state.bitmapCube) return;
  const added = addTexturedCube({
    group: state.group,
    geometry: state.geometry,
    texture: state.fallbackTexture,
    position: new Vector3(1.05, 0, 0),
  });
  state.bitmapCube = added.cube;
  state.bitmapMaterial = added.material;
}

function loadBitmap(state) {
  if (
    typeof globalThis.fetch !== "function" ||
    typeof globalThis.createImageBitmap !== "function" ||
    typeof globalThis.AbortController !== "function"
  ) {
    addFallbackCube(state);
    return;
  }
  state.loader = new ImageBitmapLoader();
  state.loader.setOptions({ imageOrientation: "flipY" });
  state.loader.load(
    IMAGE_URI,
    (imageBitmap) => addBitmapCube(state, imageBitmap),
    undefined,
    () => addFallbackCube(state),
  );
}

function startAnimation(state) {
  const timer = new Timer();
  let frame;
  const requestFrame =
    typeof globalThis.requestAnimationFrame === "function"
      ? globalThis.requestAnimationFrame.bind(globalThis)
      : (callback) =>
          globalThis.setTimeout(
            () => callback(globalThis.performance?.now?.() ?? Date.now()),
            16,
          );
  const cancelFrame =
    typeof globalThis.cancelAnimationFrame === "function"
      ? globalThis.cancelAnimationFrame.bind(globalThis)
      : globalThis.clearTimeout.bind(globalThis);
  function animate(timestamp) {
    frame = requestFrame(animate);
    const delta = timer.update(timestamp).delta;
    state.group.rotation.y += delta * 0.5;
    state.fallback.cube.rotation.x += delta * 0.25;
    if (state.bitmapCube) state.bitmapCube.rotation.x -= delta * 0.25;
    state.renderer.prepare(state.scene, state.camera);
    state.renderer.render(state.scene, state.camera);
  }
  animate();
  return () => {
    if (frame !== undefined) cancelFrame(frame);
  };
}

function cleanup(state, stopAnimation) {
  state.disposed = true;
  stopAnimation();
  state.loader?.abort();
  state.bitmap?.close?.();
  state.fallbackTexture.dispose();
  state.bitmapTexture?.dispose();
  state.fallback.material.dispose();
  state.bitmapMaterial?.dispose();
  state.geometry.dispose();
  state.renderer.dispose();
}

export function setup(canvas) {
  const state = createRenderState(canvas);
  loadBitmap(state);
  const stopAnimation = startAnimation(state);
  return {
    cleanup() {
      cleanup(state, stopAnimation);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const loader = new EASEL.ImageBitmapLoader();
loader.setOptions({ imageOrientation: "flipY" });
loader.load(url, (bitmap) => {
  const texture = new EASEL.Texture(bitmap);
  texture.flipY = false;
  texture.needsUpdate = true;
  texture.update().buildBrightnessLevels();
  scene.add(new EASEL.Mesh(geometry, new EASEL.BasicMaterial({ map: texture })));
  bitmap.close();
});`;

export const threeSource = `import * as THREE from "three";

new THREE.ImageBitmapLoader()
  .setOptions({ imageOrientation: "flipY" })
  .load(url, (imageBitmap) => {
    const texture = new THREE.CanvasTexture(imageBitmap);
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture })));
    texture.onUpdate = () => imageBitmap.close();
  });`;

export const example = { meta, controls, setup, easelSource, threeSource };
