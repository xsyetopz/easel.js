import {
	AmbientLight,
	BoxGeometry,
	Clock,
	Color,
	DirectionalLight,
	LambertMaterial,
	Matrix4,
	Mesh,
	PerspectiveCamera,
	Raycaster,
	Renderer,
	Scene,
} from "@/index.js";

export function setup(canvas, _params = {}) {
	const width = canvas.width;
	const height = canvas.height;

	const scene = new Scene();
	const camera = new PerspectiveCamera({
		fov: Math.PI / 4,
		aspect: width / height,
		near: 0.1,
		far: 100,
	});
	camera.position.set(0, 1, 12);

	const renderer = new Renderer({ canvas, width, height });

	scene.add(new AmbientLight(0xffffff, 0.4));
	const dirLight = new DirectionalLight(0xffffff, 0.8);
	dirLight.position.set(5, 8, 6);
	scene.add(dirLight);

	const gridSize = 5;
	const boxSize = 0.8;
	const spacing = 1.4;

	/** @type {Mesh[]} */
	const cubes = [];
	/** @type {Map<Mesh, number>} */
	const originalColors = new Map();

	for (let row = 0; row < gridSize; row++) {
		for (let col = 0; col < gridSize; col++) {
			const color =
				Math.floor(Math.random() * 0x606060) +
				0x404040 +
				(Math.floor(Math.random() * 0x40) << 16) +
				(Math.floor(Math.random() * 0x40) << 8);
			const mesh = new Mesh(
				new BoxGeometry(boxSize, boxSize, boxSize),
				new LambertMaterial({ color }),
			);
			mesh.position.set(
				(col - (gridSize - 1) / 2) * spacing,
				(row - (gridSize - 1) / 2) * spacing,
				0,
			);
			scene.add(mesh);
			cubes.push(mesh);
			originalColors.set(mesh, color);
		}
	}

	const raycaster = new Raycaster();
	/** @type {Mesh|null} */
	let hoveredCube = null;

	/**
	 * Compute a camera-compatible object with projectionMatrixInverse
	 * for use with Raycaster.setFromCamera.
	 */
	function getCameraForRaycaster() {
		camera.updateMatrixWorld();
		const projInv = new Matrix4().copy(camera.projectionMatrix).invert();
		return {
			type: camera.type,
			matrixWorld: camera.matrixWorld,
			projectionMatrixInverse: projInv,
		};
	}

	function onMouseMove(event) {
		const x = (event.offsetX / canvas.clientWidth) * 2 - 1;
		const y = -(event.offsetY / canvas.clientHeight) * 2 + 1;

		raycaster.setFromCamera({ x, y }, getCameraForRaycaster());
		const hits = raycaster.intersectObjects(cubes);
		const hit = hits.length > 0 ? /** @type {Mesh} */ (hits[0].object) : null;

		if (hit !== hoveredCube) {
			if (hoveredCube !== null) {
				const orig = originalColors.get(hoveredCube);
				if (orig !== undefined) {
					hoveredCube.material.color.set(orig);
				}
			}
			hoveredCube = hit;
			if (hoveredCube !== null) {
				const orig = originalColors.get(hoveredCube) ?? 0xffffff;
				const bright = new Color(orig);
				bright.r = Math.min(1, bright.r * 1.6);
				bright.g = Math.min(1, bright.g * 1.6);
				bright.b = Math.min(1, bright.b * 1.6);
				hoveredCube.material.color.copy(bright);
			}
		}
	}

	canvas.addEventListener("mousemove", onMouseMove);

	const clock = new Clock();
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		clock.delta; // advance clock
		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
			canvas.removeEventListener("mousemove", onMouseMove);
		},
	};
}

export const source = `import {
  Scene, PerspectiveCamera, Renderer, Clock,
  AmbientLight, DirectionalLight, Raycaster, Color, Matrix4,
  BoxGeometry, LambertMaterial, Mesh,
} from "easel";

// On mousemove: convert to NDC, raycast, highlight hit cube.
canvas.addEventListener("mousemove", (event) => {
  const x = (event.offsetX / canvas.clientWidth) * 2 - 1;
  const y = -(event.offsetY / canvas.clientHeight) * 2 + 1;

  camera.updateMatrixWorld();
  const camForRay = {
    type: camera.type,
    matrixWorld: camera.matrixWorld,
    projectionMatrixInverse: new Matrix4().copy(camera.projectionMatrix).invert(),
  };

  raycaster.setFromCamera({ x, y }, camForRay);
  const hits = raycaster.intersectObjects(cubes);
  if (hits.length > 0) {
    hits[0].object.material.color.set(0xffffff);
  }
});`;
