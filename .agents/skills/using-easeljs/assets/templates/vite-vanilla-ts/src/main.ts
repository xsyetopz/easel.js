import * as EASEL from "@xsyetopz/easel";

const WIDTH = 320;
const HEIGHT = 180;

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
if (!canvas) throw new Error("Missing #scene canvas");

const renderer = new EASEL.Renderer({ width: WIDTH, height: HEIGHT, canvas });
renderer.clearColor = 0x101418;
const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 60,
  aspect: WIDTH / HEIGHT,
  near: 0.1,
  far: 100,
});
camera.position.set(2, 2, 4);
camera.updateMatrixWorld(); // lookAt reads matrixWorld
camera.lookAt(0, 0, 0);

scene.add(new EASEL.AmbientLight(0xffffff, 0.35));
const sun = new EASEL.DirectionalLight(0xffffff, 0.8);
sun.position.set(1, 2, 1);
scene.add(sun);
const geometry = new EASEL.BoxGeometry(1, 1, 1);
const material = new EASEL.LambertMaterial({ color: 0xff6644 });
const cube = new EASEL.Mesh(geometry, material);
scene.add(cube);

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
