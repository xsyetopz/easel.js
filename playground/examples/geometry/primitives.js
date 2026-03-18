import {
	AmbientLight,
	BoxGeometry,
	Camera,
	CapsuleGeometry,
	Clock,
	ConeGeometry,
	CylinderGeometry,
	DirectionalLight,
	DodecahedronGeometry,
	IcosahedronGeometry,
	LambertMaterial,
	Mesh,
	OctahedronGeometry,
	Renderer,
	RingGeometry,
	Scene,
	SphereGeometry,
	TorusGeometry,
	TorusKnotGeometry,
} from "@/index.js";

export function setup(canvas) {
	const width = canvas.width;
	const height = canvas.height;
	const aspect = width / height;
	const size = 8;

	const scene = new Scene();
	const camera = new Camera({
		left: -size * aspect,
		right: size * aspect,
		top: size,
		bottom: -size,
		near: 0.1,
		far: 100,
	});
	camera.position.z = 15;

	const renderer = new Renderer({ canvas, width, height });

	scene.add(new AmbientLight(0xffffff, 0.4));
	const dirLight = new DirectionalLight(0xffffff, 0.8);
	dirLight.position.set(5, 10, 7);
	scene.add(dirLight);

	const geometries = [
		{ geo: new BoxGeometry(1.2, 1.2, 1.2), color: 0xe06060 },
		{ geo: new SphereGeometry(0.8, 16, 12), color: 0x60e060 },
		{ geo: new CylinderGeometry(0.5, 0.5, 1.4, 16), color: 0x6060e0 },
		{ geo: new ConeGeometry(0.7, 1.4, 16), color: 0xe0e060 },
		{ geo: new TorusGeometry(0.6, 0.25, 12, 24), color: 0xe060e0 },
		{ geo: new TorusKnotGeometry(0.5, 0.18, 64, 8), color: 0x60e0e0 },
		{ geo: new IcosahedronGeometry(0.8), color: 0xe09040 },
		{ geo: new DodecahedronGeometry(0.8), color: 0x40e090 },
		{ geo: new OctahedronGeometry(0.8), color: 0x9040e0 },
		{ geo: new CapsuleGeometry(0.4, 0.8, 8, 12), color: 0xe04090 },
		{ geo: new RingGeometry(0.3, 0.8, 24), color: 0x90e040 },
	];

	const cols = 4;
	const spacing = 3;
	const meshes = [];

	geometries.forEach((entry, i) => {
		const col = i % cols;
		const row = Math.floor(i / cols);
		const mesh = new Mesh(
			entry.geo,
			new LambertMaterial({ color: entry.color }),
		);
		mesh.position.x = (col - (cols - 1) / 2) * spacing;
		mesh.position.y = -row * spacing + spacing;
		scene.add(mesh);
		meshes.push(mesh);
	});

	const clock = new Clock();
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		for (const mesh of meshes) {
			mesh.rotation.x += 0.4 * dt;
			mesh.rotation.y += 0.6 * dt;
		}
		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId != undefined) cancelAnimationFrame(animId);
		},
	};
}

export const source = `import {
  Scene, Camera, Renderer, Clock,
  AmbientLight, DirectionalLight, LambertMaterial, Mesh,
  BoxGeometry, SphereGeometry, CylinderGeometry,
  ConeGeometry, TorusGeometry, TorusKnotGeometry,
  IcosahedronGeometry, DodecahedronGeometry,
} from "easel";

// Create scene with directional + ambient light
const scene = new Scene();
scene.add(new AmbientLight(0xffffff, 0.4));
const dirLight = new DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// Grid of geometry primitives
const geometries = [
  new BoxGeometry(1.2, 1.2, 1.2),
  new SphereGeometry(0.8, 16, 12),
  new CylinderGeometry(0.5, 0.5, 1.4, 16),
  new ConeGeometry(0.7, 1.4, 16),
  new TorusGeometry(0.6, 0.25, 12, 24),
  new TorusKnotGeometry(0.5, 0.18, 64, 8),
  new IcosahedronGeometry(0.8),
  new DodecahedronGeometry(0.8),
];

geometries.forEach((geo, i) => {
  const mesh = new Mesh(geo, new LambertMaterial({ color: 0xe06060 + i * 0x002020 }));
  mesh.position.x = (i % 4 - 1.5) * 3;
  mesh.position.y = Math.floor(i / 4) * -3 + 1.5;
  scene.add(mesh);
});`;
