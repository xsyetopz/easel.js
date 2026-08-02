import * as EASEL from "@/index.js";

export const meta = {
	id: "scene-stress",
	name: "Mesh Grid Workload",
	category: "performance",
	description:
		"Configurable mesh grid to stress traversal, fog, sorting, and texture sampling.",
};

export const controls = [
	{
		type: "slider",
		key: "count",
		label: "Mesh Count",
		min: 1,
		max: 2000,
		step: 10,
		default: 100,
	},
	{
		type: "select",
		key: "layout",
		label: "Layout",
		options: ["Grid", "Random", "3D Volume"],
		default: "Grid",
	},
	{
		type: "select",
		key: "fog",
		label: "Fog",
		options: ["Off", "On"],
		default: "Off",
	},
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
		type: "select",
		key: "layerMode",
		label: "Layer Mode",
		options: ["Single Layer", "Mixed Layers"],
		default: "Single Layer",
	},
	{
		type: "select",
		key: "textured",
		label: "Textured",
		options: ["No", "Yes"],
		default: "No",
	},
];

/** @returns {EASEL.DataTexture} */
function createCheckerTexture() {
	const size = 32;
	const data = new Uint8ClampedArray(size * size * 4);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const i = (y * size + x) * 4;
			const v = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0
				? 220
				: 60;
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
	const origin = new EASEL.Vector3(0, 0, 0);
	const camera = new EASEL.PerspectiveCamera({
		fov: 60,
		aspect: width / height,
		near: 0.1,
		far: 200,
	});

	const renderer = new EASEL.Renderer({ canvas, width, height });

	scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
	const light = new EASEL.DirectionalLight(0xffffff, 0.8);
	light.position.set(5, 10, 7);
	scene.add(light);

	const geometry = new EASEL.BoxGeometry(0.8, 0.8, 0.8);
	const colors = [0x5577dd, 0xe07050, 0x50c080, 0xd0a030, 0xb060d0, 0x60b0d0];
	const layers = [
		EASEL.Layer.GROUND,
		EASEL.Layer.SCENERY,
		EASEL.Layer.ENTITY,
		EASEL.Layer.OVERLAY,
	];
	const texture = createCheckerTexture();

	let currentCount = /** @type {number} */ (params.count ?? 100);
	let currentLayout = /** @type {string} */ (params.layout ?? "Grid");
	let currentFog = /** @type {string} */ (params.fog ?? "Off");
	let currentFogFar = /** @type {number} */ (params.fogFar ?? 30);
	let currentLayerMode = /** @type {string} */ (
		params.layerMode ?? "Single Layer"
	);
	let currentTextured = /** @type {string} */ (params.textured ?? "No");

	/** @type {EASEL.Mesh[]} */
	let meshes = [];
	let elapsed = 0;

	/**
	 * @param {number} count
	 * @param {string} layout
	 * @param {string} fogToggle
	 * @param {number} fogFar
	 * @param {string} layerMode
	 * @param {string} textured
	 */
	function buildScene(count, layout, fogToggle, fogFar, layerMode, textured) {
		for (const m of meshes) scene.remove(m);
		meshes = [];

		if (fogToggle === "On") {
			scene.fog = new EASEL.Fog({
				color: 0x000000,
				near: 1,
				far: fogFar,
			});
		} else {
			scene.fog = undefined;
		}

		if (layout === "Grid") {
			camera.position.set(0, 4, 12);
			camera.lookAt(origin);
		} else if (layout === "Random") {
			camera.position.set(0, 3, 15);
			camera.lookAt(origin);
		} else {
			// 3D Volume -  camera will orbit in animate()
			camera.position.set(0, 10, 25);
			camera.lookAt(origin);
		}

		const cols = Math.ceil(Math.sqrt(count));
		const spacing = 1.2;
		const offset = ((cols - 1) * spacing) / 2;

		for (let i = 0; i < count; i++) {
			const mat = new EASEL.LambertMaterial({
				color: colors[i % colors.length],
			});

			if (layerMode === "Mixed Layers") {
				mat.layer = layers[i % layers.length];
			}

			if (textured === "Yes") {
				mat.map = texture;
			}

			const mesh = new EASEL.Mesh(geometry, mat);

			if (layout === "Grid") {
				const col = i % cols;
				const row = Math.floor(i / cols);
				mesh.position.x = col * spacing - offset;
				mesh.position.z = row * spacing - offset;
			} else if (layout === "Random") {
				mesh.position.x = (Math.random() - 0.5) * 25;
				mesh.position.y = Math.random() * 3;
				mesh.position.z = (Math.random() - 0.5) * 25;
			} else {
				// 3D Volume
				mesh.position.x = (Math.random() - 0.5) * 20;
				mesh.position.y = (Math.random() - 0.5) * 20;
				mesh.position.z = (Math.random() - 0.5) * 20;
			}

			scene.add(mesh);
			meshes.push(mesh);
		}
	}

	buildScene(
		currentCount,
		currentLayout,
		currentFog,
		currentFogFar,
		currentLayerMode,
		currentTextured,
	);

	const clock = new EASEL.Clock();
	let animId;
	let frames = 0;
	let fpsTime = 0;
	let fps = 0;
	const ctx = canvas.getContext("2d");
	const timings = {};

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		elapsed += dt;

		for (const mesh of meshes) {
			mesh.rotation.y += 0.6 * dt;
		}

		if (currentLayout === "3D Volume") {
			const orbitRadius = 25;
			camera.position.x = Math.sin(elapsed * 0.3) * orbitRadius;
			camera.position.z = Math.cos(elapsed * 0.3) * orbitRadius;
			camera.position.y = 10;
			camera.lookAt(origin);
		}

		renderer.render(scene, camera, timings);

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
				`FPS: ${fps}  Meshes: ${currentCount}  ${currentLayout}  Fog:${currentFog}  Layers:${currentLayerMode}  Tex:${currentTextured}`,
				8,
				20,
			);
			const total = typeof timings.totalMs === "number"
				? timings.totalMs.toFixed(2)
				: "-";
			const trav = typeof timings.traversalMs === "number"
				? timings.traversalMs.toFixed(2)
				: "-";
			const sort = typeof timings.sortMs === "number"
				? timings.sortMs.toFixed(2)
				: "-";
			const shade = typeof timings.shadeRasterMs === "number"
				? timings.shadeRasterMs.toFixed(2)
				: "-";
			const upload = typeof timings.uploadMs === "number"
				? timings.uploadMs.toFixed(2)
				: "-";
			ctx.fillText(
				`ms: total ${total}  trav ${trav}  sort ${sort}  shade+rast ${shade}  upload ${upload}`,
				8,
				40,
			);
		}
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		/** @param {Record<string, unknown>} newParams */
		update(newParams) {
			let rebuild = false;

			if (
				newParams.count !== undefined &&
				newParams.count !== currentCount
			) {
				currentCount = /** @type {number} */ (newParams.count);
				rebuild = true;
			}
			if (
				newParams.layout !== undefined &&
				newParams.layout !== currentLayout
			) {
				currentLayout = /** @type {string} */ (newParams.layout);
				rebuild = true;
			}
			if (newParams.fog !== undefined && newParams.fog !== currentFog) {
				currentFog = /** @type {string} */ (newParams.fog);
				rebuild = true;
			}
			if (
				newParams.fogFar !== undefined &&
				newParams.fogFar !== currentFogFar
			) {
				currentFogFar = /** @type {number} */ (newParams.fogFar);
				rebuild = true;
			}
			if (
				newParams.layerMode !== undefined &&
				newParams.layerMode !== currentLayerMode
			) {
				currentLayerMode = /** @type {string} */ (newParams.layerMode);
				rebuild = true;
			}
			if (
				newParams.textured !== undefined &&
				newParams.textured !== currentTextured
			) {
				currentTextured = /** @type {string} */ (newParams.textured);
				rebuild = true;
			}

			if (rebuild) {
				buildScene(
					currentCount,
					currentLayout,
					currentFog,
					currentFogFar,
					currentLayerMode,
					currentTextured,
				);
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
const colors = [0x5577dd, 0xe07050, 0x50c080, 0xd0a030, 0xb060d0, 0x60b0d0];
const layers = [EASEL.Layer.GROUND, EASEL.Layer.SCENERY,
                EASEL.Layer.ENTITY, EASEL.Layer.OVERLAY];

scene.fog = new EASEL.Fog({ color: 0x000000, near: 1, far: 30 });

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

for (let i = 0; i < 100; i++) {
  const mat = new EASEL.LambertMaterial({ color: colors[i % 6] });
  mat.layer = layers[i % 4];
  mat.map = texture;
  const mesh = new EASEL.Mesh(geometry, mat);
  const cols = Math.ceil(Math.sqrt(100));
  mesh.position.x = (i % cols) * 1.2 - ((cols - 1) * 1.2) / 2;
  mesh.position.z = Math.floor(i / cols) * 1.2 - ((cols - 1) * 1.2) / 2;
  scene.add(mesh);
}`;

export const noThreeReason =
	"This workload measures EASEL traversal, fog, sorting, and texture sampling cost.";

export const threeSource = undefined;
