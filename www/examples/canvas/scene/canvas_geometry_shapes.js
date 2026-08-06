import {
  AmbientLight,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Shape,
  ShapeGeometry,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_geometry_shapes",
  name: "Shape Geometry",
  category: "canvas",
  description:
    "Authored contours and holes render as CPU ShapeGeometry with a Lambert material instead of repeated Phong textures.",
};

export const controls = [];

function makeBadge() {
  const shape = new Shape();
  shape.moveTo(-1.7, -1.1);
  shape.lineTo(1.7, -1.1);
  shape.lineTo(1.35, 1.1);
  shape.lineTo(-1.35, 1.1);
  shape.closePath();
  const hole = new Shape();
  hole.absarc(0, 0, 0.62, 0, Math.PI * 2);
  shape.holes.push(hole);
  return shape;
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x131925;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0.3, 6.2);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.4));
  const key = new DirectionalLight(0xffffff, 0.9);
  key.position.set(3, 4, 6);
  scene.add(key);

  const badge = new Mesh(
    new ShapeGeometry(makeBadge(), 12),
    new LambertMaterial({ color: 0x6fc4d6 }),
  );
  scene.add(badge);
  const clock = new Timer();
  let animationFrame;
  function animate(timestamp) {
    animationFrame = requestAnimationFrame(animate);
    clock.update(timestamp);
    badge.rotation.z = Math.sin(clock.elapsedTime * 0.8) * 0.08;
    badge.rotation.y += clock.delta * 0.28;
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

const geometry = new EASEL.ShapeGeometry(badgeShape, 12);
const mesh = new EASEL.Mesh(geometry, new EASEL.LambertMaterial({ color: 0x6fc4d6 }));`;

export const threeSource = `import * as THREE from "three";

const geometry = new THREE.ShapeGeometry(badgeShape);
const mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: 0x6fc4d6, map: repeatedTexture }));`;

export const example = { meta, controls, setup, easelSource, threeSource };
