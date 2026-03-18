import {
	BasicMaterial,
	Camera,
	Color,
	Mesh,
	PlaneGeometry,
	Renderer,
	Scene,
} from "@/index.js";

export function setup(canvas) {
	const width = canvas.width;
	const height = canvas.height;
	const aspect = width / height;

	const hues = 64;
	const lightSteps = 128;
	const gridW = hues;
	const gridH = lightSteps;

	const sizeX = 10 * aspect;
	const sizeY = 10;

	const scene = new Scene();
	const camera = new Camera({
		left: -sizeX / 2,
		right: sizeX / 2,
		top: sizeY / 2,
		bottom: -sizeY / 2,
		near: 0.1,
		far: 10,
	});
	camera.position.z = 1;

	const renderer = new Renderer({ canvas, width, height });

	const cellW = sizeX / gridW;
	const cellH = sizeY / gridH;
	const geo = new PlaneGeometry(cellW, cellH);

	for (let h = 0; h < hues; h++) {
		for (let l = 0; l < lightSteps; l++) {
			const color = new Color();
			color.setHSL(h / hues, 1.0, l / lightSteps);
			const mesh = new Mesh(geo, new BasicMaterial({ color }));
			mesh.position.x = (h - gridW / 2 + 0.5) * cellW;
			mesh.position.y = (l - gridH / 2 + 0.5) * cellH;
			scene.add(mesh);
		}
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
  PlaneGeometry, BasicMaterial, Mesh, Color,
} from "easel";

// HSL16: 6-bit hue (64 steps), 3-bit saturation, 7-bit lightness (128 steps)
// This grid shows all 64 hues x 128 lightness values at full saturation.
// The banding is the HSL16 quantization — 16-bit color, not 24-bit.

for (let h = 0; h < 64; h++) {
  for (let l = 0; l < 128; l++) {
    const color = new Color();
    color.setHSL(h / 64, 1.0, l / 128);
    // color.hsl16 gives the packed 16-bit integer
    const mesh = new Mesh(cellGeo, new BasicMaterial({ color }));
    scene.add(mesh);
  }
}`;
