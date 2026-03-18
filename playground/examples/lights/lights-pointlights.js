import {
	AmbientLight,
	Clock,
	LambertMaterial,
	Mesh,
	PerspectiveCamera,
	PlaneGeometry,
	PointLight,
	Renderer,
	Scene,
	TorusKnotGeometry,
} from "@/index.js";

export const controls = [
	{
		type: "slider",
		key: "intensity",
		label: "Light Intensity",
		min: 0,
		max: 3,
		step: 0.05,
		default: 1.5,
	},
	{
		type: "slider",
		key: "speed",
		label: "Orbit Speed",
		min: 0.1,
		max: 3,
		step: 0.05,
		default: 1,
	},
];

export function setup(canvas, params = {}) {
	const width = canvas.width;
	const height = canvas.height;

	const scene = new Scene();
	const camera = new PerspectiveCamera({
		fov: Math.PI / 4,
		aspect: width / height,
		near: 0.1,
		far: 100,
	});
	camera.position.set(0, 3, 10);

	const renderer = new Renderer({ canvas, width, height });

	scene.add(new AmbientLight(0xffffff, 0.1));

	const knot = new Mesh(
		new TorusKnotGeometry(2, 0.6, 128, 16),
		new LambertMaterial({ color: 0xdddddd }),
	);
	scene.add(knot);

	const ground = new Mesh(
		new PlaneGeometry(20, 20),
		new LambertMaterial({ color: 0x444444 }),
	);
	ground.rotation.x = -Math.PI / 2;
	ground.position.y = -3;
	scene.add(ground);

	const intensity = params.intensity ?? 1.5;
	const red = new PointLight(0xff0000, intensity, 20, 2);
	const green = new PointLight(0x00ff00, intensity, 20, 2);
	const blue = new PointLight(0x0000ff, intensity, 20, 2);
	scene.add(red);
	scene.add(green);
	scene.add(blue);

	const lights = [red, green, blue];

	const clock = new Clock();
	let elapsed = 0;
	let animId;
	let currentSpeed = params.speed ?? 1;
	let currentIntensity = intensity;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		elapsed += dt;

		const speed = currentSpeed;
		lights[0].position.set(
			Math.cos(elapsed * speed) * 4,
			2,
			Math.sin(elapsed * speed) * 4,
		);
		lights[1].position.set(
			Math.cos(elapsed * speed * 0.7 + 2) * 5,
			1,
			Math.sin(elapsed * speed * 0.7 + 2) * 5,
		);
		lights[2].position.set(
			Math.cos(elapsed * speed * 1.3 + 4) * 3,
			3,
			Math.sin(elapsed * speed * 1.3 + 4) * 3,
		);

		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			if (newParams.intensity !== undefined) {
				currentIntensity = newParams.intensity;
				for (const light of lights) {
					light.intensity = currentIntensity;
				}
			}
			if (newParams.speed !== undefined) {
				currentSpeed = newParams.speed;
			}
		},
	};
}

export const source = `import {
  Scene, PerspectiveCamera, Renderer, Clock,
  AmbientLight, PointLight, LambertMaterial, Mesh,
  TorusKnotGeometry, PlaneGeometry,
} from "easel";

// Three PointLights (RGB) orbit the central torus knot
// at different radii and speeds.
const red   = new PointLight(0xff0000, 1.5, 20, 2);
const green = new PointLight(0x00ff00, 1.5, 20, 2);
const blue  = new PointLight(0x0000ff, 1.5, 20, 2);

function animate() {
  red.position.set(Math.cos(t * speed) * 4, 2, Math.sin(t * speed) * 4);
  green.position.set(Math.cos(t * speed * 0.7 + 2) * 5, 1, Math.sin(t * speed * 0.7 + 2) * 5);
  blue.position.set(Math.cos(t * speed * 1.3 + 4) * 3, 3, Math.sin(t * speed * 1.3 + 4) * 3);
}`;
