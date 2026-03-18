import {
	AmbientLight,
	Camera,
	Clock,
	DirectionalLight,
	IcosahedronGeometry,
	LambertMaterial,
	Mesh,
	Renderer,
	Scene,
} from "@/index.js";

export const controls = [
	{
		type: "slider",
		key: "speed",
		label: "Movement Speed",
		min: 0.1,
		max: 3,
		step: 0.1,
		default: 0.5,
	},
];

export function setup(canvas, params = {}) {
	const width = canvas.width;
	const height = canvas.height;
	const aspect = width / height;
	const size = 4;

	const scene = new Scene();
	const camera = new Camera({
		left: -size * aspect,
		right: size * aspect,
		top: size,
		bottom: -size,
		near: 0.1,
		far: 100,
	});
	camera.position.z = 6;

	const renderer = new Renderer({ canvas, width, height });

	scene.add(new AmbientLight(0xffffff, 0.3));
	const dirLight = new DirectionalLight(0xffffff, 0.8);
	dirLight.position.set(3, 5, 4);
	scene.add(dirLight);

	const mesh = new Mesh(
		new IcosahedronGeometry(1.5, 1),
		new LambertMaterial({ color: 0x66aacc }),
	);
	scene.add(mesh);

	let speed = params.speed ?? 0.5;
	const clock = new Clock();
	let elapsed = 0;
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		elapsed += dt;

		mesh.position.x = Math.sin(elapsed * speed) * 2;
		mesh.position.y = Math.cos(elapsed * speed * 0.7) * 1.5;
		mesh.rotation.y += 0.4 * dt;
		mesh.rotation.x += 0.2 * dt;

		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId != undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			if (newParams.speed != undefined) speed = newParams.speed;
		},
	};
}

export const source = `import {
  Scene, Camera, Renderer, Clock,
  AmbientLight, DirectionalLight,
  IcosahedronGeometry, LambertMaterial, Mesh,
} from "easel";

// Vertex wobble: Math.trunc() on projected screen coordinates
// causes vertices to snap to integer pixels at different frames.
// Watch edges stutter and the shape briefly distort during movement.

const mesh = new Mesh(
  new IcosahedronGeometry(1.5, 1),
  new LambertMaterial({ color: 0x66aacc }),
);

function animate() {
  requestAnimationFrame(animate);
  mesh.position.x = Math.sin(elapsed * 0.5) * 2;
  mesh.position.y = Math.cos(elapsed * 0.35) * 1.5;
  renderer.render(scene, camera);
}`;
