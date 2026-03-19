import * as EASEL from "@/index.js";

const PALETTE = [
	0x3498db, // blue
	0x9b59b6, // purple
	0xe91e8c, // pink
	0x00bcd4, // cyan
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
 * Polyhedra zone - Icosahedron, Octahedron, Tetrahedron, Dodecahedron.
 *
 * @param {EASEL.Scene} scene
 * @param {EASEL.PerspectiveCamera} camera
 * @returns {{ controls: Array<object>, animate: (dt: number) => void, update: (params: Record<string, unknown>) => void, dispose: () => void }}
 */
export function setup(scene, camera) {
	camera.position.set(4, 4, 7);
	camera.lookAt(0, 0, 0);

	const ambient = new EASEL.AmbientLight(0xffffff, 0.5);
	scene.add(ambient);

	const sun = new EASEL.DirectionalLight(0xffffff, 0.6);
	sun.position.set(5, 10, 7);
	scene.add(sun);

	const geometries = [
		{ label: "Icosahedron", geometry: new EASEL.IcosahedronGeometry(0.8, 0) },
		{ label: "Octahedron", geometry: new EASEL.OctahedronGeometry(0.8, 0) },
		{ label: "Tetrahedron", geometry: new EASEL.TetrahedronGeometry(0.9, 0) },
		{ label: "Dodecahedron", geometry: new EASEL.DodecahedronGeometry(0.7, 0) },
	];

	/** @type {EASEL.Mesh[]} */
	const meshes = geometries.map(({ geometry }, i) => {
		const material = new EASEL.LambertMaterial({ color: PALETTE[i] });
		const mesh = new EASEL.Mesh(geometry, material);
		const { x, z } = gridPosition(i);
		mesh.position.set(x, 0, z);
		scene.add(mesh);
		return mesh;
	});

	const rotSpeeds = meshes.map((_, i) => 0.3 + i * 0.15);

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
