import {
  AmbientLight,
  CatmullRomCurve3,
  DirectionalLight,
  Group,
  LambertMaterial,
  LatheGeometry,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  TubeGeometry,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_geometry_teapot",
  name: "Lathed Teapot",
  category: "canvas",
  description:
    "A compact lathe profile and authored tube handle/spout replace the unavailable Utah teapot asset loader.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x121827;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 1.6, 7.2);
  camera.lookAt(new Vector3(0, 0.25, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.38));
  const light = new DirectionalLight(0xffffff, 0.9);
  light.position.set(4, 6, 7);
  scene.add(light);
  const root = new Group();
  scene.add(root);
  const profile = [
    { x: 0.25, y: -1.0 },
    { x: 1.0, y: -0.9 },
    { x: 1.35, y: -0.3 },
    { x: 1.25, y: 0.4 },
    { x: 0.95, y: 0.85 },
    { x: 0.52, y: 1.05 },
    { x: 0.42, y: 1.32 },
    { x: 0.25, y: 1.4 },
  ];
  const body = new Mesh(
    new LatheGeometry(profile, 28),
    new LambertMaterial({ color: 0xd56f56 }),
  );
  body.scale.set(1, 0.9, 1);
  root.add(body);
  const handlePath = new CatmullRomCurve3([
    new Vector3(1.0, 0.65, 0),
    new Vector3(1.9, 1.0, 0),
    new Vector3(2.2, 0, 0),
    new Vector3(1.15, -0.5, 0),
  ]);
  root.add(
    new Mesh(
      new TubeGeometry(handlePath, 20, 0.13, 8),
      new LambertMaterial({ color: 0xb84d3f }),
    ),
  );
  const spoutPath = new CatmullRomCurve3([
    new Vector3(-1.0, 0.35, 0),
    new Vector3(-1.75, 0.55, 0),
    new Vector3(-2.1, 1.1, 0),
  ]);
  root.add(
    new Mesh(
      new TubeGeometry(spoutPath, 16, 0.17, 8),
      new LambertMaterial({ color: 0xb84d3f }),
    ),
  );
  const clock = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = requestAnimationFrame(animate);
    root.rotation.y += clock.update().delta * 0.25;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const body = new EASEL.LatheGeometry(profile, 28);
const handle = new EASEL.TubeGeometry(handlePath, 20, 0.13, 8);`;

export const threeSource = `import * as THREE from "three";

import { TeapotGeometry } from "three/addons/geometries/TeapotGeometry.js";

const body = new TeapotGeometry(1, 10);
const mesh = new THREE.Mesh(body, material);`;

export const example = { meta, controls, setup, easelSource, threeSource };
