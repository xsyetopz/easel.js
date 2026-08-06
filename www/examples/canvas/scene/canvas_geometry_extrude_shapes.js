import {
  AmbientLight,
  DirectionalLight,
  ExtrudeGeometry,
  LambertMaterial,
  Mesh,
  OrbitControls,
  PerspectiveCamera,
  Renderer,
  Scene,
  Shape,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_geometry_extrude_shapes",
  name: "Extruded Shapes",
  category: "canvas",
  description:
    "ExtrudeGeometry turns authored star and ring contours into a lit CPU model; OrbitControls replaces TrackballControls.",
};

export const controls = [];

function starShape(points = 5, outer = 1.55, inner = 0.7) {
  const shape = new Shape();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  return shape.closePath();
}

function ringShape() {
  const shape = new Shape();
  shape.absarc(0, 0, 1.45, 0, Math.PI * 2);
  const hole = new Shape();
  hole.absarc(0, 0, 0.72, 0, Math.PI * 2);
  shape.holes.push(hole);
  return shape;
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x121722;
  const camera = new PerspectiveCamera({
    fov: 42,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 2.2, 7.5);
  camera.lookAt(new Vector3(0, 0, 0));
  const orbit = new OrbitControls(camera, canvas);
  orbit.target.set(0, 0, 0);
  orbit.enableDamping = true;
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const key = new DirectionalLight(0xffffff, 0.9);
  key.position.set(4, 5, 7);
  scene.add(key);

  const star = new Mesh(
    new ExtrudeGeometry(starShape(), {
      depth: 0.55,
      steps: 1,
      bevelEnabled: false,
    }),
    new LambertMaterial({ color: 0xe8a34b }),
  );
  star.position.x = -1.8;
  star.rotation.x = -0.35;
  const ring = new Mesh(
    new ExtrudeGeometry(ringShape(), {
      depth: 0.4,
      steps: 1,
      bevelEnabled: false,
    }),
    new LambertMaterial({ color: 0x5faed5 }),
  );
  ring.position.x = 1.8;
  ring.rotation.x = -0.35;
  scene.add(star, ring);

  const clock = new Timer();
  let animationFrame;
  function animate(timestamp) {
    animationFrame = requestAnimationFrame(animate);
    clock.update(timestamp);
    star.rotation.z += clock.delta * 0.25;
    ring.rotation.z -= clock.delta * 0.2;
    orbit.update();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      orbit.dispose();
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const geometry = new EASEL.ExtrudeGeometry(starShape, { depth: 0.55, bevelEnabled: false });
const mesh = new EASEL.Mesh(geometry, new EASEL.LambertMaterial({ color: 0xe8a34b }));
const controls = new EASEL.OrbitControls(camera, canvas);`;

export const threeSource = `import * as THREE from "three";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";

const geometry = new THREE.ExtrudeGeometry(starShape, { depth: 0.55, bevelEnabled: false });
const mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: 0xe8a34b }));
const controls = new TrackballControls(camera, renderer.domElement);`;

export const example = { meta, controls, setup, easelSource, threeSource };
