import * as EASEL from "@/index.js";

export function setup(canvas) {
	const width = canvas.width;
	const height = canvas.height;

	const scene = new EASEL.Scene();
	const camera = new EASEL.PerspectiveCamera({
		fov: Math.PI / 4,
		aspect: width / height,
		near: 0.1,
		far: 100,
	});
	camera.position.set(8, 6, 12);
	camera.lookAt(new EASEL.Vector3(0, 0, 0));

	const renderer = new EASEL.Renderer({ canvas, width, height });

	scene.add(new EASEL.AmbientLight(0xffffff, 0.3));
	const dirLight = new EASEL.DirectionalLight(0xffffff, 0.7);
	dirLight.position.set(5, 8, 6);
	scene.add(dirLight);

	const sun = new EASEL.Mesh(
		new EASEL.SphereGeometry(1, 16, 12),
		new EASEL.BasicMaterial({ color: 0xffcc00 }),
	);
	scene.add(sun);

	const planetPivot = new EASEL.Group();
	sun.add(planetPivot);

	const planet = new EASEL.Mesh(
		new EASEL.SphereGeometry(0.4, 12, 8),
		new EASEL.LambertMaterial({ color: 0x4488cc }),
	);
	planet.position.x = 4;
	planetPivot.add(planet);

	const moonPivot = new EASEL.Group();
	planet.add(moonPivot);

	const moon = new EASEL.Mesh(
		new EASEL.SphereGeometry(0.15, 8, 6),
		new EASEL.LambertMaterial({ color: 0xaaaaaa }),
	);
	moon.position.x = 1;
	moonPivot.add(moon);

	const clock = new EASEL.Clock();
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
  EASEL.Scene, EASEL.PerspectiveCamera, EASEL.Renderer, EASEL.Clock, EASEL.Vector3,
  EASEL.AmbientLight, EASEL.DirectionalLight,
  EASEL.SphereGeometry, EASEL.BasicMaterial, EASEL.LambertMaterial,
  EASEL.Mesh, EASEL.Group,
} from "easel";

// Elevated camera reveals orbital planes
const camera = new EASEL.PerspectiveCamera({
  fov: Math.PI / 4, aspect: width / height,
  near: 0.1, far: 100,
});
camera.position.set(8, 6, 12);
camera.lookAt(new EASEL.Vector3(0, 0, 0));

// Parent-child transforms: sun → planet pivot → planet → moon pivot → moon
const sun = new EASEL.Mesh(new EASEL.SphereGeometry(1), new EASEL.BasicMaterial({ color: 0xffcc00 }));
const planetPivot = new EASEL.Group();
sun.add(planetPivot);

const planet = new EASEL.Mesh(new EASEL.SphereGeometry(0.4), new EASEL.LambertMaterial({ color: 0x4488cc }));
planet.position.x = 4;
planetPivot.add(planet);

const moonPivot = new EASEL.Group();
planet.add(moonPivot);

const moon = new EASEL.Mesh(new EASEL.SphereGeometry(0.15), new EASEL.LambertMaterial({ color: 0xaaaaaa }));
moon.position.x = 1;
moonPivot.add(moon);

// Rotating pivots orbits children around their parent
planetPivot.rotation.y += 0.5 * dt;
moonPivot.rotation.y += 2.0 * dt;`;
