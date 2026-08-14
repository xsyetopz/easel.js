import {
  AmbientLight,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  STLLoader,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "print-model-review",
  name: "Print Model Review",
  category: "assets",
  description: "Check an STL shell before it reaches a slicer.",
};
export const controls = [];

const source = `solid triangle
facet normal 0 0 1
 outer loop
  vertex 0 1 0
  vertex -1 -1 0
  vertex 1 -1 0
 endloop
endfacet
endsolid triangle`;

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x121826;
  const camera = new PerspectiveCamera({
    fov: 42,
    aspect: width / height,
    near: 0.1,
    far: 50,
  });
  camera.position.set(0, 0, 4.4);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.3));
  const light = new DirectionalLight(0xffffff, 1);
  light.position.set(2, 3, 4);
  scene.add(light);
  const mesh = new Mesh(
    new STLLoader().parse(source),
    new LambertMaterial({ color: 0xedaa59 }),
  );
  scene.add(mesh);
  const timer = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = globalThis.requestAnimationFrame(animate);
    mesh.rotation.y += timer.update().delta * 0.35;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (animationFrame !== undefined)
        globalThis.cancelAnimationFrame(animationFrame);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
import { STLLoader } from "@xsyetopz/easel";
const geometry = new STLLoader().parse(text);
const mesh = new EASEL.Mesh(geometry, material);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
