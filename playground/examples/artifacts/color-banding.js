import {
	AmbientLight,
	Clock,
	Color,
	DirectionalLight,
	LambertMaterial,
	Mesh,
	OrthographicCamera,
	Renderer,
	Scene,
	Shading,
	SphereGeometry,
} from "@/index.js";

export const controls = [
	{
		type: "slider",
		key: "hue",
		label: "Hue (0-63)",
		min: 0,
		max: 63,
		step: 1,
		default: 10,
	},
	{
		type: "slider",
		key: "saturation",
		label: "Saturation (0-7)",
		min: 0,
		max: 7,
		step: 1,
		default: 4,
	},
];

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

	scene.add(new AmbientLight(0xffffff, 0.2));
	const dirLight = new DirectionalLight(0xffffff, 1);
	dirLight.position.set(3, 5, 4);
	scene.add(dirLight);

	const hue = params.hue ?? 10;
	const sat = params.saturation ?? 4;
	const material = new LambertMaterial({
		color: new Color().setHSL(hue / 63, sat / 7, 0.5),
		shading: Shading.Gouraud,
	});

	const sphere = new Mesh(new SphereGeometry(2.5, 32, 24), material);
	scene.add(sphere);

	const clock = new Clock();
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		sphere.rotation.y += 0.05 * dt;
		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			const h = newParams.hue ?? hue;
			const s = newParams.saturation ?? sat;
			material.color.setHSL(h / 63, s / 7, 0.5);
		},
	};
}

export const source = `import {
  Scene, OrthographicCamera, Renderer, Clock,
  AmbientLight, DirectionalLight,
  SphereGeometry, LambertMaterial, Mesh,
  Shading, Color,
} from "easel";

// HSL16 packs: 6-bit hue (0-63), 3-bit saturation (0-7), 7-bit lightness (0-127).
// Gouraud interpolates the quantized values across each face — the banding
// visible in the gradient is the quantization artifact, not a rendering bug.

const material = new LambertMaterial({
  color: new Color().setHSL(10 / 63, 4 / 7, 0.5),
  shading: Shading.Gouraud,
});

const sphere = new Mesh(
  new SphereGeometry(2.5, 32, 24),
  material,
);

function animate() {
  requestAnimationFrame(animate);
  sphere.rotation.y += 0.05 * clock.delta;
  renderer.render(scene, camera);
}`;
