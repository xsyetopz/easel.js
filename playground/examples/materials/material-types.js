import {
	AmbientLight,
	BasicMaterial,
	Camera,
	Clock,
	DirectionalLight,
	LambertMaterial,
	Mesh,
	Renderer,
	Scene,
	SphereGeometry,
	ToonMaterial,
} from "@/index.js";

export const controls = [
	{ type: "color", key: "color", label: "Base Color", default: "#4488ff" },
];

export function setup(canvas, params = {}) {
	const width = canvas.width;
	const height = canvas.height;
	const aspect = width / height;
	const size = 5;

	const scene = new Scene();
	const camera = new Camera({
		left: -size * aspect,
		right: size * aspect,
		top: size,
		bottom: -size,
		near: 0.1,
		far: 100,
	});
	camera.position.z = 8;

	const renderer = new Renderer({ canvas, width, height });

	scene.add(new AmbientLight(0xffffff, 0.3));
	const dirLight = new DirectionalLight(0xffffff, 0.9);
	dirLight.position.set(3, 5, 4);
	scene.add(dirLight);

	const geo = new SphereGeometry(1.2, 24, 16);
	const color = params.color ?? 0x4488ff;

	const basicMat = new BasicMaterial({ color });
	const lambertMat = new LambertMaterial({ color });
	const toonMat = new ToonMaterial({ color });

	const basic = new Mesh(geo, basicMat);
	basic.position.x = -3.5;
	scene.add(basic);

	const lambert = new Mesh(geo, lambertMat);
	scene.add(lambert);

	const toon = new Mesh(geo, toonMat);
	toon.position.x = 3.5;
	scene.add(toon);

	const meshes = [basic, lambert, toon];
	const materials = [basicMat, lambertMat, toonMat];
	const clock = new Clock();
	let animId = null;

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
			if (animId != null) cancelAnimationFrame(animId);
		},
		update(newParams) {
			if (newParams.color) {
				for (const mat of materials) mat.color.set(newParams.color);
			}
		},
	};
}

export const source = `import {
  Scene, Camera, Renderer, Clock,
  AmbientLight, DirectionalLight,
  SphereGeometry, Mesh,
  BasicMaterial, LambertMaterial, ToonMaterial,
} from "easel";

// Three spheres: BasicMaterial, LambertMaterial, ToonMaterial
// Same geometry, same light — different shading models.

const geo = new SphereGeometry(1.2, 24, 16);

const basic = new Mesh(geo, new BasicMaterial({ color: 0x4488ff }));
basic.position.x = -3.5;  // No lighting response

const lambert = new Mesh(geo, new LambertMaterial({ color: 0x4488ff }));
// Gouraud shading: per-vertex lighting, interpolated

const toon = new Mesh(geo, new ToonMaterial({ color: 0x4488ff }));
toon.position.x = 3.5;  // Stepped shading via gradientMap`;
