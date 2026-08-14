import {
  AmbientLight,
  ConvexGeometry,
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
  id: "convex-collision-hull",
  name: "Convex Collision Hull",
  category: "geometry",
  description: "Wrap authored points in a convex hull for collision setup.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x101824;
  const camera = new PerspectiveCamera({
    fov: 44,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0.2, 1.2, 6.8);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const light = new DirectionalLight(0xffffff, 1);
  light.position.set(3, 5, 6);
  scene.add(light);
  const points = [
    new Vector3(0, 1.6, 0),
    new Vector3(-1.3, 0.4, 1.1),
    new Vector3(1.3, 0.4, 1.1),
    new Vector3(1.3, 0.4, -1.1),
    new Vector3(-1.3, 0.4, -1.1),
    new Vector3(0, -1.5, 0),
  ];
  const geometry = new ConvexGeometry(points);
  const mesh = new Mesh(geometry, new LambertMaterial({ color: 0xe9a65a }));
  scene.add(mesh);
  const clock = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = requestAnimationFrame(animate);
    mesh.rotation.y += clock.update().delta * 0.42;
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
const geometry = new EASEL.ConvexGeometry(points);
const mesh = new EASEL.Mesh(geometry, material);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
