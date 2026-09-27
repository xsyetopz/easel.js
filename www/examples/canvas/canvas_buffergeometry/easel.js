import {
  AmbientLight,
  Attribute,
  Color,
  DirectionalLight,
  Fog,
  Geometry,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Side,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "canvas_buffergeometry",
  upstream: "webgl_buffergeometry",
  name: "buffergeometry",
  category: "canvas",
  animated: true,
  description:
    "160,000 random non-indexed triangles with flat face normals and position-based vertex colors fill a fogged cube that tumbles under ambient and directional light.",
  differences: [
    "MeshPhongMaterial becomes LambertMaterial with Gouraud (per-vertex) lighting, so the triangles have no white specular highlight (specular 0xffffff, shininess 250).",
    "EASEL only reads RGB (itemSize 3) vertex colors and has no per-vertex alpha, so the random per-triangle alpha is dropped and the material is opaque instead of transparent; transparent: true would also turn off depth writes in EASEL and draw the triangles in submission order.",
    "Attribute.onUpload is a GPU upload hook with no EASEL equivalent, so the typed arrays stay in memory.",
    "Fog is sampled once per vertex from EASEL's 256-entry fog table instead of per pixel.",
    "All 160,000 triangles are transformed, lit and rasterized on the CPU every frame; a Bun stub-canvas run at 640x360 measured a median of about 62 ms per frame (roughly 16 fps), above the 33 ms budget, and the count is kept to match three.js.",
  ],
};
export const controls = [];

export function setup(canvas) {
  //

  const camera = new PerspectiveCamera({
    fov: 27,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 3500,
  });
  camera.position.z = 2750;

  const scene = new Scene();
  scene.background = 0x050505;
  scene.fog = new Fog({ color: 0x050505, near: 2000, far: 3500 });

  //

  scene.add(new AmbientLight(0xcccccc, 1));

  const light1 = new DirectionalLight(0xffffff, 1.5);
  light1.position.set(1, 1, 1);
  scene.add(light1);

  const light2 = new DirectionalLight(0xffffff, 4.5);
  light2.position.set(0, -1, 0);
  scene.add(light2);

  //

  const triangles = 160000;

  const geometry = new Geometry();

  const positions = [];
  const normals = [];
  const colors = [];

  const color = new Color();

  const n = 800;
  const n2 = n / 2; // triangles spread in the cube
  const d = 12;
  const d2 = d / 2; // individual triangle size

  const pA = new Vector3();
  const pB = new Vector3();
  const pC = new Vector3();

  const cb = new Vector3();
  const ab = new Vector3();

  for (let i = 0; i < triangles; i++) {
    // positions

    const x = Math.random() * n - n2;
    const y = Math.random() * n - n2;
    const z = Math.random() * n - n2;

    const ax = x + Math.random() * d - d2;
    const ay = y + Math.random() * d - d2;
    const az = z + Math.random() * d - d2;

    const bx = x + Math.random() * d - d2;
    const by = y + Math.random() * d - d2;
    const bz = z + Math.random() * d - d2;

    const cx = x + Math.random() * d - d2;
    const cy = y + Math.random() * d - d2;
    const cz = z + Math.random() * d - d2;

    positions.push(ax, ay, az);
    positions.push(bx, by, bz);
    positions.push(cx, cy, cz);

    // flat face normals

    pA.set(ax, ay, az);
    pB.set(bx, by, bz);
    pC.set(cx, cy, cz);

    cb.subVectors(pC, pB);
    ab.subVectors(pA, pB);
    cb.cross(ab);

    cb.normalize();

    const nx = cb.x;
    const ny = cb.y;
    const nz = cb.z;

    normals.push(nx, ny, nz);
    normals.push(nx, ny, nz);
    normals.push(nx, ny, nz);

    // colors

    const vx = x / n + 0.5;
    const vy = y / n + 0.5;
    const vz = z / n + 0.5;

    color.setRGB(vx, vy, vz);

    // EASEL vertex colors are RGB only; the per-triangle alpha is dropped.
    colors.push(color.r, color.g, color.b);
    colors.push(color.r, color.g, color.b);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute(
    "position",
    new Attribute(new Float32Array(positions), 3),
  );
  geometry.setAttribute("normal", new Attribute(new Float32Array(normals), 3));
  geometry.setAttribute("color", new Attribute(new Float32Array(colors), 3));

  geometry.computeBoundingSphere();

  const material = new LambertMaterial({
    color: 0xd5d5d5,
    side: Side.Double,
    vertexColors: true,
  });

  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  //

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  //

  const animation = createExampleAnimationLoop(() => {
    const time = Date.now() * 0.001;

    mesh.rotation.x = time * 0.25;
    mesh.rotation.y = time * 0.5;

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
      animation.cleanup();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

scene.fog = new EASEL.Fog({ color: 0x050505, near: 2000, far: 3500 });

const geometry = new EASEL.Geometry();
geometry.setAttribute("position", new EASEL.Attribute(new Float32Array(positions), 3));
geometry.setAttribute("normal", new EASEL.Attribute(new Float32Array(normals), 3));
geometry.setAttribute("color", new EASEL.Attribute(new Float32Array(colors), 3));
geometry.computeBoundingSphere();

const material = new EASEL.LambertMaterial({
  color: 0xd5d5d5,
  side: EASEL.Side.Double,
  vertexColors: true,
});
const mesh = new EASEL.Mesh(geometry, material);
scene.add(mesh);

mesh.rotation.x = time * 0.25;
mesh.rotation.y = time * 0.5;
renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };
