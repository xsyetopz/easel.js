import {
  AmbientLight,
  BoxHelper,
  EdgesGeometry,
  GridHelper,
  Group,
  LambertMaterial,
  LineMaterial,
  LineSegments,
  Mesh,
  PerspectiveCamera,
  PointLight,
  PointLightHelper,
  PolarGridHelper,
  Renderer,
  Scene,
  SphereGeometry,
  Timer,
  VertexNormalsHelper,
  VertexTangentsHelper,
  WireframeGeometry,
} from "@/index.js";

export const meta = {
  id: "webgl_helpers",
  name: "Helpers",
  category: "canvas",
  description:
    "CPU Canvas2D normal and tangent line helpers, grids, light markers, bounds, and wireframe geometry replace the official WebGL helper scene.",
};

export const controls = [];

export function setup(canvas) {
  let width = Math.max(1, canvas.width || 640);
  let height = Math.max(1, canvas.height || 360);
  const scene = new Scene();
  scene.background = 0x101520;
  const camera = new PerspectiveCamera({
    fov: 50,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.z = 12;

  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.32));
  const light = new PointLight(0xffffff, 2.4, 30, 2);
  light.position.set(4, 3, 5);
  scene.add(light);
  const lightHelper = new PointLightHelper(light, 0.4, 0xffd166);
  scene.add(lightHelper);

  const grid = new GridHelper(16, 16, 0x203047, 0x30445e);
  grid.position.y = -2.2;
  scene.add(grid);
  const polarGrid = new PolarGridHelper(5, 16, 6, 32, 0x1e3550, 0x29415f);
  polarGrid.position.set(4.2, -2.15, 0);
  scene.add(polarGrid);

  const group = new Group();
  group.scale.set(2, 2, 2);
  scene.add(group);

  const geometry = new SphereGeometry(1.4, 24, 16);
  geometry.computeTangents();
  geometry.computeBoundingBox();
  const mesh = new Mesh(geometry, new LambertMaterial({ color: 0xb567d6 }));
  group.add(mesh);

  const normalHelper = new VertexNormalsHelper(mesh, 0.42, 0xff6b6b);
  const tangentHelper = new VertexTangentsHelper(mesh, 0.42, 0x4de3ff);
  scene.add(normalHelper, tangentHelper);

  const boxHelper = new BoxHelper(mesh, 0xffd166);
  boxHelper.update();
  scene.add(boxHelper);

  const wireframe = new LineSegments(
    new WireframeGeometry(geometry),
    new LineMaterial({ color: 0xe9f0ff }),
  );
  wireframe.material.opacity = 0.28;
  wireframe.material.transparent = true;
  wireframe.position.x = 0.12;
  group.add(wireframe);

  const edges = new LineSegments(
    new EdgesGeometry(geometry, 18),
    new LineMaterial({ color: 0xffb86b }),
  );
  edges.material.opacity = 0.4;
  edges.material.transparent = true;
  edges.position.x = -0.12;
  group.add(edges);

  const timer = new Timer();
  let animationFrame;
  let running = true;

  function resize() {
    const nextWidth = Math.max(1, canvas.width || width);
    const nextHeight = Math.max(1, canvas.height || height);
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function animate(timestamp) {
    if (!running) return;
    resize();
    timer.update(timestamp);
    const time = timer.elapsedTime * 0.55;
    camera.position.x = 12 * Math.cos(time);
    camera.position.z = 12 * Math.sin(time);
    camera.lookAt(scene.position);
    light.position.x = Math.sin(time * 1.7) * 5;
    light.position.y = Math.cos(time * 1.5) * 4;
    light.position.z = Math.cos(time * 1.3) * 5;
    lightHelper.update();
    group.rotation.y += timer.delta * 0.35;
    renderer.prepare(scene, camera);
    normalHelper.update();
    tangentHelper.update();
    boxHelper.update();
    renderer.render(scene, camera);
    if (typeof globalThis.requestAnimationFrame === "function") {
      animationFrame = globalThis.requestAnimationFrame(animate);
    }
  }

  animate();

  return {
    cleanup() {
      running = false;
      if (
        animationFrame !== undefined &&
        typeof globalThis.cancelAnimationFrame === "function"
      ) {
        globalThis.cancelAnimationFrame(animationFrame);
      }
      normalHelper.dispose();
      tangentHelper.dispose();
      boxHelper.dispose();
      wireframe.geometry?.dispose();
      wireframe.material?.dispose();
      edges.geometry?.dispose();
      edges.material?.dispose();
      geometry.dispose();
      mesh.material?.dispose();
      grid.geometry?.dispose();
      grid.material?.dispose();
      polarGrid.geometry?.dispose();
      polarGrid.material?.dispose();
      lightHelper.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

geometry.computeVertexNormals();
geometry.computeTangents();
const normals = new EASEL.VertexNormalsHelper(mesh, 5);
const tangents = new EASEL.VertexTangentsHelper(mesh, 5);
scene.add(normals, tangents, new EASEL.BoxHelper(mesh));`;

export const threeSource = `import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VertexNormalsHelper } from "three/addons/helpers/VertexNormalsHelper.js";
import { VertexTangentsHelper } from "three/addons/helpers/VertexTangentsHelper.js";

mesh.geometry.computeTangents();
const normals = new VertexNormalsHelper(mesh, 5);
const tangents = new VertexTangentsHelper(mesh, 5);
scene.add(normals, tangents, new THREE.BoxHelper(mesh));`;

export const example = { meta, controls, setup, easelSource, threeSource };
