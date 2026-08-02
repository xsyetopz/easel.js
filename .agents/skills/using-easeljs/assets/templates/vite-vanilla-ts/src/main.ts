import * as EASEL from "@xsyetopz/easel";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
if (!canvas) throw new Error("Missing #scene canvas");
const renderer = new EASEL.Renderer({ width: 320, height: 180, canvas });
const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
	fov: 60,
	aspect: 320 / 180,
	near: 0.1,
	far: 100,
});
camera.position.set(2, 2, 4);
camera.lookAt(0, 0, 0);
scene.add(new EASEL.AmbientLight(0xffffff, 0.35));
const cube = new EASEL.Mesh(
	new EASEL.BoxGeometry(1, 1, 1),
	new EASEL.LambertMaterial({ color: 0xff6644 }),
);
scene.add(cube);
function frame() {
	cube.rotation.y += 0.02;
	renderer.render(scene, camera);
	requestAnimationFrame(frame);
}
frame();
