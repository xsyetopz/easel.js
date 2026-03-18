import {
	BasicMaterial,
	Camera,
	CanvasTexture,
	Clock,
	Mesh,
	PlaneGeometry,
	Renderer,
	Scene,
} from "@/index.js";

function createCheckerTexture() {
	const size = 128;
	const tileSize = 16;
	const offscreen = document.createElement("canvas");
	offscreen.width = size;
	offscreen.height = size;
	const ctx = offscreen.getContext("2d");
	for (let y = 0; y < size; y += tileSize) {
		for (let x = 0; x < size; x += tileSize) {
			const isWhite = (x / tileSize + y / tileSize) % 2 === 0;
			ctx.fillStyle = isWhite ? "#ffffff" : "#444444";
			ctx.fillRect(x, y, tileSize, tileSize);
		}
	}
	return new CanvasTexture(offscreen);
}

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
	camera.position.z = 5;

	const renderer = new Renderer({ canvas, width, height });

	const texture = createCheckerTexture();
	const mesh = new Mesh(
		new PlaneGeometry(4, 4),
		new BasicMaterial({ map: texture }),
	);
	scene.add(mesh);

	const clock = new Clock();
	let animId = null;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		mesh.rotation.x += 0.2 * dt;
		mesh.rotation.y += 0.5 * dt;
		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId != null) cancelAnimationFrame(animId);
		},
	};
}

export const source = `import {
  Scene, Camera, Renderer, Clock,
  PlaneGeometry, BasicMaterial, Mesh, CanvasTexture,
} from "easel";

// Affine texture warping: UVs interpolated linearly in screen space
// without dividing by W. Large polygons at angle show visible distortion.
// This is correct — perspective-correct mapping requires a W divide
// that does not exist in this rasterizer.

const texture = createCheckerTexture(); // 128x128 max
const mesh = new Mesh(
  new PlaneGeometry(4, 4),
  new BasicMaterial({ map: texture }),
);

function animate() {
  requestAnimationFrame(animate);
  mesh.rotation.x += 0.2 * clock.delta;
  mesh.rotation.y += 0.5 * clock.delta;
  renderer.render(scene, camera);
}`;
