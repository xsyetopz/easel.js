import {
	BasicMaterial,
	Camera,
	Mesh,
	PlaneGeometry,
	Renderer,
	Scene,
} from "@/index.js";

export function setup(canvas) {
	const width = canvas.width;
	const height = canvas.height;
	const aspect = width / height;
	const size = 6;

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

	const bgGeo = new PlaneGeometry(20, 12);
	const bg = new Mesh(bgGeo, new BasicMaterial({ color: 0xffffff }));
	bg.position.z = -2;
	scene.add(bg);

	const planeGeo = new PlaneGeometry(2, 8);
	const colors = [
		0xff0000, 0x00ff00, 0x0000ff, 0xff00ff, 0xffff00, 0x00ffff, 0xff8800,
		0x8800ff, 0x88ff00,
	];

	for (let i = 0; i < 9; i++) {
		const mat = new BasicMaterial({ color: colors[i], opacity: i });
		const mesh = new Mesh(planeGeo, mat);
		mesh.position.x = (i - 4) * 1.8;
		scene.add(mesh);
	}

	renderer.render(scene, camera);

	return {
		cleanup() {
			// No dynamic resources to clean up in this example.
		},
	};
}

export const source = `import {
  Scene, Camera, Renderer,
  PlaneGeometry, BasicMaterial, Mesh,
} from "easel";

// 9 discrete opacity levels: 0 (opaque) through 8 (nearly transparent)
// No continuous alpha — precomputed blend lookup table.

for (let i = 0; i < 9; i++) {
  const mat = new BasicMaterial({
    color: colors[i],
    opacity: i,  // integer 0–8
  });
  const mesh = new Mesh(planeGeo, mat);
  mesh.position.x = (i - 4) * 1.8;
  scene.add(mesh);
}`;
