import {
  AmbientLight,
  BasicMaterial,
  DataTexture,
  EXRExporter,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "misc_exporter_exr",
  name: "EXR exporter",
  category: "misc",
  description:
    "Writes deterministic CPU RGBA samples to an uncompressed OpenEXR scanline image.",
};
export const controls = [];

function buildPixels(size) {
  const pixels = new Float32Array(size * size * 4);
  const display = new Uint8ClampedArray(size * size * 4);
  const radius = size * 0.4;
  const factor = (Math.PI * 0.5) / radius;
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const offset = (row * size + column) * 4;
      const x = column - size / 2;
      const y = row - size / 2;
      const inside = Math.hypot(x, y) < radius;
      const nx = inside ? Math.sin(x * factor) : 0;
      const ny = inside ? Math.sin(y * factor) : 0;
      const nz = inside ? Math.cos(x * factor) : 1;
      pixels[offset] = 0.5 + 0.5 * nx;
      pixels[offset + 1] = 0.5 + 0.5 * ny;
      pixels[offset + 2] = 0.5 + 0.5 * nz;
      pixels[offset + 3] = 1;
      display[offset] = pixels[offset] * 255;
      display[offset + 1] = pixels[offset + 1] * 255;
      display[offset + 2] = pixels[offset + 2] * 255;
      display[offset + 3] = 255;
    }
  }
  return { pixels, display };
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const size = 64;
  const { pixels, display } = buildPixels(size);
  const exr = new EXRExporter().parse({
    data: pixels,
    width: size,
    height: size,
  });
  canvas.dataset.exrBytes = String(exr.byteLength);

  const scene = new Scene();
  scene.background = 0x080b12;
  const camera = new PerspectiveCamera({
    fov: 42,
    aspect: width / height,
    near: 0.1,
    far: 50,
  });
  camera.position.set(0, 0, 4);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.8));
  const texture = new DataTexture(display, size, size);
  texture.needsUpdate = true;
  const mesh = new Mesh(
    new PlaneGeometry(2.8, 2.8),
    new BasicMaterial({ map: texture }),
  );
  scene.add(mesh);

  const timer = new Timer();
  let frame;
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    mesh.rotation.z += timer.update().delta * 0.2;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
      renderer.dispose();
      texture.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const exporter = new EASEL.EXRExporter();
const result = exporter.parse({ data: rgbaFloat32, width, height });`;

export const threeSource = `import * as THREE from "three";
import { EXRExporter, NO_COMPRESSION } from "three/addons/exporters/EXRExporter.js";

const dataTexture = new THREE.DataTexture(rgbaFloat32, width, height, THREE.RGBAFormat, THREE.FloatType);
dataTexture.needsUpdate = true;
const result = await new EXRExporter().parse(dataTexture, { type: THREE.FloatType, compression: NO_COMPRESSION });`;

export const example = { meta, controls, setup, easelSource, threeSource };
