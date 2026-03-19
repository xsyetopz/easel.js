import * as EASEL from "@/index.js";

/** 4×4 grid layout constants. */
const GRID = 4;
const SPACING = 1.5;

/**
 * A fixed palette of distinct hues for the 16 cubes.
 * @type {number[]}
 */
const PALETTE = [
	0xe74c3c, 0xe67e22, 0xf1c40f, 0x2ecc71, 0x1abc9c, 0x3498db, 0x9b59b6,
	0xe91e8c, 0x00bcd4, 0xff5722, 0x8bc34a, 0x607d8b, 0xf06292, 0x4db6ac,
	0xffd54f, 0xce93d8,
];

/**
 * Interaction zone - hover over cubes to highlight them via Raycaster picking.
 *
 * @param {EASEL.Scene} scene
 * @param {EASEL.PerspectiveCamera} camera
 * @param {HTMLCanvasElement} canvas
 * @returns {{ controls: Array<object>, animate: (dt: number) => void, update: (params: Record<string, unknown>) => void, dispose: () => void }}
 */
export function setup(scene, camera, canvas) {
	camera.position.set(0, 2, 10);
	camera.lookAt(new EASEL.Vector3(0, 0, 0));

	const ambient = new EASEL.AmbientLight(0xffffff, 0.4);
	scene.add(ambient);

	const sun = new EASEL.DirectionalLight(0xffffff, 0.7);
	sun.position.set(3, 5, 4);
	scene.add(sun);

	/** @type {EASEL.Mesh[]} */
	const cubes = [];
	/** @type {number[]} */
	const baseColors = [];

	for (let row = 0; row < GRID; row++) {
		for (let col = 0; col < GRID; col++) {
			const idx = row * GRID + col;
			const color = PALETTE[idx];
			const mat = new EASEL.LambertMaterial({ color });
			const mesh = new EASEL.Mesh(new EASEL.BoxGeometry(0.8, 0.8, 0.8), mat);
			mesh.position.set(
				(col - (GRID - 1) / 2) * SPACING,
				(row - (GRID - 1) / 2) * SPACING,
				0,
			);
			scene.add(mesh);
			cubes.push(mesh);
			baseColors.push(color);
		}
	}

	const raycaster = new EASEL.Raycaster();
	/** @type {EASEL.Mesh|null} */
	let hoveredCube = null;

	/**
	 * @param {PointerEvent} event
	 */
	function onPointerMove(event) {
		const x = (event.offsetX / canvas.clientWidth) * 2 - 1;
		const y = -(event.offsetY / canvas.clientHeight) * 2 + 1;

		camera.updateMatrixWorld();
		const projInv = new EASEL.Matrix4().copy(camera.projectionMatrix).invert();

		raycaster.setFromCamera(
			{ x, y },
			{
				type: camera.type,
				matrixWorld: camera.matrixWorld,
				projectionMatrixInverse: projInv,
			},
		);

		const hits = raycaster.intersectObjects(cubes);

		// Restore previously hovered cube
		if (hoveredCube !== null) {
			const prevIdx = cubes.indexOf(hoveredCube);
			if (prevIdx !== -1) {
				hoveredCube.material.color = baseColors[prevIdx];
			}
			hoveredCube = null;
		}

		if (hits.length > 0) {
			const hit = /** @type {EASEL.Mesh} */ (
				/** @type {unknown} */ (hits[0].object)
			);
			hit.material.color = 0xffffff;
			hoveredCube = hit;
		}
	}

	canvas.addEventListener("pointermove", onPointerMove);

	return {
		controls: [],

		/**
		 * @param {number} _dt
		 */
		animate(_dt) {
			// no-op: cubes are static; picking is event-driven
		},

		/**
		 * @param {Record<string, unknown>} _params
		 */
		update(_params) {
			// no-op: no reactive params
		},

		dispose() {
			canvas.removeEventListener("pointermove", onPointerMove);
			for (const cube of cubes) {
				cube.geometry.dispose?.();
				cube.material.dispose?.();
			}
		},
	};
}
