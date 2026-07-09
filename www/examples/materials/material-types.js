import * as EASEL from "@/index.js";

export const meta = {
	id: "material-types",
	name: "Material Types",
	category: "materials",
	description:
		"Three spheres showing BasicMaterial, LambertMaterial, and ToonMaterial side by side.",
};

export const controls = [
	{ type: "color", key: "color", label: "Base Color", default: "#4488ff" },
];

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Record<string, unknown>} [params]
 */
export function setup(canvas, params = {}) {
	const width = canvas.width;
	const height = canvas.height;
	const aspect = width / height;
	const size = 5;

	const scene = new EASEL.Scene();
	const camera = new EASEL.OrthographicCamera({
		left: -size * aspect,
		right: size * aspect,
		top: size,
		bottom: -size,
		near: 0.1,
		far: 100,
	});
	camera.position.z = 8;

	const renderer = new EASEL.Renderer({ canvas, width, height });

	scene.add(new EASEL.AmbientLight(0xffffff, 0.3));
	const dirLight = new EASEL.DirectionalLight(0xffffff, 0.9);
	dirLight.position.set(3, 5, 4);
	scene.add(dirLight);

	const color = params.color ?? 0x4488ff;

	const basicMat = new EASEL.BasicMaterial({ color });
	const lambertMat = new EASEL.LambertMaterial({ color });
	const toonMat = new EASEL.ToonMaterial({ color });

	const basic = new EASEL.Mesh(new EASEL.SphereGeometry(1.2, 24, 16), basicMat);
	basic.position.x = -3.5;
	scene.add(basic);

	const lambert = new EASEL.Mesh(
		new EASEL.SphereGeometry(1.2, 24, 16),
		lambertMat,
	);
	scene.add(lambert);

	const toon = new EASEL.Mesh(new EASEL.SphereGeometry(1.2, 24, 16), toonMat);
	toon.position.x = 3.5;
	scene.add(toon);

	const meshes = [basic, lambert, toon];
	const materials = [basicMat, lambertMat, toonMat];

	const clock = new EASEL.Clock();
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		for (const m of meshes) {
			m.rotation.y += 0.4 * dt;
		}
		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			if (newParams.color) {
				for (const mat of materials) mat.color.set(newParams.color);
			}
		},
	};
}

export const easelSource = `import * as EASEL from "easel";

const scene = new EASEL.Scene();
const camera = new EASEL.OrthographicCamera({
  left: -size * aspect, right: size * aspect,
  top: size, bottom: -size,
  near: 0.1, far: 100,
});

scene.add(new EASEL.AmbientLight(0xffffff, 0.3));
const dirLight = new EASEL.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(3, 5, 4);
scene.add(dirLight);

const geo = new EASEL.SphereGeometry(1.2, 24, 16);

const basic = new EASEL.Mesh(geo, new EASEL.BasicMaterial({ color: 0x4488ff }));
basic.position.x = -3.5;

const lambert = new EASEL.Mesh(geo, new EASEL.LambertMaterial({ color: 0x4488ff }));

const toon = new EASEL.Mesh(geo, new EASEL.ToonMaterial({ color: 0x4488ff }));
toon.position.x = 3.5;`;

export const threeSource = `import * as THREE from "three";

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(
  -size * aspect, size * aspect, size, -size, 0.1, 100,
);

scene.add(new THREE.AmbientLight(0xffffff, 0.3));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(3, 5, 4);
scene.add(dirLight);

const geo = new THREE.SphereGeometry(1.2, 24, 16);

const basic = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x4488ff }));
basic.position.x = -3.5;

const lambert = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x4488ff }));

const toon = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: 0x4488ff }));
toon.position.x = 3.5;`;
