import * as EASEL from "@/index.js";

export const meta = {
	id: "geometries",
	name: "Geometry Types",
	category: "geometry",
	description: "14 built-in geometry types displayed in a 4-column grid.",
};

export const controls = [];

function buildLathePoints() {
	/** @type {EASEL.Vector2[]} */
	const pts = [];
	for (let i = 0; i < 10; i++) {
		pts.push(new EASEL.Vector2(Math.sin(i * 0.2) * 0.5 + 0.3, (i - 5) * 0.15));
	}
	return pts;
}

export function setup(canvas) {
	const width = canvas.width;
	const height = canvas.height;

	const scene = new EASEL.Scene();
	const camera = new EASEL.PerspectiveCamera({
		fov: 45,
		aspect: width / height,
		near: 0.1,
		far: 100,
	});
	camera.position.z = 20;

	const renderer = new EASEL.Renderer({ canvas, width, height });

	scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
	const dirLight = new EASEL.DirectionalLight(0xffffff, 0.8);
	dirLight.position.set(5, 10, 7);
	scene.add(dirLight);

	const entries = [
		{ geo: new EASEL.BoxGeometry(1.2, 1.2, 1.2), color: 0xe06060 },
		{ geo: new EASEL.SphereGeometry(0.8, 16, 12), color: 0x60e060 },
		{ geo: new EASEL.CylinderGeometry(0.5, 0.5, 1.4, 16), color: 0x6060e0 },
		{ geo: new EASEL.ConeGeometry(0.7, 1.4, 16), color: 0xe0e060 },
		{ geo: new EASEL.TorusGeometry(0.6, 0.25, 12, 24), color: 0xe060e0 },
		{ geo: new EASEL.TorusKnotGeometry(0.5, 0.18, 48, 8), color: 0x60e0e0 },
		{
			geo: new EASEL.PlaneGeometry(1.2, 1.2),
			color: 0xe09040,
			side: EASEL.Side.Double,
		},
		{
			geo: new EASEL.RingGeometry(0.3, 0.8, 24),
			color: 0x40e090,
			side: EASEL.Side.Double,
		},
		{ geo: new EASEL.IcosahedronGeometry(0.8), color: 0x9040e0 },
		{ geo: new EASEL.OctahedronGeometry(0.8), color: 0xe04090 },
		{ geo: new EASEL.TetrahedronGeometry(0.9), color: 0x90e040 },
		{ geo: new EASEL.DodecahedronGeometry(0.7), color: 0x40a0e0 },
		{ geo: new EASEL.CapsuleGeometry(0.35, 0.7, 8, 12), color: 0xe0a040 },
		{ geo: new EASEL.LatheGeometry(buildLathePoints(), 16), color: 0xa040e0 },
	];

	const cols = 4;
	const spacing = 3.0;
	/** @type {EASEL.Mesh[]} */
	const meshes = [];

	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		const col = i % cols;
		const row = Math.floor(i / cols);
		const mesh = new EASEL.Mesh(
			entry.geo,
			new EASEL.LambertMaterial({ color: entry.color, side: entry.side }),
		);
		mesh.position.x = (col - (cols - 1) / 2) * spacing;
		mesh.position.y =
			-(row - (Math.ceil(entries.length / cols) - 1) / 2) * spacing;
		scene.add(mesh);
		meshes.push(mesh);
	}

	const clock = new EASEL.Clock();
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

export const easelSource = `import * as EASEL from "easel";

const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 45,
  aspect: 800 / 600,
  near: 0.1,
  far: 100,
});
camera.position.z = 20;

scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
const dirLight = new EASEL.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

const pts = [];
for (let i = 0; i < 10; i++) {
  pts.push(new EASEL.Vector2(Math.sin(i * 0.2) * 0.5 + 0.3, (i - 5) * 0.15));
}

const entries = [
  { geo: new EASEL.BoxGeometry(1.2, 1.2, 1.2), color: 0xe06060 },
  { geo: new EASEL.SphereGeometry(0.8, 16, 12), color: 0x60e060 },
  { geo: new EASEL.CylinderGeometry(0.5, 0.5, 1.4, 16), color: 0x6060e0 },
  { geo: new EASEL.ConeGeometry(0.7, 1.4, 16), color: 0xe0e060 },
  { geo: new EASEL.TorusGeometry(0.6, 0.25, 12, 24), color: 0xe060e0 },
  { geo: new EASEL.TorusKnotGeometry(0.5, 0.18, 48, 8), color: 0x60e0e0 },
  { geo: new EASEL.PlaneGeometry(1.2, 1.2), color: 0xe09040, side: EASEL.Side.Double },
  { geo: new EASEL.RingGeometry(0.3, 0.8, 24), color: 0x40e090, side: EASEL.Side.Double },
  { geo: new EASEL.IcosahedronGeometry(0.8), color: 0x9040e0 },
  { geo: new EASEL.OctahedronGeometry(0.8), color: 0xe04090 },
  { geo: new EASEL.TetrahedronGeometry(0.9), color: 0x90e040 },
  { geo: new EASEL.DodecahedronGeometry(0.7), color: 0x40a0e0 },
  { geo: new EASEL.CapsuleGeometry(0.35, 0.7, 8, 12), color: 0xe0a040 },
  { geo: new EASEL.LatheGeometry(pts, 16), color: 0xa040e0 },
];

for (let i = 0; i < entries.length; i++) {
  const entry = entries[i];
  const mesh = new EASEL.Mesh(
    entry.geo,
    new EASEL.LambertMaterial({ color: entry.color, side: entry.side }),
  );
  mesh.position.x = (i % 4 - 1.5) * 3;
  mesh.position.y = -(Math.floor(i / 4) - 1.5) * 3;
  scene.add(mesh);
}`;

export const threeSource = `import * as THREE from "three";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  800 / 600,
  0.1,
  100,
);
camera.position.z = 20;

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

const entries = [
  { geo: new THREE.BoxGeometry(1.2, 1.2, 1.2), color: 0xe06060 },
  { geo: new THREE.SphereGeometry(0.8, 16, 12), color: 0x60e060 },
  { geo: new THREE.CylinderGeometry(0.5, 0.5, 1.4, 16), color: 0x6060e0 },
  { geo: new THREE.ConeGeometry(0.7, 1.4, 16), color: 0xe0e060 },
  { geo: new THREE.TorusGeometry(0.6, 0.25, 12, 24), color: 0xe060e0 },
  { geo: new THREE.TorusKnotGeometry(0.5, 0.18, 48, 8), color: 0x60e0e0 },
  { geo: new THREE.PlaneGeometry(1.2, 1.2), color: 0xe09040 },
  { geo: new THREE.RingGeometry(0.3, 0.8, 24), color: 0x40e090 },
  { geo: new THREE.IcosahedronGeometry(0.8), color: 0x9040e0 },
  { geo: new THREE.OctahedronGeometry(0.8), color: 0xe04090 },
  { geo: new THREE.TetrahedronGeometry(0.9), color: 0x90e040 },
  { geo: new THREE.DodecahedronGeometry(0.7), color: 0x40a0e0 },
  { geo: new THREE.CapsuleGeometry(0.35, 0.7, 8, 12), color: 0xe0a040 },
];

for (let i = 0; i < entries.length; i++) {
  const entry = entries[i];
  const mesh = new THREE.Mesh(
    entry.geo,
    new THREE.MeshLambertMaterial({ color: entry.color }),
  );
  mesh.position.x = (i % 4 - 1.5) * 3;
  mesh.position.y = -(Math.floor(i / 4) - 1.5) * 3;
  scene.add(mesh);
}`;
