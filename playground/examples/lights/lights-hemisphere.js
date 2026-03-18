import {
	AmbientLight,
	BoxGeometry,
	Clock,
	HemisphereLight,
	LambertMaterial,
	Mesh,
	PerspectiveCamera,
	PlaneGeometry,
	Renderer,
	Scene,
	SphereGeometry,
	TorusGeometry,
} from "@/index.js";

export const controls = [
	{
		type: "color",
		key: "skyColor",
		label: "Sky Color",
		default: "#8888ff",
	},
	{
		type: "color",
		key: "groundColor",
		label: "Ground Color",
		default: "#443322",
	},
	{
		type: "slider",
		key: "intensity",
		label: "Intensity",
		min: 0,
		max: 2,
		step: 0.05,
		default: 1,
	},
];

export function setup(canvas, params = {}) {
	const width = canvas.width;
	const height = canvas.height;

	const scene = new Scene();
	const camera = new PerspectiveCamera({
		fov: Math.PI / 4,
		aspect: width / height,
		near: 0.1,
		far: 100,
	});
	camera.position.set(0, 2, 10);

	const renderer = new Renderer({ canvas, width, height });

	// Small ambient so completely shadowed faces aren't pure black
	scene.add(new AmbientLight(0xffffff, 0.05));

	const skyHex = params.skyColor
		? Number.parseInt(params.skyColor.replace("#", ""), 16)
		: 0x8888ff;
	const groundHex = params.groundColor
		? Number.parseInt(params.groundColor.replace("#", ""), 16)
		: 0x443322;
	const hemiLight = new HemisphereLight(
		skyHex,
		groundHex,
		params.intensity ?? 1,
	);
	scene.add(hemiLight);

	const gray = new LambertMaterial({ color: 0x999999 });

	const sphere = new Mesh(new SphereGeometry(1, 24, 16), gray);
	sphere.position.set(-3, 0, 0);
	scene.add(sphere);

	const box = new Mesh(new BoxGeometry(1.5, 1.5, 1.5), gray);
	box.position.set(0, 0, 0);
	scene.add(box);

	const torus = new Mesh(new TorusGeometry(0.8, 0.3, 16, 32), gray);
	torus.position.set(3, 0, 0);
	scene.add(torus);

	const ground = new Mesh(
		new PlaneGeometry(14, 14),
		new LambertMaterial({ color: 0x888888 }),
	);
	ground.rotation.x = -Math.PI / 2;
	ground.position.y = -1.5;
	scene.add(ground);

	const meshes = [sphere, box, torus];

	const clock = new Clock();
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		for (const mesh of meshes) {
			mesh.rotation.y += 0.4 * dt;
		}
		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			if (newParams.skyColor !== undefined) {
				hemiLight.color.set(
					Number.parseInt(newParams.skyColor.replace("#", ""), 16),
				);
			}
			if (newParams.groundColor !== undefined) {
				hemiLight.groundColor.set(
					Number.parseInt(newParams.groundColor.replace("#", ""), 16),
				);
			}
			if (newParams.intensity !== undefined) {
				hemiLight.intensity = newParams.intensity;
			}
		},
	};
}

export const source = `import {
  Scene, PerspectiveCamera, Renderer, Clock,
  HemisphereLight, AmbientLight, LambertMaterial, Mesh,
  SphereGeometry, BoxGeometry, TorusGeometry, PlaneGeometry,
} from "easel";

// HemisphereLight blends two colors per vertex based on
// the dot product of the surface normal with world up.
// sky color → top faces, ground color → bottom faces.
const hemi = new HemisphereLight(0x8888ff, 0x443322, 1);
scene.add(hemi);`;
