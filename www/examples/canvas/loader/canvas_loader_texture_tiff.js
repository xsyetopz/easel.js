import {
  BasicMaterial,
  DataTexture,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Renderer,
  Scene,
  TIFFLoader,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_loader_texture_tiff",
  name: "TIFF texture loader",
  category: "canvas",
  description:
    "Decodes baseline uncompressed TIFF RGB, RGBA, and grayscale strips into Canvas2D textures.",
};
export const controls = [];

function makeTiff({ bigEndian, samplesPerPixel, photometric, pixels }) {
  const width = 2;
  const height = 2;
  const bitsPerSample = new Array(samplesPerPixel).fill(8);
  const entries = [
    [256, 4, [width]],
    [257, 4, [height]],
    [258, 3, bitsPerSample],
    [259, 3, [1]],
    [262, 3, [photometric]],
    [273, 4, [0]],
    [277, 3, [samplesPerPixel]],
    [278, 4, [height]],
    [279, 4, [pixels.length]],
    [284, 3, [1]],
    [274, 3, [1]],
  ];
  const ifdOffset = 8;
  const ifdLength = 2 + entries.length * 12 + 4;
  const bitsOffset = ifdOffset + ifdLength;
  const pixelOffset = bitsOffset + bitsPerSample.length * 2;
  const bytes = new Uint8Array(pixelOffset + pixels.length);
  const view = new DataView(bytes.buffer);
  const littleEndian = !bigEndian;
  bytes[0] = bigEndian ? 0x4d : 0x49;
  bytes[1] = bigEndian ? 0x4d : 0x49;
  view.setUint16(2, 42, littleEndian);
  view.setUint32(4, ifdOffset, littleEndian);
  view.setUint16(ifdOffset, entries.length, littleEndian);
  let entryOffset = ifdOffset + 2;
  for (const [tag, type, values] of entries) {
    view.setUint16(entryOffset, tag, littleEndian);
    view.setUint16(entryOffset + 2, type, littleEndian);
    view.setUint32(entryOffset + 4, values.length, littleEndian);
    if (tag === 258) {
      if (values.length * 2 > 4) {
        view.setUint32(entryOffset + 8, bitsOffset, littleEndian);
      } else {
        view.setUint16(entryOffset + 8, values[0] ?? 8, littleEndian);
      }
    } else if (tag === 273) {
      view.setUint32(entryOffset + 8, pixelOffset, littleEndian);
    } else {
      const value = values[0] ?? 0;
      if (type === 3) view.setUint16(entryOffset + 8, value, littleEndian);
      else view.setUint32(entryOffset + 8, value, littleEndian);
    }
    entryOffset += 12;
  }
  view.setUint32(entryOffset, 0, littleEndian);
  for (let index = 0; index < bitsPerSample.length; index++) {
    view.setUint16(bitsOffset + index * 2, 8, littleEndian);
  }
  bytes.set(pixels, pixelOffset);
  return bytes.buffer;
}

function makeFixtures() {
  return [
    makeTiff({
      bigEndian: false,
      samplesPerPixel: 3,
      photometric: 2,
      pixels: new Uint8Array([
        210, 76, 70, 246, 180, 72, 58, 140, 206, 83, 188, 105,
      ]),
    }),
    makeTiff({
      bigEndian: true,
      samplesPerPixel: 4,
      photometric: 2,
      pixels: new Uint8Array([
        240, 80, 86, 255, 250, 184, 76, 220, 70, 142, 216, 190, 88, 192, 118,
        255,
      ]),
    }),
    makeTiff({
      bigEndian: false,
      samplesPerPixel: 1,
      photometric: 1,
      pixels: new Uint8Array([24, 86, 156, 236]),
    }),
  ];
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x101622;
  const camera = new PerspectiveCamera({
    fov: 42,
    aspect: width / height,
    near: 0.1,
    far: 50,
  });
  camera.position.set(0, 0, 5);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  const loader = new TIFFLoader();
  const geometry = new PlaneGeometry(1.55, 1.55);
  const textures = [];
  const materials = [];
  const meshes = [];
  for (const [index, buffer] of makeFixtures().entries()) {
    const decoded = loader.parse(buffer);
    const texture = new DataTexture(
      decoded.data,
      decoded.width,
      decoded.height,
    );
    texture.buildBrightnessLevels();
    const material = new BasicMaterial({ map: texture });
    const mesh = new Mesh(geometry, material);
    mesh.position.x = (index - 1) * 1.7;
    scene.add(mesh);
    textures.push(texture);
    materials.push(material);
    meshes.push(mesh);
  }
  const timer = new Timer();
  let frame;
  const requestFrame =
    typeof globalThis.requestAnimationFrame === "function"
      ? globalThis.requestAnimationFrame.bind(globalThis)
      : (callback) => globalThis.setTimeout(() => callback(Date.now()), 16);
  const cancelFrame =
    typeof globalThis.cancelAnimationFrame === "function"
      ? globalThis.cancelAnimationFrame.bind(globalThis)
      : globalThis.clearTimeout.bind(globalThis);
  function animate(timestamp) {
    frame = requestFrame(animate);
    const delta = timer.update(timestamp).delta;
    for (const [index, mesh] of meshes.entries()) {
      mesh.rotation.y += delta * (index === 1 ? -0.18 : 0.18);
    }
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate(globalThis.performance?.now?.() ?? Date.now());
  return {
    cleanup() {
      if (frame !== undefined) cancelFrame(frame);
      for (const texture of textures) texture.dispose();
      for (const material of materials) material.dispose();
      geometry.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
import { TIFFLoader } from "@xsyetopz/easel";

const loader = new TIFFLoader();
// uncompressed
const decoded = loader.parse(arrayBuffer);
const texture = new EASEL.DataTexture(decoded.data, decoded.width, decoded.height);
const mesh = new EASEL.Mesh(geometry, new EASEL.BasicMaterial({ map: texture }));

// LZW
// JPEG`;

export const threeSource = `import * as THREE from "three";
import { TIFFLoader } from "three/addons/loaders/TIFFLoader.js";

const loader = new TIFFLoader();

// uncompressed
loader.load("textures/tiff/crate_uncompressed.tif", (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture })));
});

// LZW
loader.load("textures/tiff/crate_lzw.tif", (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture })));
});

// JPEG
loader.load("textures/tiff/crate_jpeg.tif", (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture })));
});`;

export const example = { meta, controls, setup, easelSource, threeSource };
