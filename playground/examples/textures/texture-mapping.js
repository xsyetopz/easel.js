import {
	BasicMaterial,
	BoxGeometry,
	Clock,
	Mesh,
	OrthographicCamera,
	Renderer,
	Scene,
	TextureLoader,
} from "@/index.js";

export function setup(canvas) {
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

	const material = new BasicMaterial({ color: 0xffffff });
	const box = new Mesh(new BoxGeometry(2, 2, 2), material);
	scene.add(box);

	const loader = new TextureLoader();
	loader.load("textures/Brick_01.png", (texture) => {
		material.map = texture;
		material.needsUpdate = true;
	});

	const clock = new Clock();
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		box.rotation.x += 0.3 * dt;
		box.rotation.y += 0.5 * dt;
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
  Scene, OrthographicCamera, Renderer, Clock,
  BoxGeometry, BasicMaterial, Mesh, TextureLoader,
} from "easel";

const scene = new Scene();
const camera = new OrthographicCamera({
  left: -4, right: 4, top: 3, bottom: -3,
  near: 0.1, far: 100,
});
camera.position.z = 5;

const renderer = new Renderer({ canvas, width: 800, height: 600 });

// TextureLoader wraps an image in a Texture with needsUpdate = true.
// Affine UV mapping (no W divide) causes visible warping on angled faces.
const loader = new TextureLoader();
loader.load("textures/Brick_01.png", (texture) => {
  material.map = texture;
  material.needsUpdate = true;
});

const material = new BasicMaterial({ color: 0xffffff });
const box = new Mesh(new BoxGeometry(2, 2, 2), material);
scene.add(box);

const clock = new Clock();
function animate() {
  requestAnimationFrame(animate);
  box.rotation.x += 0.3 * clock.delta;
  box.rotation.y += 0.5 * clock.delta;
  renderer.render(scene, camera);
}
animate();`;
