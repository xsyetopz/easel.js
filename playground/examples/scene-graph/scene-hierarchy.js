import {
	AmbientLight,
	BasicMaterial,
	Clock,
	DirectionalLight,
	Group,
	LambertMaterial,
	Mesh,
	OrthographicCamera,
	Renderer,
	Scene,
	SphereGeometry,
} from "@/index.js";

export function setup(canvas) {
	const width = canvas.width;
	const height = canvas.height;
	const aspect = width / height;
	const size = 6;

	const scene = new Scene();
	const camera = new OrthographicCamera({
		left: -size * aspect,
		right: size * aspect,
		top: size,
		bottom: -size,
		near: 0.1,
		far: 100,
	});
	camera.position.z = 12;

	const renderer = new Renderer({ canvas, width, height });

	scene.add(new AmbientLight(0xffffff, 0.3));
	const dirLight = new DirectionalLight(0xffffff, 0.7);
	dirLight.position.set(5, 8, 6);
	scene.add(dirLight);

	const sun = new Mesh(
		new SphereGeometry(1, 16, 12),
		new BasicMaterial({ color: 0xffcc00 }),
	);
	scene.add(sun);

	const planetPivot = new Group();
	sun.add(planetPivot);

	const planet = new Mesh(
		new SphereGeometry(0.4, 12, 8),
		new LambertMaterial({ color: 0x4488cc }),
	);
	planet.position.x = 4;
	planetPivot.add(planet);

	const moonPivot = new Group();
	planet.add(moonPivot);

	const moon = new Mesh(
		new SphereGeometry(0.15, 8, 6),
		new LambertMaterial({ color: 0xaaaaaa }),
	);
	moon.position.x = 1;
	moonPivot.add(moon);

	const clock = new Clock();
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		planetPivot.rotation.y += 0.5 * dt;
		moonPivot.rotation.y += 2.0 * dt;
		sun.rotation.y += 0.1 * dt;
		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
	};
}

export const source = `import {
  Scene, OrthographicCamera, Renderer, Clock,
  AmbientLight, DirectionalLight,
  SphereGeometry, BasicMaterial, LambertMaterial,
  Mesh, Group,
} from "easel";

// Parent-child transforms: sun → planet pivot → planet → moon pivot → moon
// Each child inherits its parent's world matrix.

const sun = new Mesh(new SphereGeometry(1), new BasicMaterial({ color: 0xffcc00 }));
scene.add(sun);

const planetPivot = new Group();
sun.add(planetPivot);

const planet = new Mesh(new SphereGeometry(0.4), new LambertMaterial({ color: 0x4488cc }));
planet.position.x = 4;
planetPivot.add(planet);

const moonPivot = new Group();
planet.add(moonPivot);

const moon = new Mesh(new SphereGeometry(0.15), new LambertMaterial({ color: 0xaaaaaa }));
moon.position.x = 1;
moonPivot.add(moon);

// Rotating pivots orbits children around their parent
planetPivot.rotation.y += 0.5 * dt;
moonPivot.rotation.y += 2.0 * dt;`;
