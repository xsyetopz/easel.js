import {
  AmbientLight,
  BoxGeometry,
  DataTexture,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "misc_uv_tests",
  name: "UV Tests",
  category: "misc",
  description:
    "A CPU texture sampler exercises clamped, repeated, and mirrored UVs.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x111827;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0.2, 7);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const light = new DirectionalLight(0xffffff, 0.9);
  light.position.set(3, 4, 6);
  scene.add(light);
  const pixels = new Uint8Array(8 * 8 * 4);
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const index = (y * 8 + x) * 4;
      const value = (x + y) % 2 === 0 ? 235 : 45;
      pixels[index] = value;
      pixels[index + 1] = x * 24;
      pixels[index + 2] = y * 24;
      pixels[index + 3] = 255;
    }
  const texture = new DataTexture(pixels, 8, 8);
  const meshes = [-2.2, 0, 2.2].map((x, index) => {
    const geometry = new BoxGeometry(1.7, 1.7, 1.7);
    geometry.setUVs(
      geometry.getAttribute("uv")?.array
        ? Array.from(
            geometry.getAttribute("uv").array,
            (value) => value * (index + 1),
          )
        : [],
    );
    const mesh = new Mesh(geometry, new LambertMaterial({ map: texture }));
    mesh.position.x = x;
    scene.add(mesh);
    return mesh;
  });
  const clock = new Timer();
  let frame;
  function animate(timestamp) {
    frame = requestAnimationFrame(animate);
    clock.update(timestamp);
    for (const mesh of meshes) mesh.rotation.y += clock.delta * 0.3;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (frame !== undefined) cancelAnimationFrame(frame);
      texture.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const texture = new EASEL.DataTexture(pixels, 8, 8);
geometry.setUVs(uvs);
const mesh = new EASEL.Mesh(geometry, new EASEL.LambertMaterial({ map: texture }));`;
export const threeSource = `import * as THREE from "three";
import { UVsDebug } from "three/addons/utils/UVsDebug.js";

const texture = new THREE.DataTexture(pixels, 8, 8);
geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
const mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ map: texture }));`;
export const example = { meta, controls, setup, easelSource, threeSource };
