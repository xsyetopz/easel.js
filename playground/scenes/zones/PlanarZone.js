import * as EASEL from "@/index.js";

const PALETTE = [
	0xffd54f, // amber
	0xce93d8, // lavender
	0x80cbc4, // seafoam
	0x4db6ac, // mint
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
 * Builds a star Shape for ShapeGeometry / ExtrudeGeometry.
 *
 * @returns {EASEL.Shape}
 */
function buildStarShape() {
	const shape = new EASEL.Shape();
	const points = 5;
	const outer = 0.6;
	const inner = 0.3;
	for (let i = 0; i < points * 2; i++) {
		const angle = (Math.PI / points) * i - Math.PI / 2;
		const r = i % 2 === 0 ? outer : inner;
		const x = Math.cos(angle) * r;
		const y = Math.sin(angle) * r;
		if (i === 0) shape.moveTo(x, y);
		else shape.lineTo(x, y);
	}
	return shape;
}

/**
 * Planar zone - Plane, Ring, Shape, Extrude.
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

	const star = buildStarShape();

	const geometries = [
		{ label: "Plane", geometry: new EASEL.PlaneGeometry(1.4, 1.4) },
		{ label: "Ring", geometry: new EASEL.RingGeometry(0.3, 0.7, 12) },
		{ label: "Shape", geometry: new EASEL.ShapeGeometry(star, 6) },
		{
			label: "Extrude",
			geometry: new EASEL.ExtrudeGeometry(star, {
				depth: 0.4,
				bevelEnabled: false,
			}),
		},
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
