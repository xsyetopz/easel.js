import * as EASEL from "@/index.js";

export const meta = {
	id: "texture-stress",
	name: "Textured Objects Test",
	category: "performance",
	description:
		"Toggle textures on/off to measure texture sampling overhead across many meshes.",
};

export const controls = [
	{
		type: "slider",
		key: "count",
		label: "Mesh Count",
		min: 1,
		max: 100,
		step: 1,
		default: 20,
	},
	{
		type: "select",
		key: "textured",
		label: "Textured",
		options: ["Yes", "No"],
		default: "Yes",
	},
];

function createCheckerTexture() {
	const size = 32;
	const data = new Uint8ClampedArray(size * size * 4);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const i = (y * size + x) * 4;
			const checker = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0;
			const v = checker ? 220 : 60;
			data[i] = v;
			data[i + 1] = v;
			data[i + 2] = v;
			data[i + 3] = 255;
		}
	}
	return new EASEL.DataTexture(data, size, size);
}

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
	camera.position.set(0, 4, 10);
	camera.lookAt(new EASEL.Vector3(0, 0, 0));

	const renderer = new EASEL.Renderer({ canvas, width, height });

	scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
	const light = new EASEL.DirectionalLight(0xffffff, 0.8);
	light.position.set(5, 8, 6);
	scene.add(light);

	const geometry = new EASEL.BoxGeometry(0.9, 0.9, 0.9);
	const texture = createCheckerTexture();
	const colors = [0xdd6666, 0x66bb66, 0x6666dd, 0xddaa44, 0xaa44dd, 0x44aadd];

	/** @type {EASEL.Mesh[]} */
	let meshes = [];
	let currentCount = params.count ?? 20;
	let currentTextured = params.textured ?? "Yes";

	function buildGrid(count, textured) {
		for (const m of meshes) scene.remove(m);
		meshes = [];

		const cols = Math.ceil(Math.sqrt(count));
		const spacing = 1.3;
		const offset = ((cols - 1) * spacing) / 2;

		for (let i = 0; i < count; i++) {
			const col = i % cols;
			const row = Math.floor(i / cols);
			const mat = new EASEL.LambertMaterial({
				color: colors[i % colors.length],
			});
			if (textured === "Yes") {
				mat.map = texture;
			}
			const mesh = new EASEL.Mesh(geometry, mat);
			mesh.position.x = col * spacing - offset;
			mesh.position.z = row * spacing - offset;
			scene.add(mesh);
			meshes.push(mesh);
		}
	}

	buildGrid(currentCount, currentTextured);

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
			mesh.rotation.y += 0.5 * dt;
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
			const label = currentTextured === "Yes" ? "textured" : "flat";
			ctx.fillText(`FPS: ${fps}  Meshes: ${meshes.length} (${label})`, 8, 20);
		}
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			let rebuild = false;
			if (newParams.count !== undefined && newParams.count !== currentCount) {
				currentCount = newParams.count;
				rebuild = true;
			}
			if (
				newParams.textured !== undefined &&
				newParams.textured !== currentTextured
			) {
				currentTextured = newParams.textured;
				rebuild = true;
			}
			if (rebuild) {
				buildGrid(currentCount, currentTextured);
			}
		},
	};
}

export const easelSource = `import * as EASEL from "easel";

const size = 32;
const data = new Uint8ClampedArray(size * size * 4);
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const v = ((x / 4 | 0) + (y / 4 | 0)) % 2 === 0 ? 220 : 60;
    data[i] = data[i+1] = data[i+2] = v;
    data[i+3] = 255;
  }
}
const texture = new EASEL.DataTexture(data, size, size);

const mat = new EASEL.LambertMaterial({ color: 0xdd6666 });
mat.map = texture;`;

export const threeSource = null;
