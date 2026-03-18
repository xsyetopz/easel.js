import {
	AmbientLight,
	Camera,
	Clock,
	DirectionalLight,
	LambertMaterial,
	Mesh,
	Renderer,
	Scene,
	Shading,
	SphereGeometry,
} from "@/index.js";

export function setup(canvas) {
	const width = canvas.width;
	const height = canvas.height;
	const aspect = width / height;
	const size = 4;

	const scene = new Scene();
	const camera = new Camera({
		left: -size * aspect,
		right: size * aspect,
		top: size,
		bottom: -size,
		near: 0.1,
		far: 100,
	});
	camera.position.z = 6;

	const renderer = new Renderer({ canvas, width, height });

	scene.add(new AmbientLight(0xffffff, 0.3));
	const dirLight = new DirectionalLight(0xffffff, 0.9);
	dirLight.position.set(3, 5, 4);
	scene.add(dirLight);

	const geo = new SphereGeometry(1.4, 12, 8);

	const flat = new Mesh(
		geo,
		new LambertMaterial({ color: 0x44aa88, shading: Shading.Flat }),
	);
	flat.position.x = -2.5;
	scene.add(flat);

	const gouraud = new Mesh(
		geo,
		new LambertMaterial({ color: 0x44aa88, shading: Shading.Gouraud }),
	);
	gouraud.position.x = 2.5;
	scene.add(gouraud);

	const clock = new Clock();
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		flat.rotation.y += 0.3 * dt;
		gouraud.rotation.y += 0.3 * dt;
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
  Scene, Camera, Renderer, Clock,
  AmbientLight, DirectionalLight,
  SphereGeometry, LambertMaterial, Mesh,
  Shading,
} from "easel";

// Left: Flat shading — one color per face
// Right: Gouraud shading — per-vertex, interpolated across face

const geo = new SphereGeometry(1.4, 12, 8);

const flat = new Mesh(
  geo,
  new LambertMaterial({ color: 0x44aa88, shading: Shading.Flat }),
);
flat.position.x = -2.5;

const gouraud = new Mesh(
  geo,
  new LambertMaterial({ color: 0x44aa88, shading: Shading.Gouraud }),
);
gouraud.position.x = 2.5;`;
