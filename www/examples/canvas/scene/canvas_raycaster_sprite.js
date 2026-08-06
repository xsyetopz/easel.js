import {
  AmbientLight,
  BasicMaterial,
  DirectionalLight,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_raycaster_sprite",
  name: "Raycast Billboards",
  category: "canvas",
  description:
    "Camera-facing mesh quads provide a traversable CPU billboard substitute for the source Sprite raycast.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x101522;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0.4, 7);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.4));
  const light = new DirectionalLight(0xffffff, 0.85);
  light.position.set(3, 4, 6);
  scene.add(light);

  const material = new BasicMaterial({ color: 0x62b9d9 });
  const billboard = new Mesh(new PlaneGeometry(2.1, 2.1), material);
  scene.add(billboard);
  const raycaster = new Raycaster();
  const pointer = { x: 0, y: 0 };
  const onPointerMove = (event) => {
    const bounds = canvas.getBoundingClientRect();
    pointer.x =
      ((event.clientX - bounds.left) / (bounds.width || width)) * 2 - 1;
    pointer.y =
      -((event.clientY - bounds.top) / (bounds.height || height)) * 2 + 1;
  };
  canvas.addEventListener("pointermove", onPointerMove);
  const clock = new Timer();
  let animationFrame;
  function animate(timestamp) {
    animationFrame = requestAnimationFrame(animate);
    clock.update(timestamp);
    billboard.lookAt(camera.position);
    billboard.rotation.z = Math.sin(clock.elapsedTime * 0.8) * 0.08;
    renderer.prepare(scene, camera);
    raycaster.setFromCamera(pointer, camera);
    material.color.hex =
      raycaster.intersectObject(billboard).length > 0 ? 0xf2ba51 : 0x62b9d9;
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      canvas.removeEventListener("pointermove", onPointerMove);
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const billboard = new EASEL.Mesh(new EASEL.PlaneGeometry(2.1, 2.1), material);
billboard.lookAt(camera.position);
const hit = raycaster.intersectObject(billboard);`;

export const threeSource = `import * as THREE from "three";

const billboard = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
billboard.center.set(0.5, 0.5);
const hit = raycaster.intersectObject(billboard);`;

export const example = { meta, controls, setup, easelSource, threeSource };
