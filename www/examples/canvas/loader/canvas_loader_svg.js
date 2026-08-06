import {
  BasicMaterial,
  Mesh,
  Renderer,
  SVGLoader,
  Scene,
  ShapeGeometry,
  PerspectiveCamera,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_loader_svg",
  name: "SVG loader",
  category: "canvas",
  description:
    "Parses SVG paths into CPU ShapeGeometry rendered through Canvas2D.",
};
export const controls = [];

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x101622;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0, 8);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  const source = `<svg><path d="M-2 -1 L2 -1 L2 1 L-2 1 Z M-1.2 -0.5 L1.2 -0.5 L1.2 0.5 L-1.2 0.5 Z" fill="#5da9e9"/><polygon points="-0.7,-0.7 0.7,-0.7 0,0.7" fill="#f0a34a"/></svg>`;
  const result = new SVGLoader().parse(source);
  for (const path of result.paths) {
    const shapes = path.toShapes();
    if (shapes.length === 0) continue;
    const mesh = new Mesh(
      new ShapeGeometry(shapes),
      new BasicMaterial({ color: path.userData.fill ?? 0x5da9e9 }),
    );
    mesh.position.z = -0.1 * scene.children.length;
    scene.add(mesh);
  }
  const timer = new Timer();
  let frame;
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    const delta = timer.update().delta;
    for (const child of scene.children) child.rotation.z += delta * 0.15;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const { paths } = new EASEL.SVGLoader().parse(svgText);
for (const path of paths) {
  scene.add(new EASEL.Mesh(new EASEL.ShapeGeometry(path.toShapes()), material));
}`;

export const threeSource = `import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

const loader = new SVGLoader();
const data = loader.parse(svgText);
for (const path of data.paths) {
  const shapes = SVGLoader.createShapes(path);
  scene.add(new THREE.Mesh(new THREE.ShapeGeometry(shapes), material));
}`;

export const example = { meta, controls, setup, easelSource, threeSource };
