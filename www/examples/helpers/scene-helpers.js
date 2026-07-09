import * as EASEL from "@/index.js";

export const meta = {
	id: "scene-helpers",
	name: "Scene Helpers",
	category: "helpers",
	description:
		"AxesHelper, GridHelper, and BoxHelper visualize orientation and object bounds.",
};

export const controls = [];

export function setup(canvas) {
	const width = canvas.width;
	const height = canvas.height;

	const scene = new EASEL.Scene();
	const camera = new EASEL.PerspectiveCamera({
		fov: 45,
		aspect: width / height,
		near: 0.1,
		far: 100,
	});
	camera.position.set(4, 3, 6);

	const renderer = new EASEL.Renderer({ canvas, width, height });
	const orbitControls = new EASEL.OrbitControls(camera, canvas);
	orbitControls.enableDamping = true;
	orbitControls.dampingFactor = 0.12;

	scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
	const dirLight = new EASEL.DirectionalLight(0xffffff, 0.8);
	dirLight.position.set(5, 8, 5);
	scene.add(dirLight);

	const box = new EASEL.Mesh(
		new EASEL.BoxGeometry(1.5, 1.5, 1.5),
		new EASEL.LambertMaterial({ color: 0x4488cc }),
	);
	scene.add(box);

	const axes = new EASEL.AxesHelper(3);
	scene.add(axes);

	const grid = new EASEL.GridHelper(8, 8, 0x444444, 0x222222);
	grid.position.y = -1;
	scene.add(grid);

	const boxHelper = new EASEL.BoxHelper(box, 0xffff00);
	scene.add(boxHelper);

	const clock = new EASEL.Clock();
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		box.rotation.y += 0.6 * dt;
		boxHelper.update();
		orbitControls.update();
		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
			orbitControls.dispose();
		},
	};
}

export const easelSource = `import * as EASEL from "easel";

const camera = new EASEL.PerspectiveCamera({
  fov: 45,
  aspect: width / height,
  near: 0.1,
  far: 100,
});
camera.position.set(4, 3, 6);

const renderer = new EASEL.Renderer({ canvas, width, height });
const controls = new EASEL.OrbitControls(camera, canvas);
controls.enableDamping = true;

const box = new EASEL.Mesh(
  new EASEL.BoxGeometry(1.5, 1.5, 1.5),
  new EASEL.LambertMaterial({ color: 0x4488cc }),
);
scene.add(box);

const axes = new EASEL.AxesHelper(3);
scene.add(axes);

const grid = new EASEL.GridHelper(8, 8, 0x444444, 0x222222);
grid.position.y = -1;
scene.add(grid);

const boxHelper = new EASEL.BoxHelper(box, 0xffff00);
scene.add(boxHelper);

function animate() {
  requestAnimationFrame(animate);
  box.rotation.y += 0.6 * clock.delta;
  boxHelper.update();
  controls.update();
  renderer.render(scene, camera);
}
animate();`;

export const threeSource = `import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
camera.position.set(4, 3, 6);

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(width, height);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

const box = new THREE.Mesh(
  new THREE.BoxGeometry(1.5, 1.5, 1.5),
  new THREE.MeshLambertMaterial({ color: 0x4488cc }),
);
scene.add(box);

const axes = new THREE.AxesHelper(3);
scene.add(axes);

const grid = new THREE.GridHelper(8, 8, 0x444444, 0x222222);
grid.position.y = -1;
scene.add(grid);

const boxHelper = new THREE.BoxHelper(box, 0xffff00);
scene.add(boxHelper);

function animate() {
  requestAnimationFrame(animate);
  box.rotation.y += 0.6 * clock.getDelta();
  boxHelper.update();
  controls.update();
  renderer.render(scene, camera);
}
animate();`;
