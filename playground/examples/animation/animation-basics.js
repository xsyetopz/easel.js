import * as EASEL from "@/index.js";

export const meta = {
	id: "animation-basics",
	name: "Animation Basics",
	category: "animation",
	description:
		"Manual position/rotation/scale animation driven by Clock.delta - no keyframes needed.",
};

export const controls = [
	{
		type: "slider",
		key: "speed",
		label: "Speed",
		min: 0.1,
		max: 3,
		step: 0.1,
		default: 1,
	},
];

export function setup(canvas, params = {}) {
	const width = canvas.width;
	const height = canvas.height;

	const scene = new EASEL.Scene();
	const camera = new EASEL.PerspectiveCamera({
		fov: 45,
		aspect: width / height,
		near: 0.1,
		far: 100,
	});
	camera.position.set(0, 2, 8);
	camera.lookAt(new EASEL.Vector3(0, 0, 0));

	const renderer = new EASEL.Renderer({ canvas, width, height });

	scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
	const dirLight = new EASEL.DirectionalLight(0xffffff, 0.8);
	dirLight.position.set(4, 6, 5);
	scene.add(dirLight);

	const box = new EASEL.Mesh(
		new EASEL.BoxGeometry(1.2, 1.2, 1.2),
		new EASEL.LambertMaterial({ color: 0xe07030 }),
	);
	scene.add(box);

	let speed = params.speed ?? 1;

	const clock = new EASEL.Clock();
	let elapsed = 0;
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		elapsed += dt * speed;

		box.rotation.y = elapsed * 1.2;
		box.rotation.x = elapsed * 0.4;

		box.position.y = Math.sin(elapsed * 2) * 1.5;

		const bounce = Math.sin(elapsed * 2);
		const scaleY = 0.8 + 0.4 * ((bounce + 1) / 2);
		const scaleXZ = 1 / Math.sqrt(scaleY);
		box.scale.set(scaleXZ, scaleY, scaleXZ);

		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			if (newParams.speed !== undefined) speed = newParams.speed;
		},
	};
}

export const easelSource = `import * as EASEL from "easel";

const clock = new EASEL.Clock();
let elapsed = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.delta;
  elapsed += dt * speed;

  box.rotation.y = elapsed * 1.2;
  box.rotation.x = elapsed * 0.4;

  box.position.y = Math.sin(elapsed * 2) * 1.5;

  const bounce = Math.sin(elapsed * 2);
  const scaleY  = 0.8 + 0.4 * ((bounce + 1) / 2);
  const scaleXZ = 1 / Math.sqrt(scaleY);
  box.scale.set(scaleXZ, scaleY, scaleXZ);

  renderer.render(scene, camera);
}
animate();`;

export const threeSource = `import * as THREE from "three";

const clock = new THREE.Clock();
let elapsed = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  elapsed += dt * speed;

  box.rotation.y = elapsed * 1.2;
  box.rotation.x = elapsed * 0.4;

  box.position.y = Math.sin(elapsed * 2) * 1.5;

  const bounce = Math.sin(elapsed * 2);
  const scaleY  = 0.8 + 0.4 * ((bounce + 1) / 2);
  const scaleXZ = 1 / Math.sqrt(scaleY);
  box.scale.set(scaleXZ, scaleY, scaleXZ);

  renderer.render(scene, camera);
}
animate();`;
