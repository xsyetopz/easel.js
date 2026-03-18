import {
	BasicMaterial,
	BoxGeometry,
	Camera,
	Clock,
	Mesh,
	Renderer,
	Scene,
} from "@/index.js";

export const controls = [
	{ type: "color", key: "color", label: "Color", default: "#ff0000" },
];

export function setup(canvas, params = {}) {
	const width = canvas.width;
	const height = canvas.height;
	const aspect = width / height;
	const size = 3;

	const scene = new Scene();
	const camera = new Camera({
		left: -size * aspect,
		right: size * aspect,
		top: size,
		bottom: -size,
		near: 0.1,
		far: 100,
	});
	camera.position.z = 5;

	const renderer = new Renderer({ canvas, width, height });

	const material = new BasicMaterial({ color: params.color ?? 0xff0000 });
	const box = new Mesh(new BoxGeometry(2, 2, 2), material);
	scene.add(box);

	const clock = new Clock();
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		box.rotation.x += 0.5 * dt;
		box.rotation.y += 0.7 * dt;
		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			if (newParams.color) material.color.set(newParams.color);
		},
	};
}

export const source = `import {
  Scene, Camera, Renderer, Clock,
  BoxGeometry, BasicMaterial, Mesh,
} from "easel";

const scene = new Scene();
const camera = new Camera({
  left: -4, right: 4, top: 3, bottom: -3,
  near: 0.1, far: 100,
});
camera.position.z = 5;

const renderer = new Renderer({ canvas, width: 800, height: 600 });

const box = new Mesh(
  new BoxGeometry(2, 2, 2),
  new BasicMaterial({ color: 0xff0000 }),
);
scene.add(box);

const clock = new Clock();
function animate() {
  requestAnimationFrame(animate);
  box.rotation.x += 0.5 * clock.delta;
  box.rotation.y += 0.7 * clock.delta;
  renderer.render(scene, camera);
}
animate();`;
