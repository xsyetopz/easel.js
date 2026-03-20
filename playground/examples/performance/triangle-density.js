import * as EASEL from "@/index.js";

export const meta = {
	id: "triangle-density",
	name: "Triangle Density Test",
	category: "performance",
	description:
		"Single sphere with adjustable subdivisions to test rasterizer throughput.",
};

export const controls = [
	{
		type: "slider",
		key: "subdivisions",
		label: "Subdivisions",
		min: 4,
		max: 256,
		step: 4,
		default: 32,
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
	camera.position.z = 5;

	const renderer = new EASEL.Renderer({ canvas, width, height });

	scene.add(new EASEL.AmbientLight(0xffffff, 0.3));
	const light = new EASEL.DirectionalLight(0xffffff, 0.9);
	light.position.set(3, 5, 4);
	scene.add(light);

	let currentSubs = params.subdivisions ?? 32;
	let mesh = new EASEL.Mesh(
		new EASEL.SphereGeometry(1.5, currentSubs, Math.floor(currentSubs * 0.75)),
		new EASEL.LambertMaterial({ color: 0x5577dd }),
	);
	scene.add(mesh);

	const clock = new EASEL.Clock();
	let animId;
	let frames = 0;
	let fpsTime = 0;
	let fps = 0;
	const ctx = canvas.getContext("2d");

	function triCount() {
		const idx = mesh.geometry.index;
		return idx ? Math.floor(idx.length / 3) : 0;
	}

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;

		mesh.rotation.y += 0.4 * dt;
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
			ctx.fillText(`FPS: ${fps}  Tris: ${triCount()}`, 8, 20);
		}
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			if (
				newParams.subdivisions !== undefined &&
				newParams.subdivisions !== currentSubs
			) {
				currentSubs = newParams.subdivisions;
				scene.remove(mesh);
				mesh = new EASEL.Mesh(
					new EASEL.SphereGeometry(
						1.5,
						currentSubs,
						Math.floor(currentSubs * 0.75),
					),
					new EASEL.LambertMaterial({ color: 0x5577dd }),
				);
				scene.add(mesh);
			}
		},
	};
}

export const easelSource = `import * as EASEL from "easel";

const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 45, aspect: width / height, near: 0.1, far: 100,
});
camera.position.z = 5;

const renderer = new EASEL.Renderer({ canvas, width, height });
scene.add(new EASEL.AmbientLight(0xffffff, 0.3));

// Adjust subdivisions to control triangle count
const subs = 32;
const sphere = new EASEL.Mesh(
  new EASEL.SphereGeometry(1.5, subs, Math.floor(subs * 0.75)),
  new EASEL.LambertMaterial({ color: 0x5577dd }),
);
scene.add(sphere);`;

export const threeSource = null;
