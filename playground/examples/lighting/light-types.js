import {
	AmbientLight,
	Camera,
	Clock,
	DirectionalLight,
	HemisphereLight,
	LambertMaterial,
	Mesh,
	PlaneGeometry,
	PointLight,
	Renderer,
	Scene,
	SphereGeometry,
	SpotLight,
} from "@/index.js";

export const controls = [
	{
		type: "slider",
		key: "intensity",
		label: "Intensity",
		min: 0,
		max: 2,
		step: 0.1,
		default: 1,
	},
	{
		type: "select",
		key: "lightType",
		label: "Light Type",
		options: ["Directional", "Point", "Spot", "Hemisphere"],
		default: "Directional",
	},
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
	camera.position.y = 2;

	const renderer = new Renderer({ canvas, width, height });

	scene.add(new AmbientLight(0xffffff, 0.15));

	const ground = new Mesh(
		new PlaneGeometry(12, 12),
		new LambertMaterial({ color: 0x666666 }),
	);
	ground.rotation.x = -Math.PI / 2;
	ground.position.y = -1.5;
	scene.add(ground);

	const sphere = new Mesh(
		new SphereGeometry(1.2, 24, 16),
		new LambertMaterial({ color: 0xcc6644 }),
	);
	scene.add(sphere);

	const intensity = params.intensity ?? 1;

	const lights = {
		Directional: () => {
			const l = new DirectionalLight(0xffffff, intensity);
			l.position.set(3, 5, 4);
			return l;
		},
		Point: () => {
			const l = new PointLight(0xffffff, intensity, 20, 2);
			l.position.set(2, 3, 2);
			return l;
		},
		Spot: () => {
			const l = new SpotLight(0xffffff, intensity, 20, Math.PI / 6, 0.5, 2);
			l.position.set(2, 4, 2);
			return l;
		},
		Hemisphere: () => {
			return new HemisphereLight(0x8888ff, 0x443322, intensity);
		},
	};

	let activeLight = lights[params.lightType ?? "Directional"]();
	scene.add(activeLight);

	const clock = new Clock();
	let animId = null;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		sphere.rotation.y += 0.3 * dt;
		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId != null) cancelAnimationFrame(animId);
		},
		update(newParams) {
			scene.remove(activeLight);
			const type = newParams.lightType ?? "Directional";
			const fn = lights[type];
			if (fn) {
				activeLight = fn();
				if (newParams.intensity != null) {
					activeLight.intensity = newParams.intensity;
				}
				scene.add(activeLight);
			}
		},
	};
}

export const source = `import {
  Scene, Camera, Renderer,
  AmbientLight, DirectionalLight, PointLight,
  SpotLight, HemisphereLight,
  SphereGeometry, PlaneGeometry, LambertMaterial, Mesh,
} from "easel";

scene.add(new AmbientLight(0xffffff, 0.15));

// Directional: parallel rays from position
const dir = new DirectionalLight(0xffffff, 1);
dir.position.set(3, 5, 4);

// Point: per-vertex distance attenuation
const point = new PointLight(0xffffff, 1, 20, 2);
point.position.set(2, 3, 2);

// Spot: per-vertex cone attenuation
const spot = new SpotLight(0xffffff, 1, 20, Math.PI / 6, 0.5, 2);
spot.position.set(2, 4, 2);

// Hemisphere: sky/ground blend per vertex
const hemi = new HemisphereLight(0x8888ff, 0x443322, 1);`;
