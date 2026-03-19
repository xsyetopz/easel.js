import {
	AmbientLight,
	BasicMaterial,
	BoxGeometry,
	CapsuleGeometry,
	CatmullRomCurve3,
	ConeGeometry,
	CylinderGeometry,
	DirectionalLight,
	DodecahedronGeometry,
	ExtrudeGeometry,
	IcosahedronGeometry,
	LatheGeometry,
	Mesh,
	OctahedronGeometry,
	PlaneGeometry,
	RingGeometry,
	Shape,
	ShapeGeometry,
	SphereGeometry,
	TetrahedronGeometry,
	TorusGeometry,
	TorusKnotGeometry,
	TubeGeometry,
	Vector2,
	Vector3,
} from "@/index.js";

/** Color palette - one distinct hue per geometry slot. */
const PALETTE = [
	0xe74c3c, // red
	0xe67e22, // orange
	0xf1c40f, // yellow
	0x2ecc71, // green
	0x1abc9c, // teal
	0x3498db, // blue
	0x9b59b6, // purple
	0xe91e8c, // pink
	0x00bcd4, // cyan
	0xff5722, // deep-orange
	0x8bc34a, // light-green
	0x607d8b, // blue-grey
	0xf06292, // rose
	0x4db6ac, // mint
	0xffd54f, // amber
	0xce93d8, // lavender
	0x80cbc4, // seafoam
];

/** Grid: 5 columns, 4 rows (last row has 2). */
const COLS = 5;
const SPACING = 3;

/**
 * Builds a simple star Shape for ShapeGeometry / ExtrudeGeometry.
 *
 * @returns {Shape}
 */
function buildStarShape() {
	const shape = new Shape();
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
 * Builds a helix CatmullRomCurve3 path for TubeGeometry.
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
 * Returns all 17 geometry descriptors in display order.
 *
 * @returns {Array<{ label: string, geometry: import("@/index.js").Geometry }>}
 */
function buildGeometries() {
	const star = buildStarShape();
	return [
		{ label: "Box", geometry: new BoxGeometry(1.2, 1.2, 1.2) },
		{ label: "Sphere", geometry: new SphereGeometry(0.7, 8, 6) },
		{ label: "Plane", geometry: new PlaneGeometry(1.4, 1.4) },
		{ label: "Cylinder", geometry: new CylinderGeometry(0.5, 0.5, 1.2, 8) },
		{ label: "Cone", geometry: new ConeGeometry(0.6, 1.2, 8) },
		{ label: "Torus", geometry: new TorusGeometry(0.5, 0.2, 8, 16) },
		{ label: "TorusKnot", geometry: new TorusKnotGeometry(0.4, 0.15, 48, 6) },
		{ label: "Capsule", geometry: new CapsuleGeometry(0.35, 0.7, 4, 8) },
		{ label: "Ring", geometry: new RingGeometry(0.3, 0.7, 12) },
		{ label: "Icosahedron", geometry: new IcosahedronGeometry(0.7, 0) },
		{ label: "Octahedron", geometry: new OctahedronGeometry(0.7, 0) },
		{ label: "Tetrahedron", geometry: new TetrahedronGeometry(0.8, 0) },
		{ label: "Dodecahedron", geometry: new DodecahedronGeometry(0.65, 0) },
		{ label: "Lathe", geometry: new LatheGeometry(buildLatheProfile(), 10) },
		{
			label: "Tube",
			geometry: new TubeGeometry(buildHelixCurve(), 30, 0.15, 6, false),
		},
		{ label: "Shape", geometry: new ShapeGeometry(star, 6) },
		{
			label: "Extrude",
			geometry: new ExtrudeGeometry(star, { depth: 0.4, bevelEnabled: false }),
		},
	];
}

/**
 * Returns the world-space position for grid index i.
 *
 * @param {number} i
 * @returns {{ x: number, z: number }}
 */
function gridPosition(i) {
	const col = i % COLS;
	const row = Math.floor(i / COLS);
	const totalCols = COLS;
	const totalRows = Math.ceil(17 / COLS);
	const x = (col - (totalCols - 1) / 2) * SPACING;
	const z = (row - (totalRows - 1) / 2) * SPACING;
	return { x, z };
}

/**
 * Geometry Gallery zone - displays all 17 geometry primitives in a 5x4 grid.
 *
 * @param {import("@/index.js").Scene} scene
 * @param {import("@/index.js").PerspectiveCamera} camera
 * @returns {{ controls: Array<object>, animate: (dt: number) => void, update: (params: Record<string, unknown>) => void, dispose: () => void }}
 */
export function setup(scene, camera) {
	camera.position.set(10, 8, 15);
	camera.lookAt(0, 0, 0);

	const ambient = new AmbientLight(0xffffff, 0.5);
	scene.add(ambient);

	const sun = new DirectionalLight(0xffffff, 0.6);
	sun.position.set(5, 10, 7);
	scene.add(sun);

	const descriptors = buildGeometries();

	/** @type {Mesh[]} */
	const meshes = descriptors.map(({ geometry }, i) => {
		const material = new BasicMaterial({ color: PALETTE[i % PALETTE.length] });
		const mesh = new Mesh(geometry, material);
		const { x, z } = gridPosition(i);
		mesh.position.set(x, 0, z);
		scene.add(mesh);
		return mesh;
	});

	/** Distinct rotation speeds so each mesh spins differently. */
	const rotSpeeds = meshes.map((_, i) => 0.3 + (i % 7) * 0.1);

	return {
		controls: [
			{
				type: "select",
				key: "wireframe",
				label: "Display Mode",
				options: ["Solid", "Wireframe"],
				default: "Solid",
			},
		],

		/**
		 * @param {number} dt - Delta time in seconds.
		 */
		animate(dt) {
			for (let i = 0; i < meshes.length; i++) {
				meshes[i].rotation.y += rotSpeeds[i] * dt;
				meshes[i].rotation.x += rotSpeeds[i] * 0.4 * dt;
			}
		},

		/**
		 * @param {{ wireframe?: string }} params
		 */
		update(params) {
			const isWireframe = params.wireframe === "Wireframe";
			for (const mesh of meshes) {
				mesh.material.wireframe = isWireframe;
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
