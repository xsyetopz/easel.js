import * as EASEL from "@/index.js";

const PALETTE = [
	0xe74c3c, // red
	0xe67e22, // orange
	0xf1c40f, // yellow
	0x2ecc71, // green
	0x1abc9c, // teal
];

const COLS = 3;
const SPACING = 3;

/**
 * Returns the world-space position for grid index i in a 3x2 grid.
 *
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
 * Primitives zone - Box, Sphere, Cylinder, Cone, Capsule.
 *
 * @param {EASEL.Scene} scene
 * @param {EASEL.PerspectiveCamera} camera
 * @returns {{ controls: Array<object>, animate: (dt: number) => void, update: (params: Record<string, unknown>) => void, dispose: () => void }}
 */
export function setup(scene, camera) {
	camera.position.set(6, 5, 9);
	camera.lookAt(0, 0, 0);

	const ambient = new EASEL.AmbientLight(0xffffff, 0.5);
	scene.add(ambient);

	const sun = new EASEL.DirectionalLight(0xffffff, 0.6);
	sun.position.set(5, 10, 7);
	scene.add(sun);

	const geometries = [
		{ label: "Box", geometry: new EASEL.BoxGeometry(1.2, 1.2, 1.2) },
		{ label: "Sphere", geometry: new EASEL.SphereGeometry(0.7, 8, 6) },
		{
			label: "Cylinder",
			geometry: new EASEL.CylinderGeometry(0.5, 0.5, 1.2, 8),
		},
		{ label: "Cone", geometry: new EASEL.ConeGeometry(0.6, 1.2, 8) },
		{ label: "Capsule", geometry: new EASEL.CapsuleGeometry(0.35, 0.7, 4, 8) },
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

	const rotSpeeds = meshes.map((_, i) => 0.3 + (i % 5) * 0.12);

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
