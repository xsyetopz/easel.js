import * as EASEL from "@/index.js";

export const meta = {
	id: "scene-hierarchy",
	name: "Scene Hierarchy",
	category: "scene-graph",
	description:
		"Sun-planet-moon system: nested Group pivots compose parent transforms automatically.",
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

	// Planet orbits sun: pivot rotates, planet sits at an offset from it
	const planetPivot = new EASEL.Group();
	sun.add(planetPivot);

	const planet = new EASEL.Mesh(
		new EASEL.SphereGeometry(0.4, 12, 8),
		new EASEL.LambertMaterial({ color: 0x4488cc }),
	);
	planet.position.x = 4;
	planetPivot.add(planet);

	// Moon orbits planet: same pattern one level deeper
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
		sun.rotation.y += 0.1 * dt;
		planetPivot.rotation.y += 0.5 * dt;
		moonPivot.rotation.y += 2.0 * dt;
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

// Group acts as a pivot point. Rotate the pivot to orbit children.
const sun = new EASEL.Mesh(new EASEL.SphereGeometry(1), new EASEL.BasicMaterial({ color: 0xffcc00 }));
scene.add(sun);

const planetPivot = new EASEL.Group();
sun.add(planetPivot);          // pivot inherits sun's world transform

const planet = new EASEL.Mesh(new EASEL.SphereGeometry(0.4), new EASEL.LambertMaterial({ color: 0x4488cc }));
planet.position.x = 4;         // offset from pivot center = orbital radius
planetPivot.add(planet);

const moonPivot = new EASEL.Group();
planet.add(moonPivot);

const moon = new EASEL.Mesh(new EASEL.SphereGeometry(0.15), new EASEL.LambertMaterial({ color: 0xaaaaaa }));
moon.position.x = 1;
moonPivot.add(moon);

// Rotate pivots each frame — children orbit automatically
sun.rotation.y       += 0.1 * dt;
planetPivot.rotation.y += 0.5 * dt;
moonPivot.rotation.y   += 2.0 * dt;`;

export const threeSource = `import * as THREE from "three";

// Identical API — THREE also uses Group pivots for parent-child orbits.
const sun = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial({ color: 0xffcc00 }));
scene.add(sun);

const planetPivot = new THREE.Group();
sun.add(planetPivot);

const planet = new THREE.Mesh(new THREE.SphereGeometry(0.4), new THREE.MeshLambertMaterial({ color: 0x4488cc }));
planet.position.x = 4;
planetPivot.add(planet);

const moonPivot = new THREE.Group();
planet.add(moonPivot);

const moon = new THREE.Mesh(new THREE.SphereGeometry(0.15), new THREE.MeshLambertMaterial({ color: 0xaaaaaa }));
moon.position.x = 1;
moonPivot.add(moon);

sun.rotation.y         += 0.1 * dt;
planetPivot.rotation.y += 0.5 * dt;
moonPivot.rotation.y   += 2.0 * dt;`;
