import * as EASEL from "@/index.js";

export const meta = {
	id: "hello-cube",
	name: "Hello Cube",
	category: "getting-started",
	description: "Minimal scene: one box, one light, one camera.",
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
	camera.position.z = 5;

	const renderer = new EASEL.Renderer({ canvas, width, height });

	scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
	const light = new EASEL.DirectionalLight(0xffffff, 0.8);
	light.position.set(3, 5, 4);
	scene.add(light);

	const box = new EASEL.Mesh(
		new EASEL.BoxGeometry(1, 1, 1),
		new EASEL.LambertMaterial({ color: 0xff4444 }),
	);
	scene.add(box);

	const clock = new EASEL.Clock();
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		box.rotation.y += 0.8 * dt;
		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
	};
}

export const easelSource = `import * as EASEL from "easel";

const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 45,
  aspect: 800 / 600,
  near: 0.1,
  far: 100,
});
camera.position.z = 5;

const renderer = new EASEL.Renderer({ canvas, width: 800, height: 600 });

// Lighting
scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
const light = new EASEL.DirectionalLight(0xffffff, 0.8);
light.position.set(3, 5, 4);
scene.add(light);

// Mesh = Geometry + Material
const box = new EASEL.Mesh(
  new EASEL.BoxGeometry(1, 1, 1),
  new EASEL.LambertMaterial({ color: 0xff4444 }),
);
scene.add(box);

const clock = new EASEL.Clock();
function animate() {
  requestAnimationFrame(animate);
  box.rotation.y += 0.8 * clock.delta;
  renderer.render(scene, camera);
}
animate();`;

export const threeSource = `import * as THREE from "three";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,              // degrees, not radians
  800 / 600,
  0.1,
  100,
);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(800, 600);

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const light = new THREE.DirectionalLight(0xffffff, 0.8);
light.position.set(3, 5, 4);
scene.add(light);

// Mesh = Geometry + Material
const box = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshLambertMaterial({ color: 0xff4444 }),
);
scene.add(box);

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  box.rotation.y += 0.8 * clock.getDelta();
  renderer.render(scene, camera);
}
animate();`;
