import * as EASEL from "@/index.js";

export const meta = {
	id: "mesh-stress",
	name: "Mesh Count Stress Test",
	category: "performance",
	description: "Spawn N rotating cubes in a grid to measure mesh throughput.",
};

export const controls = [
	{
		type: "slider",
		key: "count",
		label: "Mesh Count",
		min: 1,
		max: 500,
		step: 1,
		default: 50,
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
		fov: 60,
		aspect: width / height,
		near: 0.1,
		far: 200,
	});
	camera.position.set(0, 4, 12);
	camera.lookAt(new EASEL.Vector3(0, 0, 0));

	const renderer = new EASEL.Renderer({ canvas, width, height });

	scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
	const light = new EASEL.DirectionalLight(0xffffff, 0.8);
	light.position.set(5, 10, 7);
	scene.add(light);

	const geometry = new EASEL.BoxGeometry(0.8, 0.8, 0.8);
	const colors = [0x5577dd, 0xe07050, 0x50c080, 0xd0a030, 0xb060d0, 0x60b0d0];

	/** @type {EASEL.Mesh[]} */
	let meshes = [];
	let currentCount = params.count ?? 50;

	function buildGrid(count) {
		for (const m of meshes) scene.remove(m);
		meshes = [];

		const cols = Math.ceil(Math.sqrt(count));
		const spacing = 1.2;
		const offset = ((cols - 1) * spacing) / 2;

		for (let i = 0; i < count; i++) {
			const col = i % cols;
			const row = Math.floor(i / cols);
			const mesh = new EASEL.Mesh(
				geometry,
				new EASEL.LambertMaterial({ color: colors[i % colors.length] }),
			);
			mesh.position.x = col * spacing - offset;
			mesh.position.z = row * spacing - offset;
			scene.add(mesh);
			meshes.push(mesh);
		}
	}

	buildGrid(currentCount);

	const clock = new EASEL.Clock();
	let animId;
	let frames = 0;
	let fpsTime = 0;
	let fps = 0;
	const ctx = canvas.getContext("2d");

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;

		for (const mesh of meshes) {
			mesh.rotation.y += 0.6 * dt;
			mesh.rotation.x += 0.3 * dt;
		}

		renderer.render(scene, camera);

		frames++;
		fpsTime += dt;
		if (fpsTime >= 1) {
			fps = Math.round(frames / fpsTime);
			frames = 0;
			fpsTime = 0;
		}

		if (ctx) {
			ctx.fillStyle = "#fff";
			ctx.font = "14px monospace";
			ctx.fillText(`FPS: ${fps}  Meshes: ${meshes.length}`, 8, 20);
		}
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			if (newParams.count !== undefined && newParams.count !== currentCount) {
				currentCount = newParams.count;
				buildGrid(currentCount);
			}
		},
	};
}

export const easelSource = `import * as EASEL from "easel";

const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 60, aspect: width / height, near: 0.1, far: 200,
});
camera.position.set(0, 4, 12);

const renderer = new EASEL.Renderer({ canvas, width, height });
scene.add(new EASEL.AmbientLight(0xffffff, 0.4));

const geometry = new EASEL.BoxGeometry(0.8, 0.8, 0.8);

// Spawn N cubes in a grid
for (let i = 0; i < count; i++) {
  const mesh = new EASEL.Mesh(
    geometry,
    new EASEL.LambertMaterial({ color: colors[i % 6] }),
  );
  mesh.position.x = (i % cols) * 1.2 - offset;
  mesh.position.z = Math.floor(i / cols) * 1.2 - offset;
  scene.add(mesh);
}`;

export const threeSource = null;
