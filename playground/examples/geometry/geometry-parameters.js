import {
	AmbientLight,
	Clock,
	ConeGeometry,
	CylinderGeometry,
	DirectionalLight,
	LambertMaterial,
	Mesh,
	OrthographicCamera,
	Renderer,
	Scene,
	SphereGeometry,
	TorusGeometry,
} from "@/index.js";

export const controls = [
	{
		type: "select",
		key: "shape",
		label: "Shape",
		options: ["Sphere", "Torus", "Cylinder", "Cone"],
		default: "Sphere",
	},
	{
		type: "slider",
		key: "segments",
		label: "Segments",
		min: 3,
		max: 32,
		step: 1,
		default: 16,
	},
];

function buildGeometry(shape, segments) {
	switch (shape) {
		case "Torus":
			return new TorusGeometry(0.9, 0.35, segments, segments * 2);
		case "Cylinder":
			return new CylinderGeometry(0.7, 0.7, 1.8, segments);
		case "Cone":
			return new ConeGeometry(0.9, 1.8, segments);
		default:
			return new SphereGeometry(
				1.1,
				segments,
				Math.max(3, Math.floor(segments * 0.75)),
			);
	}
}

export function setup(canvas, params = {}) {
	const width = canvas.width;
	const height = canvas.height;
	const aspect = width / height;
	const size = 3;

	const scene = new Scene();
	const camera = new OrthographicCamera({
		left: -size * aspect,
		right: size * aspect,
		top: size,
		bottom: -size,
		near: 0.1,
		far: 100,
	});
	camera.position.z = 5;

	const renderer = new Renderer({ canvas, width, height });

	scene.add(new AmbientLight(0xffffff, 0.4));
	const dirLight = new DirectionalLight(0xffffff, 0.8);
	dirLight.position.set(3, 5, 4);
	scene.add(dirLight);

	let currentShape = params.shape ?? "Sphere";
	let currentSegments = params.segments ?? 16;

	const material = new LambertMaterial({ color: 0x5577dd });
	let mesh = new Mesh(buildGeometry(currentShape, currentSegments), material);
	scene.add(mesh);

	const clock = new Clock();
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		mesh.rotation.x += 0.3 * dt;
		mesh.rotation.y += 0.5 * dt;
		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			if (newParams.shape !== undefined) currentShape = newParams.shape;
			if (newParams.segments !== undefined) {
				currentSegments = newParams.segments;
			}

			const rotation = { x: mesh.rotation.x, y: mesh.rotation.y };
			scene.remove(mesh);
			mesh = new Mesh(buildGeometry(currentShape, currentSegments), material);
			mesh.rotation.x = rotation.x;
			mesh.rotation.y = rotation.y;
			scene.add(mesh);
		},
	};
}

export const source = `import {
  Scene, OrthographicCamera, Renderer, Clock,
  AmbientLight, DirectionalLight,
  SphereGeometry, TorusGeometry, CylinderGeometry, ConeGeometry,
  LambertMaterial, Mesh,
} from "easel";

function buildGeometry(shape, segments) {
  if (shape === "Torus") return new TorusGeometry(0.9, 0.35, segments, segments * 2);
  if (shape === "Cylinder") return new CylinderGeometry(0.7, 0.7, 1.8, segments);
  if (shape === "Cone") return new ConeGeometry(0.9, 1.8, segments);
  return new SphereGeometry(1.1, segments, Math.floor(segments * 0.75));
}

// On param change: remove old mesh, rebuild with new segments, re-add.
scene.remove(mesh);
mesh = new Mesh(buildGeometry(shape, segments), material);
scene.add(mesh);`;
