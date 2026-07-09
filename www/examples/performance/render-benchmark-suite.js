import * as EASEL from "@/index.js";
import { runBenchmarkSuite } from "./benchmark-harness.js";

export const meta = {
	id: "render-benchmark-suite",
	name: "Render Benchmark Suite",
	category: "performance",
	description:
		"Deterministic browser benchmark suite with warmup, repeated samples, p50/p95 FPS and frame-time stats, pipeline timings, workload counters, and JSON export.",
};

export const controls = [
	{
		type: "select",
		key: "workload",
		label: "Visual Workload",
		options: [
			"Mesh Grid",
			"Textured Fog",
			"Transparent Overdraw",
			"Sprite Billboards",
			"Point Cloud",
			"Hierarchy Forest",
		],
		default: "Mesh Grid",
	},
	{
		type: "slider",
		key: "warmupFrames",
		label: "Benchmark Warmup Frames",
		min: 10,
		max: 120,
		step: 10,
		default: 30,
	},
	{
		type: "slider",
		key: "samples",
		label: "Benchmark Samples",
		min: 10,
		max: 80,
		step: 10,
		default: 30,
	},
	{
		type: "slider",
		key: "framesPerSample",
		label: "Frames per Sample",
		min: 1,
		max: 10,
		step: 1,
		default: 3,
	},
];

const VISUAL_WORKLOADS = {
	"Mesh Grid": "mesh-grid-gouraud",
	"Textured Fog": "textured-fog-field",
	"Transparent Overdraw": "transparent-overdraw-stack",
	"Sprite Billboards": "sprite-billboard-field",
	"Point Cloud": "point-cloud-100k",
	"Hierarchy Forest": "hierarchy-transform-forest",
};

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Record<string, unknown>} [params]
 */
export function setup(canvas, params = {}) {
	let currentParams = params;
	let currentKey = String(params.workload ?? "Mesh Grid");
	let frame = 0;
	let animId;
	let visual = createWorkloadByName(
		canvas,
		VISUAL_WORKLOADS[currentKey],
	).create();
	let measuring = false;
	let fps = 0;
	let fpsFrames = 0;
	let fpsTime = 0;
	const clock = new EASEL.Clock();
	const timings = {};
	const ctx = canvas.getContext("2d");

	function animate() {
		animId = requestAnimationFrame(animate);
		if (measuring) return;
		const dt = clock.delta;
		visual.step(frame++);
		visual.renderer.render(visual.scene, visual.camera, timings);
		fpsFrames++;
		fpsTime += dt;
		if (fpsTime >= 1) {
			fps = Math.round(fpsFrames / fpsTime);
			fpsFrames = 0;
			fpsTime = 0;
		}
		if (ctx) {
			ctx.fillStyle = "#fff";
			ctx.font = "14px monospace";
			ctx.fillText(
				`FPS: ${fps}  Workload: ${currentKey}  Resolution: ${visual.metadata.width}x${visual.metadata.height}`,
				8,
				20,
			);
			ctx.fillText(
				`ms: total ${formatMs(timings.totalMs)}  trav ${formatMs(timings.traversalMs)}  sort ${formatMs(timings.sortMs)}  shade+rast ${formatMs(timings.shadeRasterMs)}  upload ${formatMs(timings.uploadMs)}`,
				8,
				40,
			);
			const counters = formatVisualCounters(visual.metadata);
			if (counters) ctx.fillText(counters, 8, 60);
		}
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		/** @param {Record<string, unknown>} newParams */
		update(newParams) {
			currentParams = newParams;
			const nextKey = String(newParams.workload ?? "Mesh Grid");
			if (nextKey !== currentKey) {
				currentKey = nextKey;
				frame = 0;
				visual = createWorkloadByName(
					canvas,
					VISUAL_WORKLOADS[currentKey],
				).create();
			}
		},
		runBenchmark() {
			measuring = true;
			try {
				const result = runBenchmarkSuite({
					canvas,
					workloads: createBrowserWorkloads(canvas),
					warmupFrames: Number(currentParams.warmupFrames ?? 30),
					samples: Number(currentParams.samples ?? 30),
					framesPerSample: Number(currentParams.framesPerSample ?? 3),
					profileTraversal: true,
				});
				visual = createWorkloadByName(
					canvas,
					VISUAL_WORKLOADS[currentKey],
				).create();
				frame = 0;
				fps = 0;
				fpsFrames = 0;
				fpsTime = 0;
				return result;
			} finally {
				measuring = false;
			}
		},
	};
}

function createBrowserWorkloads(canvas) {
	return [
		createMeshGridWorkload(canvas),
		createTexturedFogWorkload(canvas),
		createTransparentOverdrawWorkload(canvas),
		createSpriteBillboardWorkload(canvas),
		createPointCloudWorkload(canvas),
		createHierarchyWorkload(canvas),
	];
}

function createWorkloadByName(canvas, name) {
	return (
		createBrowserWorkloads(canvas).find((workload) => workload.name === name) ??
		createMeshGridWorkload(canvas)
	);
}

const VISUAL_COUNTER_KEYS = [
	"meshes",
	"tris",
	"planes",
	"quads",
	"points",
	"leaves",
];

function formatVisualCounters(metadata) {
	const counters = [];
	for (const key of VISUAL_COUNTER_KEYS) {
		if (!Object.hasOwn(metadata, key)) continue;
		const value = metadata[key];
		if (typeof value !== "number" || !Number.isFinite(value)) continue;
		counters.push(
			`${formatVisualCounterName(key)}: ${formatVisualCount(value)}`,
		);
	}
	return counters.join("  ");
}

function formatVisualCounterName(key) {
	switch (key) {
		case "meshes":
			return "Meshes";
		case "tris":
			return "Tris";
		case "planes":
			return "Planes";
		case "quads":
			return "Quads";
		case "points":
			return "Points";
		case "leaves":
			return "Leaves";
		default:
			return key;
	}
}

function formatVisualCount(value) {
	return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatMs(value) {
	return typeof value === "number" ? value.toFixed(2) : "—";
}

function createMeshGridWorkload(canvas) {
	return {
		name: "mesh-grid-gouraud",
		description:
			"400 shared-geometry lit meshes; traversal, projection, sorting, Gouraud shading, raster fill.",
		create() {
			const width = canvas.width;
			const height = canvas.height;
			const scene = new EASEL.Scene();
			const renderer = new EASEL.Renderer({
				canvas,
				width,
				height,
				sortObjects: true,
			});
			const camera = createOrthoCamera(width, height, 18);
			camera.position.set(0, 14, 26);
			camera.lookAt(new EASEL.Vector3(0, 0, 0));
			scene.add(new EASEL.AmbientLight(0xffffff, 0.28));
			const light = new EASEL.DirectionalLight(0xffffff, 0.9);
			light.position.set(8, 12, 10);
			scene.add(light);
			const root = new EASEL.Group();
			scene.add(root);
			const geometry = new EASEL.BoxGeometry(0.72, 0.72, 0.72);
			geometry.computeBoundingSphere();
			const materials = [
				0x6c8cff, 0xe0694f, 0x4fc078, 0xd1a33a, 0xa66bd6, 0x4db9d8,
			].map(
				(color) =>
					new EASEL.LambertMaterial({ color, shading: EASEL.Shading.Gouraud }),
			);
			const side = 20;
			for (let z = 0; z < side; z++) {
				for (let x = 0; x < side; x++) {
					const mesh = new EASEL.Mesh(
						geometry,
						materials[(x + z) % materials.length],
					);
					mesh.position.set(
						(x - side / 2) * 0.95,
						Math.sin((x * 13 + z * 7) * 0.17) * 0.65,
						(z - side / 2) * 0.95,
					);
					root.add(mesh);
				}
			}
			return {
				camera,
				renderer,
				scene,
				metadata: {
					width,
					height,
					meshes: side * side,
					tris: ((geometry.index?.length ?? 0) / 3) * side * side,
				},
				step(frame) {
					root.rotation.y = frame * 0.006;
					root.rotation.x = Math.sin(frame * 0.004) * 0.08;
				},
			};
		},
	};
}

function createTexturedFogWorkload(canvas) {
	return {
		name: "textured-fog-field",
		description:
			"40 textured spheres through fog; UV sampling, light baking, fog blend, painter sort.",
		create() {
			const width = canvas.width;
			const height = canvas.height;
			const scene = new EASEL.Scene();
			const renderer = new EASEL.Renderer({
				canvas,
				width,
				height,
				sortObjects: true,
			});
			const camera = createOrthoCamera(width, height, 16);
			camera.position.set(0, 9, 24);
			camera.lookAt(new EASEL.Vector3(0, 0, 0));
			scene.background = 0x0b1020;
			scene.fog = new EASEL.Fog({
				color: 0x0b1020,
				near: 8,
				far: 34,
				density: 2.2,
			});
			scene.add(new EASEL.AmbientLight(0xffffff, 0.25));
			const light = new EASEL.DirectionalLight(0xffffff, 0.85);
			light.position.set(5, 10, 8);
			scene.add(light);
			const material = new EASEL.LambertMaterial({
				color: 0xdde7ff,
				map: createCheckerTexture(64),
				shading: EASEL.Shading.Gouraud,
			});
			const geometry = new EASEL.SphereGeometry(0.7, 16, 12);
			geometry.computeBoundingSphere();
			const root = new EASEL.Group();
			scene.add(root);
			const cols = 8;
			const rows = 5;
			for (let z = 0; z < rows; z++) {
				for (let x = 0; x < cols; x++) {
					const mesh = new EASEL.Mesh(geometry, material);
					mesh.position.set(
						(x - 3.5) * 1.75,
						Math.sin((x + z) * 0.9) * 0.45,
						(z - 2) * 1.9,
					);
					root.add(mesh);
				}
			}
			return {
				camera,
				renderer,
				scene,
				metadata: {
					width,
					height,
					meshes: cols * rows,
					textured: true,
					fog: true,
				},
				step(frame) {
					root.rotation.y = frame * 0.004;
				},
			};
		},
	};
}

function createTransparentOverdrawWorkload(canvas) {
	return {
		name: "transparent-overdraw-stack",
		description:
			"72 overlapping translucent planes; sort order, opacity blending, fill-rate pressure.",
		create() {
			const width = canvas.width;
			const height = canvas.height;
			const scene = new EASEL.Scene();
			const renderer = new EASEL.Renderer({
				canvas,
				width,
				height,
				sortObjects: true,
			});
			const camera = createOrthoCamera(width, height, 9);
			camera.position.set(0, 0, 12);
			camera.lookAt(new EASEL.Vector3(0, 0, 0));
			const geometry = new EASEL.PlaneGeometry(6.2, 3.5);
			geometry.computeBoundingSphere();
			const colors = [
				0x4f7cff, 0xff674f, 0x53c878, 0xffcc4f, 0xb06cff, 0x4fd7ff,
			];
			const root = new EASEL.Group();
			scene.add(root);
			for (let i = 0; i < 72; i++) {
				const material = new EASEL.BasicMaterial({
					color: colors[i % colors.length],
					depthWrite: false,
					layer: i % 8,
					opacity: 5,
					transparent: true,
				});
				const mesh = new EASEL.Mesh(geometry, material);
				mesh.position.set(
					Math.sin(i * 1.7) * 0.42,
					Math.cos(i * 1.3) * 0.28,
					-i * 0.018,
				);
				mesh.rotation.z = i * 0.087;
				root.add(mesh);
			}
			return {
				camera,
				renderer,
				scene,
				metadata: { width, height, planes: 72, transparent: true },
				step(frame) {
					root.rotation.z = Math.sin(frame * 0.003) * 0.12;
				},
			};
		},
	};
}

function createSpriteBillboardWorkload(canvas) {
	return {
		name: "sprite-billboard-field",
		description:
			"512 sprite-equivalent textured quads; texture alpha test, mesh traversal, painter sort, screen fill.",
		create() {
			const width = canvas.width;
			const height = canvas.height;
			const scene = new EASEL.Scene();
			const renderer = new EASEL.Renderer({
				canvas,
				width,
				height,
				sortObjects: true,
			});
			const camera = createOrthoCamera(width, height, 14);
			camera.position.set(0, 0, 12);
			camera.lookAt(new EASEL.Vector3(0, 0, 0));
			const material = new EASEL.BasicMaterial({
				color: 0xffffff,
				map: createSpriteTexture(32),
				side: EASEL.Side.Double,
			});
			const geometry = new EASEL.PlaneGeometry(0.42, 0.42);
			geometry.computeBoundingSphere();
			const root = new EASEL.Group();
			scene.add(root);
			const cols = 32;
			const rows = 16;
			for (let y = 0; y < rows; y++) {
				for (let x = 0; x < cols; x++) {
					const mesh = new EASEL.Mesh(geometry, material);
					mesh.position.set(
						(x - (cols - 1) / 2) * 0.44,
						(y - (rows - 1) / 2) * 0.44,
						Math.sin((x * 17 + y * 31) * 0.13) * 1.25,
					);
					root.add(mesh);
				}
			}
			return {
				camera,
				renderer,
				scene,
				metadata: {
					width,
					height,
					quads: cols * rows,
					spriteEquivalent: true,
					textureAlpha: true,
				},
				step(frame) {
					root.rotation.z = Math.sin(frame * 0.006) * 0.05;
				},
			};
		},
	};
}

function createPointCloudWorkload(canvas) {
	return {
		name: "point-cloud-100k",
		description:
			"100k deterministic points; point projection, clipping, depth path, packed attribute reads.",
		create() {
			const width = canvas.width;
			const height = canvas.height;
			const scene = new EASEL.Scene();
			const renderer = new EASEL.Renderer({
				canvas,
				width,
				height,
				sortObjects: false,
			});
			const camera = createOrthoCamera(width, height, 8);
			camera.position.set(0, 0, 12);
			camera.lookAt(new EASEL.Vector3(0, 0, 0));
			const count = 100000;
			const random = createRandom(0x8eace1);
			const positions = new Float32Array(count * 3);
			const radius = 3.2;
			let written = 0;
			while (written < count) {
				const x = (random() * 2 - 1) * radius;
				const y = (random() * 2 - 1) * radius;
				const z = (random() * 2 - 1) * radius;
				if (x * x + y * y + z * z > radius * radius) continue;
				const i3 = written * 3;
				positions[i3] = x;
				positions[i3 + 1] = y;
				positions[i3 + 2] = z;
				written++;
			}
			const geometry = new EASEL.Geometry().setPositions(positions);
			geometry.computeBoundingSphere();
			const points = new EASEL.Points(
				geometry,
				new EASEL.PointsMaterial({ color: 0x88aaff, size: 1 }),
			);
			scene.add(points);
			return {
				camera,
				renderer,
				scene,
				metadata: { width, height, points: count },
				step(frame) {
					points.rotation.y = frame * 0.003;
					points.rotation.x = Math.sin(frame * 0.002) * 0.2;
				},
			};
		},
	};
}

function createHierarchyWorkload(canvas) {
	return {
		name: "hierarchy-transform-forest",
		description:
			"4-way deep transform tree with 256 mesh leaves; matrix propagation and traversal pressure.",
		create() {
			const width = canvas.width;
			const height = canvas.height;
			const scene = new EASEL.Scene();
			const renderer = new EASEL.Renderer({
				canvas,
				width,
				height,
				sortObjects: true,
			});
			const camera = createOrthoCamera(width, height, 12);
			camera.position.set(0, 10, 18);
			camera.lookAt(new EASEL.Vector3(0, 0, 0));
			scene.add(new EASEL.AmbientLight(0xffffff, 0.32));
			const light = new EASEL.DirectionalLight(0xffffff, 0.8);
			light.position.set(5, 12, 8);
			scene.add(light);
			const geometry = new EASEL.BoxGeometry(0.25, 0.25, 0.25);
			geometry.computeBoundingSphere();
			const materials = [0x80a0ff, 0xff8f70, 0x76d68e, 0xe4c15f].map(
				(color) =>
					new EASEL.LambertMaterial({ color, shading: EASEL.Shading.Flat }),
			);
			const root = new EASEL.Group();
			scene.add(root);
			let leaves = 0;
			function addBranch(parent, depth, index, x, z) {
				const group = new EASEL.Group();
				group.position.set((index - 1.5) * 0.55, 0.35, 0);
				parent.add(group);
				if (depth === 0) {
					const mesh = new EASEL.Mesh(
						geometry,
						materials[index % materials.length],
					);
					mesh.position.set(x, Math.sin((x + z) * 0.6) * 0.8, z);
					group.add(mesh);
					leaves++;
					return;
				}
				for (let i = 0; i < 4; i++) {
					addBranch(
						group,
						depth - 1,
						i,
						x + (i - 1.5) * (depth + 1) * 0.32,
						z + (index - 1.5) * 0.42,
					);
				}
			}
			for (let i = 0; i < 4; i++) addBranch(root, 3, i, (i - 1.5) * 1.8, 0);
			return {
				camera,
				renderer,
				scene,
				metadata: { width, height, leaves, branchFactor: 4, depth: 5 },
				step(frame) {
					root.rotation.y = Math.sin(frame * 0.004) * 0.5;
				},
			};
		},
	};
}

function createOrthoCamera(width, height, viewHeight) {
	const aspect = width / height;
	return new EASEL.OrthographicCamera({
		left: (-viewHeight * aspect) / 2,
		right: (viewHeight * aspect) / 2,
		top: viewHeight / 2,
		bottom: -viewHeight / 2,
		near: 0.1,
		far: 200,
	});
}

function createCheckerTexture(size) {
	const data = new Uint8ClampedArray(size * size * 4);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const i = (y * size + x) * 4;
			const value = (((x >> 3) + (y >> 3)) & 1) === 0 ? 224 : 48;
			data[i] = value;
			data[i + 1] = value;
			data[i + 2] = value;
			data[i + 3] = 255;
		}
	}
	return new EASEL.DataTexture(data, size, size);
}

function createSpriteTexture(size) {
	const data = new Uint8ClampedArray(size * size * 4);
	const center = (size - 1) * 0.5;
	const radius = size * 0.42;
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const i = (y * size + x) * 4;
			const dx = x - center;
			const dy = y - center;
			const alpha = Math.sqrt(dx * dx + dy * dy) <= radius ? 255 : 0;
			data[i] = 210;
			data[i + 1] = 228;
			data[i + 2] = 255;
			data[i + 3] = alpha;
		}
	}
	return new EASEL.DataTexture(data, size, size);
}

function createRandom(seed) {
	let state = seed >>> 0;
	return () => {
		state ^= state << 13;
		state ^= state >>> 17;
		state ^= state << 5;
		return (state >>> 0) / 0x100000000;
	};
}

export const easelSource = `import * as EASEL from "easel";

const renderer = new EASEL.Renderer({ canvas, width, height });
const timings = { profileTraversal: true };
renderer.render(scene, camera, timings);
`;

export const noThreeReason =
	"This suite measures EASEL's CPU rasterization pipeline directly.";

export const threeSource = undefined;
