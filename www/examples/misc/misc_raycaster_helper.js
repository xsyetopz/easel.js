import {
  AmbientLight,
  AxesHelper,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Renderer,
  Scene,
  SphereGeometry,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "misc_raycaster_helper",
  name: "Raycaster Helper",
  category: "misc",
  description: "Click a mesh to cast a CPU ray and highlight the nearest hit.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 1, 7);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.45));
  const light = new DirectionalLight(0xffffff, 0.8);
  light.position.set(3, 5, 6);
  scene.add(light);
  const material = new LambertMaterial({ color: 0x5a9dd6 });
  const mesh = new Mesh(new SphereGeometry(1.2, 20, 14), material);
  scene.add(mesh);
  scene.add(new AxesHelper(2.5));
  const raycaster = new Raycaster();
  const handleClick = (event) => {
    const bounds = canvas.getBoundingClientRect();
    const coords = {
      x: ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      y: -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    };
    raycaster.setFromCamera(coords, camera);
    material.color.hex =
      raycaster.intersectObject(mesh).length > 0 ? 0xf2b84b : 0x5a9dd6;
  };
  canvas.addEventListener("click", handleClick);
  const clock = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = requestAnimationFrame(animate);
    mesh.rotation.y += clock.update().delta * 0.35;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      canvas.removeEventListener("click", handleClick);
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const raycaster = new EASEL.Raycaster();
raycaster.setFromCamera(pointer, camera);
const hits = raycaster.intersectObject(mesh);
material.color.hex = hits.length > 0 ? 0xf2b84b : 0x5a9dd6;`;

export const threeSource = `import * as THREE from "three";

const raycaster = new THREE.Raycaster();
raycaster.setFromCamera(pointer, camera);
const hits = raycaster.intersectObject(mesh);
material.color.set(hits.length > 0 ? 0xf2b84b : 0x5a9dd6);`;

export const example = { meta, controls, setup, easelSource, threeSource };
