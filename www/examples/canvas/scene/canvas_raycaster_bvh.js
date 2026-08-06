import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_raycaster_bvh",
  name: "CPU Raycaster",
  category: "canvas",
  description:
    "Pointer hover uses EASEL's built-in CPU triangle traversal instead of the source MeshBVH addon acceleration structure.",
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
  camera.position.set(0, 1, 7);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const light = new DirectionalLight(0xffffff, 0.9);
  light.position.set(3, 5, 6);
  scene.add(light);

  const materialA = new LambertMaterial({ color: 0x5599d3 });
  const materialB = new LambertMaterial({ color: 0xd56a6a });
  const meshA = new Mesh(new BoxGeometry(1.7, 1.7, 1.7), materialA);
  const meshB = new Mesh(new BoxGeometry(1.7, 1.7, 1.7), materialB);
  meshA.position.x = -1.55;
  meshB.position.x = 1.55;
  scene.add(meshA, meshB);
  const pointer = { x: 0, y: 0 };
  const raycaster = new Raycaster();
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
    meshA.rotation.y += clock.delta * 0.3;
    meshB.rotation.y -= clock.delta * 0.25;
    renderer.prepare(scene, camera);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([meshA, meshB])[0];
    materialA.color.hex = hit?.object === meshA ? 0xf1c35a : 0x5599d3;
    materialB.color.hex = hit?.object === meshB ? 0xf1c35a : 0xd56a6a;
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

const raycaster = new EASEL.Raycaster();
raycaster.setFromCamera(pointer, camera);
const hit = raycaster.intersectObjects([meshA, meshB])[0];`;

export const threeSource = `import * as THREE from "three";
import { MeshBVH, acceleratedRaycast } from "three-mesh-bvh";

THREE.Mesh.prototype.raycast = acceleratedRaycast;
geometry.boundsTree = new MeshBVH(geometry);
const hit = raycaster.intersectObjects([meshA, meshB])[0];`;

export const example = { meta, controls, setup, easelSource, threeSource };
