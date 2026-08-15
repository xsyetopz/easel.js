import * as EASEL from "@xsyetopz/easel";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
if (!canvas) throw new Error("Missing #scene canvas");

const renderer = new EASEL.Renderer({ width: 640, height: 360, canvas });
const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 60,
  aspect: 640 / 360,
  near: 0.1,
  far: 100,
});

camera.position.set(2, 2, 4);
camera.updateMatrixWorld(false, false, true);
camera.lookAt(0, 0, 0);
camera.updateMatrix();
scene.add(new EASEL.AmbientLight(0xffffff, 0.35));

const geometry = new EASEL.BoxGeometry(1, 1, 1);
const material = new EASEL.BasicMaterial({ color: 0x66ccff });
const cube = new EASEL.Mesh(geometry, material);
scene.add(cube);
console.log(EASEL.REVISION);

let frameId = 0;
function frame(): void {
  cube.rotation.y += 0.02;
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  frameId = requestAnimationFrame(frame);
}

frameId = requestAnimationFrame(frame);
window.addEventListener(
  "pagehide",
  () => {
    cancelAnimationFrame(frameId);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  },
  { once: true },
);
