import {
	AmbientLight,
	CatmullRomCurve3,
	DirectionalLight,
	LambertMaterial,
	LatheGeometry,
	Mesh,
	TorusGeometry,
	TorusKnotGeometry,
	TubeGeometry,
	Vector2,
	Vector3,
} from "@/index.js";

const PALETTE = [
	0xff5722, // deep-orange
	0x8bc34a, // light-green
	0x607d8b, // blue-grey
	0xf06292, // rose
];

const COLS = 2;
const SPACING = 3.5;

/**
 * @param {number} i
 * @returns {{ x: number, z: number }}
 */
function gridPosition(i) {
	const col = i % COLS;
	const row = Math.floor(i / COLS);
	const x = (col - (COLS - 1) / 2) * SPACING;
	const z = (row - 0.5) * SPACING;
	return { x, z };
}

/**
 * Builds a vase-profile point array for LatheGeometry.
 *
 * @returns {Vector2[]}
 */
function buildLatheProfile() {
	return [
		new Vector2(0.0, 0.0),
		new Vector2(0.4, 0.2),
		new Vector2(0.5, 0.5),
		new Vector2(0.35, 0.8),
		new Vector2(0.2, 1.0),
		new Vector2(0.25, 1.2),
		new Vector2(0.35, 1.4),
		new Vector2(0.3, 1.6),
		new Vector2(0.2, 1.8),
	];
}

/**
 * Builds a helix path for TubeGeometry.
 *
 * @returns {CatmullRomCurve3}
 */
function buildHelixCurve() {
	const pts = [];
	const turns = 2;
	const steps = 20;
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const angle = t * turns * Math.PI * 2;
		pts.push(
			new Vector3(Math.cos(angle) * 0.5, t * 1.5 - 0.75, Math.sin(angle) * 0.5),
		);
	}
	return new CatmullRomCurve3(pts);
}

/**
 * Parametric zone - Torus, TorusKnot, Lathe, Tube.
 *
 * @param {import("@/index.js").Scene} scene
 * @param {import("@/index.js").PerspectiveCamera} camera
 * @returns {{ controls: Array<object>, animate: (dt: number) => void, update: (params: Record<string, unknown>) => void, dispose: () => void }}
 */
export function setup(scene, camera) {
	camera.position.set(4, 4, 7);
	camera.lookAt(0, 0, 0);

	const ambient = new AmbientLight(0xffffff, 0.5);
	scene.add(ambient);

	const sun = new DirectionalLight(0xffffff, 0.6);
	sun.position.set(5, 10, 7);
	scene.add(sun);

	const geometries = [
		{ label: "Torus", geometry: new TorusGeometry(0.5, 0.2, 8, 16) },
		{
			label: "TorusKnot",
			geometry: new TorusKnotGeometry(0.4, 0.15, 48, 6),
		},
		{ label: "Lathe", geometry: new LatheGeometry(buildLatheProfile(), 10) },
		{
			label: "Tube",
			geometry: new TubeGeometry(buildHelixCurve(), 30, 0.15, 6, false),
		},
	];

	/** @type {Mesh[]} */
	const meshes = geometries.map(({ geometry }, i) => {
		const material = new LambertMaterial({ color: PALETTE[i] });
		const mesh = new Mesh(geometry, material);
		const { x, z } = gridPosition(i);
		mesh.position.set(x, 0, z);
		scene.add(mesh);
		return mesh;
	});

	const rotSpeeds = meshes.map((_, i) => 0.3 + i * 0.12);

	return {
		controls: [
			{
				type: "select",
				key: "wireframe",
				label: "Display Mode",
				options: ["Solid", "Wireframe"],
				default: "Solid",
			},
			{
				type: "select",
				key: "side",
				label: "Face Culling",
				options: ["Front", "Double", "Back"],
				default: "Front",
			},
		],

		/**
		 * @param {number} dt
		 */
		animate(dt) {
			for (let i = 0; i < meshes.length; i++) {
				meshes[i].rotation.y += rotSpeeds[i] * dt;
			}
		},

		/**
		 * @param {{ wireframe?: string, side?: string }} params
		 */
		update(params) {
			const isWireframe = params.wireframe === "Wireframe";
			const sideMap = { Front: 0, Double: 2, Back: 1 };
			const side = sideMap[params.side] ?? 0;
			for (const mesh of meshes) {
				mesh.material.wireframe = isWireframe;
				mesh.material.side = side;
			}
		},

		dispose() {
			for (const mesh of meshes) {
				mesh.geometry.dispose?.();
				mesh.material.dispose?.();
				scene.remove(mesh);
			}
			scene.remove(ambient);
			scene.remove(sun);
		},
	};
}
