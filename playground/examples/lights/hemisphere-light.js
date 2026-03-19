import * as EASEL from "@/index.js";

export const meta = {
	id: "hemisphere-light",
	name: "Hemisphere Light",
	category: "lights",
	description:
		"HemisphereLight blends a sky color and ground color based on the surface normal direction.",
};

export const controls = [
	{
		type: "color",
		key: "skyColor",
		label: "Sky Color",
		default: "#8888ff",
	},
	{
		type: "color",
		key: "groundColor",
		label: "Ground Color",
		default: "#443322",
	},
	{
		type: "slider",
		key: "intensity",
		label: "Intensity",
		min: 0,
		max: 2,
		step: 0.05,
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
	camera.position.set(0, 2, 10);

	const renderer = new EASEL.Renderer({ canvas, width, height });

	// Small ambient so completely shadowed faces aren't pure black
	scene.add(new EASEL.AmbientLight(0xffffff, 0.05));

	const skyHex = params.skyColor
		? Number.parseInt(
				/** @type {string} */ (params.skyColor).replace("#", ""),
				16,
			)
		: 0x8888ff;
	const groundHex = params.groundColor
		? Number.parseInt(
				/** @type {string} */ (params.groundColor).replace("#", ""),
				16,
			)
		: 0x443322;
	const hemiLight = new EASEL.HemisphereLight(
		skyHex,
		groundHex,
		params.intensity ?? 1,
	);
	scene.add(hemiLight);

	const gray = new EASEL.LambertMaterial({ color: 0x999999 });

	const sphere = new EASEL.Mesh(new EASEL.SphereGeometry(1, 24, 16), gray);
	sphere.position.set(-3, 0, 0);
	scene.add(sphere);

	const box = new EASEL.Mesh(new EASEL.BoxGeometry(1.5, 1.5, 1.5), gray);
	box.position.set(0, 0, 0);
	scene.add(box);

	const torus = new EASEL.Mesh(new EASEL.TorusGeometry(0.8, 0.3, 16, 32), gray);
	torus.position.set(3, 0, 0);
	scene.add(torus);

	const ground = new EASEL.Mesh(
		new EASEL.PlaneGeometry(14, 14),
		new EASEL.LambertMaterial({ color: 0x888888 }),
	);
	ground.rotation.x = -Math.PI / 2;
	ground.position.y = -1.5;
	scene.add(ground);

	const meshes = [sphere, box, torus];

	const clock = new EASEL.Clock();
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		for (const mesh of meshes) {
			mesh.rotation.y += 0.4 * dt;
		}
		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			if (newParams.skyColor !== undefined) {
				hemiLight.color.set(
					Number.parseInt(
						/** @type {string} */ (newParams.skyColor).replace("#", ""),
						16,
					),
				);
			}
			if (newParams.groundColor !== undefined) {
				hemiLight.groundColor.set(
					Number.parseInt(
						/** @type {string} */ (newParams.groundColor).replace("#", ""),
						16,
					),
				);
			}
			if (newParams.intensity !== undefined) {
				hemiLight.intensity = /** @type {number} */ (newParams.intensity);
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
camera.position.set(0, 2, 10);

// HemisphereLight(skyColor, groundColor, intensity)
// Per-vertex: top-facing normals get sky color, bottom-facing get ground color.
const hemi = new EASEL.HemisphereLight(0x8888ff, 0x443322, 1);
scene.add(hemi);

const mat = new EASEL.LambertMaterial({ color: 0x999999 });

const sphere = new EASEL.Mesh(new EASEL.SphereGeometry(1, 24, 16), mat);
sphere.position.set(-3, 0, 0);

const box = new EASEL.Mesh(new EASEL.BoxGeometry(1.5, 1.5, 1.5), mat);

const torus = new EASEL.Mesh(new EASEL.TorusGeometry(0.8, 0.3, 16, 32), mat);
torus.position.set(3, 0, 0);`;

export const threeSource = `import * as THREE from "three";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
camera.position.set(0, 2, 10);

// HemisphereLight API is identical between THREE and EASEL
const hemi = new THREE.HemisphereLight(0x8888ff, 0x443322, 1);
scene.add(hemi);

const mat = new THREE.MeshLambertMaterial({ color: 0x999999 });

const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat);
sphere.position.set(-3, 0, 0);

const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), mat);

const torus = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.3, 16, 32), mat);
torus.position.set(3, 0, 0);`;
