import * as EASEL from "@/index.js";

export const meta = {
	id: "fog-depth",
	name: "Fog Performance",
	category: "performance",
	description:
		"Adjustable fog range and object count to test fog culler effectiveness.",
};

export const controls = [
	{
		type: "slider",
		key: "fogFar",
		label: "Fog Far",
		min: 5,
		max: 50,
		step: 1,
		default: 30,
	},
	{
		type: "slider",
		key: "count",
		label: "Object Count",
		min: 10,
		max: 200,
		step: 5,
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
	camera.position.set(0, 3, 15);
	camera.lookAt(new EASEL.Vector3(0, 0, 0));

	const renderer = new EASEL.Renderer({ canvas, width, height });

	scene.add(new EASEL.AmbientLight(0xffffff, 0.3));
	const light = new EASEL.DirectionalLight(0xffffff, 0.8);
	light.position.set(3, 8, 2);
	scene.add(light);

	let currentFogFar = params.fogFar ?? 30;
	let currentCount = params.count ?? 50;

	scene.fog = new EASEL.Fog({ color: 0x000000, near: 1, far: currentFogFar });

	const geometry = new EASEL.BoxGeometry(0.7, 0.7, 0.7);
	const colors = [0x5577dd, 0xe07050, 0x50c080, 0xd0a030, 0xb060d0, 0x60b0d0];

	/** @type {EASEL.Mesh[]} */
	let meshes = [];

	function buildScene(count) {
		for (const m of meshes) scene.remove(m);
		meshes = [];

		const spread = 25;
		for (let i = 0; i < count; i++) {
			const mesh = new EASEL.Mesh(
				geometry,
				new EASEL.LambertMaterial({ color: colors[i % colors.length] }),
			);
			mesh.position.x = (Math.random() - 0.5) * spread;
			mesh.position.y = Math.random() * 3;
			mesh.position.z = (Math.random() - 0.5) * spread;
			scene.add(mesh);
			meshes.push(mesh);
		}
	}

	buildScene(currentCount);

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
			mesh.rotation.y += 0.4 * dt;
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
			ctx.fillText(
				`FPS: ${fps}  Objects: ${meshes.length}  Fog far: ${currentFogFar}`,
				8,
				20,
			);
		}
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			if (
				newParams.fogFar !== undefined &&
				newParams.fogFar !== currentFogFar
			) {
				currentFogFar = newParams.fogFar;
				scene.fog = new EASEL.Fog({
					color: 0x000000,
					near: 1,
					far: currentFogFar,
				});
			}
			if (newParams.count !== undefined && newParams.count !== currentCount) {
				currentCount = newParams.count;
				buildScene(currentCount);
			}
		},
	};
}

export const easelSource = `import * as EASEL from "easel";

const scene = new EASEL.Scene();
scene.fog = new EASEL.Fog({ color: 0x000000, near: 1, far: 30 });

const camera = new EASEL.PerspectiveCamera({
  fov: 60, aspect: width / height, near: 0.1, far: 200,
});
camera.position.set(0, 3, 15);
camera.lookAt(new EASEL.Vector3(0, 0, 0));

for (let i = 0; i < 50; i++) {
  const mesh = new EASEL.Mesh(
    new EASEL.BoxGeometry(0.7, 0.7, 0.7),
    new EASEL.LambertMaterial({ color: colors[i % 6] }),
  );
  mesh.position.x = (Math.random() - 0.5) * 25;
  mesh.position.z = (Math.random() - 0.5) * 25;
  scene.add(mesh);
}`;

export const threeSource = null;
