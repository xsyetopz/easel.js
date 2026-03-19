import * as EASEL from "@/index.js";

export const controls = [
	{ type: "color", key: "color", label: "Base Color", default: "#4488ff" },
];

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

	const geo = new EASEL.SphereGeometry(1.2, 24, 16);
	const color = params.color ?? 0x4488ff;

	const basicMat = new EASEL.BasicMaterial({ color });
	const lambertMat = new EASEL.LambertMaterial({ color });
	const toonMat = new EASEL.ToonMaterial({ color });

	const basic = new EASEL.Mesh(geo, basicMat);
	basic.position.x = -3.5;
	scene.add(basic);

	const lambert = new EASEL.Mesh(geo, lambertMat);
	scene.add(lambert);

	const toon = new EASEL.Mesh(geo, toonMat);
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

export const source = `import {
  EASEL.Scene, EASEL.OrthographicCamera, EASEL.Renderer, EASEL.Clock,
  EASEL.AmbientLight, EASEL.DirectionalLight,
  EASEL.SphereGeometry, EASEL.Mesh,
  EASEL.BasicMaterial, EASEL.LambertMaterial, EASEL.ToonMaterial,
} from "easel";

// Three spheres: EASEL.BasicMaterial, EASEL.LambertMaterial, EASEL.ToonMaterial
// Same geometry, same light - different shading models.

const geo = new EASEL.SphereGeometry(1.2, 24, 16);

const basic = new EASEL.Mesh(geo, new EASEL.BasicMaterial({ color: 0x4488ff }));
basic.position.x = -3.5;  // No lighting response

const lambert = new EASEL.Mesh(geo, new EASEL.LambertMaterial({ color: 0x4488ff }));
// Gouraud shading: per-vertex lighting, interpolated

const toon = new EASEL.Mesh(geo, new EASEL.ToonMaterial({ color: 0x4488ff }));
toon.position.x = 3.5;  // Stepped shading via gradientMap`;
