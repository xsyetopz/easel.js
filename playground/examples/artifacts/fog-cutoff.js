import * as EASEL from "@/index.js";

export const controls = [
	{
		type: "slider",
		key: "tiles",
		label: "EASEL.Fog Tiles",
		min: 2,
		max: 20,
		step: 1,
		default: 8,
	},
];

export function setup(canvas, params = {}) {
	const width = canvas.width;
	const height = canvas.height;
	const aspect = width / height;
	const size = 10;

	const scene = new EASEL.Scene();
	const camera = new EASEL.OrthographicCamera({
		left: -size * aspect,
		right: size * aspect,
		top: size,
		bottom: -size,
		near: 0.1,
		far: 200,
	});
	camera.position.z = 5;

	scene.fog = new EASEL.Fog({ tiles: params.tiles ?? 8 });

	const renderer = new EASEL.Renderer({ canvas, width, height });

	scene.add(new EASEL.AmbientLight(0xffffff, 0.3));
	const dirLight = new EASEL.DirectionalLight(0xffffff, 0.7);
	dirLight.position.set(3, 5, 4);
	scene.add(dirLight);

	const geo = new EASEL.BoxGeometry(1, 1, 1);
	const colors = [0xe06060, 0x60e060, 0x6060e0, 0xe0e060, 0xe060e0];

	for (let i = 0; i < 30; i++) {
		const mesh = new EASEL.Mesh(
			geo,
			new EASEL.LambertMaterial({ color: colors[i % colors.length] }),
		);
		mesh.position.x = (Math.random() - 0.5) * 30;
		mesh.position.y = (Math.random() - 0.5) * 10;
		mesh.position.z = -Math.random() * 40;
		mesh.rotation.x = Math.random() * Math.PI;
		mesh.rotation.y = Math.random() * Math.PI;
		scene.add(mesh);
	}

	const clock = new EASEL.Clock();
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		camera.position.z -= 2 * dt;
		if (camera.position.z < -40) camera.position.z = 5;
		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			if (newParams.tiles !== undefined) {
				scene.fog = new EASEL.Fog({ tiles: newParams.tiles });
			}
		},
	};
}

export const source = `import {
  EASEL.Scene, EASEL.OrthographicCamera, EASEL.Renderer, EASEL.Clock,
  EASEL.AmbientLight, EASEL.DirectionalLight, EASEL.Fog,
  EASEL.BoxGeometry, EASEL.LambertMaterial, EASEL.Mesh,
} from "easel";

// Tile-radius fog: hard cutoff to black at fog.tiles distance.
// No color, no gradient, no transition. The scene just ends.

scene.fog = new EASEL.Fog({ tiles: 8 });

for (let i = 0; i < 30; i++) {
  const mesh = new EASEL.Mesh(geo, new EASEL.LambertMaterial({ color }));
  mesh.position.z = -Math.random() * 40;
  scene.add(mesh);
}`;
