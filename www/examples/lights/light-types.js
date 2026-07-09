import * as EASEL from "@/index.js";

export const meta = {
	id: "light-types",
	name: "Light Types",
	category: "lights",
	description:
		"Compare Directional, Point, Spot, and Hemisphere lights on a sphere and ground plane.",
};

export const controls = [
	{
		type: "select",
		key: "lightType",
		label: "Light Type",
		options: ["Directional", "Point", "Spot", "Hemisphere"],
		default: "Directional",
	},
	{
		type: "slider",
		key: "intensity",
		label: "Intensity",
		min: 0,
		max: 2,
		step: 0.1,
		default: 1,
	},
];

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Record<string, unknown>} [params]
 */
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
	camera.position.z = 8;
	camera.position.y = 2;

	const renderer = new EASEL.Renderer({ canvas, width, height });

	scene.add(new EASEL.AmbientLight(0xffffff, 0.15));

	const ground = new EASEL.Mesh(
		new EASEL.PlaneGeometry(12, 12),
		new EASEL.LambertMaterial({ color: 0x666666 }),
	);
	ground.rotation.x = -Math.PI / 2;
	ground.position.y = -1.5;
	scene.add(ground);

	const sphere = new EASEL.Mesh(
		new EASEL.SphereGeometry(1.2, 24, 16),
		new EASEL.LambertMaterial({ color: 0xcc6644 }),
	);
	scene.add(sphere);

	const intensity = params.intensity ?? 1;

	const lightFactories = {
		Directional: (/** @type {number} */ i) => {
			const l = new EASEL.DirectionalLight(0xffffff, i);
			l.position.set(3, 5, 4);
			return l;
		},
		Point: (/** @type {number} */ i) => {
			const l = new EASEL.PointLight(0xffffff, i, 20, 2);
			l.position.set(2, 3, 2);
			return l;
		},
		Spot: (/** @type {number} */ i) => {
			const l = new EASEL.SpotLight(0xffffff, i, 20, Math.PI / 6, 0.5, 2);
			l.position.set(2, 4, 2);
			return l;
		},
		Hemisphere: (/** @type {number} */ i) =>
			new EASEL.HemisphereLight(0x8888ff, 0x443322, i),
	};

	let activeLight =
		lightFactories[params.lightType ?? "Directional"](intensity);
	scene.add(activeLight);

	const clock = new EASEL.Clock();
	let animId;
	let currentIntensity = intensity;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		sphere.rotation.y += 0.3 * dt;
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
			}
			scene.remove(activeLight);
			const type = newParams.lightType ?? params.lightType ?? "Directional";
			const factory = lightFactories[type];
			if (factory) {
				activeLight = factory(currentIntensity);
				scene.add(activeLight);
			}
		},
	};
}

export const easelSource = `import * as EASEL from "easel";

const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 45,
  aspect: width / height,
  near: 0.1,
  far: 100,
});
camera.position.z = 8;
camera.position.y = 2;

scene.add(new EASEL.AmbientLight(0xffffff, 0.15));

const dir = new EASEL.DirectionalLight(0xffffff, 1);
dir.position.set(3, 5, 4);

const point = new EASEL.PointLight(0xffffff, 1, 20, 2);
point.position.set(2, 3, 2);

const spot = new EASEL.SpotLight(0xffffff, 1, 20, Math.PI / 6, 0.5, 2);
spot.position.set(2, 4, 2);

const hemi = new EASEL.HemisphereLight(0x8888ff, 0x443322, 1);`;

export const threeSource = `import * as THREE from "three";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
camera.position.z = 8;
camera.position.y = 2;

scene.add(new THREE.AmbientLight(0xffffff, 0.15));

const dir = new THREE.DirectionalLight(0xffffff, 1);
dir.position.set(3, 5, 4);

const point = new THREE.PointLight(0xffffff, 1, 20, 2);
point.position.set(2, 3, 2);

const spot = new THREE.SpotLight(0xffffff, 1, 20, Math.PI / 6, 0.5, 2);
spot.position.set(2, 4, 2);

const hemi = new THREE.HemisphereLight(0x8888ff, 0x443322, 1);`;
