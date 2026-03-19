import * as EASEL from "@/index.js";

export const controls = [
	{
		type: "slider",
		key: "intensity",
		label: "Light Intensity",
		min: 0,
		max: 2,
		step: 0.05,
		default: 1,
	},
];

export function setup(canvas, params = {}) {
	const width = canvas.width;
	const height = canvas.height;

	const scene = new EASEL.Scene();
	const camera = new EASEL.PerspectiveCamera({
		fov: Math.PI / 4,
		aspect: width / height,
		near: 0.1,
		far: 100,
	});
	camera.position.z = 8;

	const renderer = new EASEL.Renderer({ canvas, width, height });

	scene.add(new EASEL.AmbientLight(0xffffff, 0.2));
	const dirLight = new EASEL.DirectionalLight(0xffffff, params.intensity ?? 1);
	dirLight.position.set(4, 6, 5);
	scene.add(dirLight);

	const colors = [0xe05050, 0x50b050, 0x5080e0, 0xe0b040];
	const spacing = 2.2;
	/** @type {EASEL.Mesh[]} */
	const meshes = [];

	colors.forEach((color, i) => {
		const mesh = new EASEL.Mesh(
			new EASEL.SphereGeometry(0.9, 24, 16),
			new EASEL.ToonMaterial({ color }),
		);
		mesh.position.x = (i - (colors.length - 1) / 2) * spacing;
		scene.add(mesh);
		meshes.push(mesh);
	});

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
			if (newParams.intensity !== undefined) {
				dirLight.intensity = newParams.intensity;
			}
		},
	};
}

export const source = `import {
  EASEL.Scene, EASEL.PerspectiveCamera, EASEL.Renderer, EASEL.Clock,
  EASEL.AmbientLight, EASEL.DirectionalLight,
  EASEL.SphereGeometry, EASEL.ToonMaterial, EASEL.Mesh,
} from "easel";

// EASEL.ToonMaterial uses stepped shading - hard transitions
// between light and shadow bands.
const colors = [0xe05050, 0x50b050, 0x5080e0, 0xe0b040];
colors.forEach((color, i) => {
  const mesh = new EASEL.Mesh(
    new EASEL.SphereGeometry(0.9, 24, 16),
    new EASEL.ToonMaterial({ color }),
  );
  mesh.position.x = (i - 1.5) * 2.2;
  scene.add(mesh);
});`;
