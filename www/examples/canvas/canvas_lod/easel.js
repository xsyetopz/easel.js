import {
  DirectionalLight,
  FlyControls,
  Fog,
  Geometry,
  IcosahedronGeometry,
  LambertMaterial,
  LOD,
  Mesh,
  PerspectiveCamera,
  PointLight,
  Renderer,
  Scene,
  Shading,
  Timer,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "canvas_lod",
  upstream: "webgl_lod",
  name: "lod",
  category: "canvas",
  animated: true,
  description:
    "Fly through 1000 wireframe icosahedra whose LOD objects swap between five detail levels by camera distance.",
  differences: [
    "EASEL's IcosahedronGeometry reads detail as 4^detail recursive splits, so the port builds the five icosahedra with three.js's (detail + 1)^2 subdivision in the example itself; the vertex positions match three.js.",
    "EASEL draws wireframe edges as 1-pixel aliased lines in each triangle's flat-shaded color, so the material uses Shading.Flat to get lit at all; the red point light and white directional light shade each face uniformly instead of per fragment.",
    "EASEL does not apply fog to wireframe edges, so distant icosahedra stay at full brightness instead of fading to black toward the 15000-unit fog far distance.",
  ],
};
export const controls = [];

// EASEL's PolyhedronGeometry splits each face recursively into 4^detail
// triangles, so IcosahedronGeometry(100, 16) would need billions of vertices.
// This builds the three.js r186 layout instead: (detail + 1)^2 triangles per
// face, non-indexed, projected onto the sphere, with normalized normals.
function createIcosahedronGeometry(radius, detail) {
  const base = new IcosahedronGeometry(1, 0).getAttribute("position").array;
  const cols = detail + 1;
  const positions = [];
  const normals = [];
  const vertex = (face, i, j) => {
    const rows = cols - i;
    const t = i / cols;
    const s = rows === 0 ? 0 : j / rows;
    let x = 0;
    let y = 0;
    let z = 0;
    for (let axis = 0; axis < 3; axis++) {
      const a = base[face + axis];
      const b = base[face + 3 + axis];
      const c = base[face + 6 + axis];
      const aj = a + (c - a) * t;
      const value = aj + (b + (c - b) * t - aj) * s;
      if (axis === 0) x = value;
      else if (axis === 1) y = value;
      else z = value;
    }
    const length = Math.hypot(x, y, z);
    normals.push(x / length, y / length, z / length);
    positions.push(
      (x / length) * radius,
      (y / length) * radius,
      (z / length) * radius,
    );
  };
  for (let face = 0; face < base.length; face += 9) {
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < 2 * (cols - i) - 1; j++) {
        const k = Math.floor(j / 2);
        if (j % 2 === 0) {
          vertex(face, i, k + 1);
          vertex(face, i + 1, k);
          vertex(face, i, k);
        } else {
          vertex(face, i, k + 1);
          vertex(face, i + 1, k + 1);
          vertex(face, i + 1, k);
        }
      }
    }
  }
  const geometry = new Geometry();
  geometry.setPositions(new Float32Array(positions));
  geometry.setNormals(new Float32Array(normals));
  geometry.computeBoundingSphere();
  return geometry;
}

export function setup(canvas) {
  const timer = new Timer();
  timer.connect(canvas.ownerDocument);

  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 15000,
  });
  camera.position.z = 1000;

  const scene = new Scene();
  scene.fog = new Fog({ color: 0x000000, near: 1, far: 15000 });

  const pointLight = new PointLight(0xff2200, 3, 0, 0);
  pointLight.position.set(0, 0, 0);
  scene.add(pointLight);

  const dirLight = new DirectionalLight(0xffffff, 3);
  dirLight.position.set(0, 0, 1).normalize();
  scene.add(dirLight);

  const geometry = [
    [createIcosahedronGeometry(100, 16), 50],
    [createIcosahedronGeometry(100, 8), 300],
    [createIcosahedronGeometry(100, 4), 1000],
    [createIcosahedronGeometry(100, 2), 2000],
    [createIcosahedronGeometry(100, 1), 8000],
  ];

  // EASEL wireframes draw the flat-shaded face color, so Gouraud (the Lambert
  // default) would leave them unlit.
  const material = new LambertMaterial({
    color: 0xffffff,
    wireframe: true,
    shading: Shading.Flat,
  });

  const lods = [];
  for (let j = 0; j < 1000; j++) {
    const lod = new LOD();

    for (let i = 0; i < geometry.length; i++) {
      const mesh = new Mesh(geometry[i][0], material);
      mesh.scale.set(1.5, 1.5, 1.5);
      mesh.updateMatrix();
      mesh.matrixAutoUpdate = false;
      lod.addLevel(mesh, geometry[i][1]);
    }

    lod.position.x = 10000 * (0.5 - Math.random());
    lod.position.y = 7500 * (0.5 - Math.random());
    lod.position.z = 10000 * (0.5 - Math.random());
    lod.updateMatrix();
    lod.matrixAutoUpdate = false;
    scene.add(lod);
    lods.push(lod);
  }

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  //

  const flyControls = new FlyControls(camera, canvas);
  flyControls.movementSpeed = 1000;
  flyControls.rollSpeed = Math.PI / 10;

  const animation = createExampleAnimationLoop(() => {
    timer.update();

    flyControls.update(timer.delta);

    renderer.prepare(scene, camera);
    for (const lod of lods) lod.update(camera);
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
      flyControls.dispose();
      timer.dispose();
      for (const [levelGeometry] of geometry) levelGeometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const lod = new EASEL.LOD();
for (const [levelGeometry, distance] of geometry) {
  lod.addLevel(new EASEL.Mesh(levelGeometry, material), distance);
}
const controls = new EASEL.FlyControls(camera, canvas);
controls.movementSpeed = 1000;

controls.update(timer.update().delta);
renderer.prepare(scene, camera);
lod.update(camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };
