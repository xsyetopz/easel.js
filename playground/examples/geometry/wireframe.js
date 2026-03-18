import {
	BasicMaterial,
	BoxGeometry,
	Clock,
	ConeGeometry,
	CylinderGeometry,
	IcosahedronGeometry,
	Mesh,
	OrthographicCamera,
	Renderer,
	Scene,
	SphereGeometry,
	TorusGeometry,
} from "@/index.js";

export const controls = [
	{
		type: "slider",
		key: "segments",
		label: "Segments",
		min: 4,
		max: 24,
		step: 1,
		default: 12,
	},
];

const COLS = 2;
const ROWS = 3;
const SPACING = 3.5;

function buildEntries(segments) {
	return [
		{ geo: new BoxGeometry(1.6, 1.6, 1.6), color: 0xe06060 },
		{
			geo: new SphereGeometry(
				1.0,
				segments,
				Math.max(3, Math.floor(segments * 0.75)),
			),
			color: 0x60e060,
		},
		{
			geo: new TorusGeometry(0.7, 0.28, segments, segments * 2),
			color: 0x6060e0,
		},
		{ geo: new CylinderGeometry(0.6, 0.6, 1.6, segments), color: 0xe0e060 },
		{ geo: new ConeGeometry(0.8, 1.6, segments), color: 0xe060e0 },
		{ geo: new IcosahedronGeometry(1.0), color: 0x60e0e0 },
	];
}

export function setup(canvas, params = {}) {
	const width = canvas.width;
	const height = canvas.height;
	const aspect = width / height;
	const size = 5;

	const scene = new Scene();
	const camera = new OrthographicCamera({
		left: -size * aspect,
		right: size * aspect,
		top: size,
		bottom: -size,
		near: 0.1,
		far: 100,
	});
	camera.position.z = 8;

	const renderer = new Renderer({ canvas, width, height });

	let currentSegments = params.segments ?? 12;
	let meshes = [];

	function buildGrid(segments) {
		for (const m of meshes) scene.remove(m);
		meshes = [];

		const entries = buildEntries(segments);
		entries.forEach((entry, i) => {
			const col = i % COLS;
			const row = Math.floor(i / COLS);
			const mat = new BasicMaterial({ color: entry.color });
			mat.wireframe = true;
			const mesh = new Mesh(entry.geo, mat);
			mesh.position.x = (col - (COLS - 1) / 2) * SPACING;
			mesh.position.y = -(row - (ROWS - 1) / 2) * SPACING;
			scene.add(mesh);
			meshes.push(mesh);
		});
	}

	buildGrid(currentSegments);

	const clock = new Clock();
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		for (const mesh of meshes) {
			mesh.rotation.x += 0.3 * dt;
			mesh.rotation.y += 0.5 * dt;
		}
		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			if (newParams.segments !== undefined) {
				currentSegments = newParams.segments;
				buildGrid(currentSegments);
			}
		},
	};
}

export const source = `import {
  Scene, OrthographicCamera, Renderer, Clock,
  BoxGeometry, SphereGeometry, TorusGeometry,
  CylinderGeometry, ConeGeometry, IcosahedronGeometry,
  BasicMaterial, Mesh,
} from "easel";

// wireframe is checked by the rasterizer on drawCall.material.wireframe
const mat = new BasicMaterial({ color: 0xe06060 });
mat.wireframe = true;

const mesh = new Mesh(new SphereGeometry(1.0, 12, 9), mat);
scene.add(mesh);

// Drag the Segments slider to see how triangle count changes.
// Lower segment counts expose the faceted polygon structure.`;
