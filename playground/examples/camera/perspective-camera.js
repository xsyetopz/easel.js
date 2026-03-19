import * as EASEL from "@/index.js";

export const meta = {
	id: "perspective-camera",
	name: "Perspective Camera",
	category: "camera",
	description:
		"Frustum projection with adjustable field of view in degrees (same as THREE.js).",
};

export const controls = [
	{
		type: "slider",
		key: "fov",
		label: "Field of View (deg)",
		min: 10,
		max: 120,
		step: 1,
		default: 45,
	},
];

export function setup(canvas, params = {}) {
	const width = canvas.width;
	const height = canvas.height;
	const aspect = width / height;

	let fov = params.fov ?? 45;

	const scene = new EASEL.Scene();
	const camera = new EASEL.PerspectiveCamera({
		fov,
		aspect,
		near: 0.1,
		far: 100,
	});
	camera.position.set(0, 3, 10);
	camera.lookAt(new EASEL.Vector3(0, 0, 0));

	const renderer = new EASEL.Renderer({ canvas, width, height });

	scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
	const dirLight = new EASEL.DirectionalLight(0xffffff, 0.8);
	dirLight.position.set(5, 8, 6);
	scene.add(dirLight);

	const colors = [0xe05555, 0x55aa55, 0x5588e0];
	const zPositions = [0, -4, -8];

	const meshes = zPositions.map((z, i) => {
		const mesh = new EASEL.Mesh(
			new EASEL.BoxGeometry(1.2, 1.2, 1.2),
			new EASEL.LambertMaterial({ color: colors[i] }),
		);
		mesh.position.set(0, 0, z);
		scene.add(mesh);
		return mesh;
	});

	const clock = new EASEL.Clock();
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		for (const mesh of meshes) {
			mesh.rotation.y += 0.6 * dt;
		}
		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			if (newParams.fov !== undefined) {
				fov = newParams.fov;
				camera.fov = fov;
				camera.updateProjectionMatrix();
			}
		},
	};
}

export const easelSource = `import * as EASEL from "easel";

// EASEL: fov is in DEGREES, passed as an options object.
const camera = new EASEL.PerspectiveCamera({
  fov: 45,       // degrees — same as THREE.js
  aspect: 800 / 600,
  near: 0.1,
  far: 100,
});

// Live update:
camera.fov = 60;               // degrees
camera.updateProjectionMatrix();

const renderer = new EASEL.Renderer({ canvas, width: 800, height: 600 });
renderer.render(scene, camera);`;

export const threeSource = `import * as THREE from "three";

// THREE: fov is in DEGREES, passed as positional args.
const camera = new THREE.PerspectiveCamera(
  45,          // degrees
  800 / 600,
  0.1,
  100,
);

// Live update:
camera.fov = 60;                   // degrees
camera.updateProjectionMatrix();

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(800, 600);
renderer.render(scene, camera);`;
