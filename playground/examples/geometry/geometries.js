import {
	AmbientLight,
	BoxGeometry,
	CapsuleGeometry,
	Clock,
	ConeGeometry,
	CylinderGeometry,
	DirectionalLight,
	DodecahedronGeometry,
	IcosahedronGeometry,
	LambertMaterial,
	LatheGeometry,
	Mesh,
	OctahedronGeometry,
	PerspectiveCamera,
	PlaneGeometry,
	Renderer,
	RingGeometry,
	Scene,
	Side,
	SphereGeometry,
	TetrahedronGeometry,
	TorusGeometry,
	TorusKnotGeometry,
	Vector2,
} from "@/index.js";

function buildLathePoints() {
	/** @type {Vector2[]} */
	const pts = [];
	for (let i = 0; i < 10; i++) {
		pts.push(new Vector2(Math.sin(i * 0.2) * 0.5 + 0.3, (i - 5) * 0.15));
	}
	return pts;
}

export function setup(canvas) {
	const width = canvas.width;
	const height = canvas.height;

	const scene = new Scene();
	const camera = new PerspectiveCamera({
		fov: Math.PI / 4,
		aspect: width / height,
		near: 0.1,
		far: 100,
	});
	camera.position.z = 20;

	const renderer = new Renderer({ canvas, width, height });

	scene.add(new AmbientLight(0xffffff, 0.4));
	const dirLight = new DirectionalLight(0xffffff, 0.8);
	dirLight.position.set(5, 10, 7);
	scene.add(dirLight);

	const entries = [
		{ geo: new BoxGeometry(1.2, 1.2, 1.2), color: 0xe06060 },
		{ geo: new SphereGeometry(0.8, 16, 12), color: 0x60e060 },
		{ geo: new CylinderGeometry(0.5, 0.5, 1.4, 16), color: 0x6060e0 },
		{ geo: new ConeGeometry(0.7, 1.4, 16), color: 0xe0e060 },
		{ geo: new TorusGeometry(0.6, 0.25, 12, 24), color: 0xe060e0 },
		{ geo: new TorusKnotGeometry(0.5, 0.18, 48, 8), color: 0x60e0e0 },
		{ geo: new PlaneGeometry(1.2, 1.2), color: 0xe09040, side: Side.Double },
		{ geo: new RingGeometry(0.3, 0.8, 24), color: 0x40e090, side: Side.Double },
		{ geo: new IcosahedronGeometry(0.8), color: 0x9040e0 },
		{ geo: new OctahedronGeometry(0.8), color: 0xe04090 },
		{ geo: new TetrahedronGeometry(0.9), color: 0x90e040 },
		{ geo: new DodecahedronGeometry(0.7), color: 0x40a0e0 },
		{ geo: new CapsuleGeometry(0.35, 0.7, 8, 12), color: 0xe0a040 },
		{ geo: new LatheGeometry(buildLathePoints(), 16), color: 0xa040e0 },
	];

	const cols = 4;
	const spacing = 3.0;
	/** @type {Mesh[]} */
	const meshes = [];

	entries.forEach((entry, i) => {
		const col = i % cols;
		const row = Math.floor(i / cols);
		const mesh = new Mesh(
			entry.geo,
			new LambertMaterial({ color: entry.color, side: entry.side }),
		);
		mesh.position.x = (col - (cols - 1) / 2) * spacing;
		mesh.position.y =
			-(row - (Math.ceil(entries.length / cols) - 1) / 2) * spacing;
		scene.add(mesh);
		meshes.push(mesh);
	});

	const clock = new Clock();
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		for (const mesh of meshes) {
			mesh.rotation.y += 0.5 * dt;
		}
		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
	};
}

export const source = `import {
  Scene, PerspectiveCamera, Renderer, Clock,
  AmbientLight, DirectionalLight, LambertMaterial, Mesh,
  BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry,
  TorusGeometry, TorusKnotGeometry, PlaneGeometry, RingGeometry,
  IcosahedronGeometry, OctahedronGeometry, TetrahedronGeometry,
  DodecahedronGeometry, CapsuleGeometry, LatheGeometry, Vector2,
} from "easel";

// LatheGeometry takes Vector2[] - x=radius, y=height
const pts = [];
for (let i = 0; i < 10; i++) {
  pts.push(new Vector2(Math.sin(i * 0.2) * 0.5 + 0.3, (i - 5) * 0.15));
}
const lathe = new LatheGeometry(pts, 16);

// 14 geometry types in a 4-column grid
const entries = [
  new BoxGeometry(1.2, 1.2, 1.2),
  new SphereGeometry(0.8, 16, 12),
  new CylinderGeometry(0.5, 0.5, 1.4, 16),
  new ConeGeometry(0.7, 1.4, 16),
  // ... 10 more
];

entries.forEach((geo, i) => {
  const mesh = new Mesh(geo, new LambertMaterial({ color: 0xe06060 }));
  mesh.position.x = (i % 4 - 1.5) * 3;
  mesh.position.y = -(Math.floor(i / 4) - 1) * 3;
  scene.add(mesh);
});`;
