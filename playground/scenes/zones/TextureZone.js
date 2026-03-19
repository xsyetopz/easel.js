import {
	AmbientLight,
	BasicMaterial,
	BoxGeometry,
	CanvasTexture,
	DataTexture,
	DirectionalLight,
	Mesh,
	TextureLoader,
	Vector3,
} from "@/index.js";

/**
 * Builds a 64x64 CanvasTexture with a colored background and "Easel" text.
 *
 * @returns {CanvasTexture}
 */
function buildCanvasTexture() {
	const texCanvas = document.createElement("canvas");
	texCanvas.width = 64;
	texCanvas.height = 64;
	const ctx = texCanvas.getContext("2d");
	if (!ctx) throw new Error("2d context unavailable");
	ctx.fillStyle = "#336699";
	ctx.fillRect(0, 0, 64, 64);
	ctx.fillStyle = "#ffffff";
	ctx.font = "bold 20px monospace";
	ctx.textAlign = "center";
	ctx.fillText("Easel", 32, 38);
	return new CanvasTexture(texCanvas);
}

/**
 * Builds a 32x32 procedural checkerboard DataTexture.
 *
 * @returns {DataTexture}
 */
function buildDataTexture() {
	const size = 32;
	const data = new Uint8ClampedArray(size * size * 4);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const i = (y * size + x) * 4;
			const check = ((x >> 2) + (y >> 2)) % 2;
			data[i] = check ? 255 : 60;
			data[i + 1] = check ? 200 : 60;
			data[i + 2] = check ? 100 : 60;
			data[i + 3] = 255;
		}
	}
	const tex = new DataTexture(data, size, size);
	tex.needsUpdate = true;
	return tex;
}

/**
 * Texture Workshop zone - loaded texture, canvas texture, and procedural DataTexture.
 *
 * @param {import("@/index.js").Scene} scene
 * @param {import("@/index.js").PerspectiveCamera} camera
 * @param {HTMLCanvasElement} _canvas
 * @returns {{ controls: Array<object>, animate: (dt: number) => void, update: (params: Record<string, unknown>) => void, dispose: () => void }}
 */
export function setup(scene, camera, _canvas) {
	camera.position.set(0, 2, 10);
	camera.lookAt(new Vector3(0, 0, 0));

	const ambient = new AmbientLight(0xffffff, 0.4);
	scene.add(ambient);

	const sun = new DirectionalLight(0xffffff, 0.6);
	sun.position.set(3, 5, 4);
	scene.add(sun);

	// Left: TextureLoader (async, starts with plain color until loaded)
	const leftMat = new BasicMaterial({ color: 0x888888 });
	const leftBox = new Mesh(new BoxGeometry(1.8, 1.8, 1.8), leftMat);
	leftBox.position.set(-3, 0, 0);
	scene.add(leftBox);

	const loader = new TextureLoader();
	loader.load("textures/Brick_01.png", (tex) => {
		leftMat.map = tex;
		leftMat.color = 0xffffff;
	});

	// Center: CanvasTexture
	const centerMat = new BasicMaterial({
		color: 0xffffff,
		map: buildCanvasTexture(),
	});
	const centerBox = new Mesh(new BoxGeometry(1.8, 1.8, 1.8), centerMat);
	centerBox.position.set(0, 0, 0);
	scene.add(centerBox);

	// Right: DataTexture checkerboard
	const rightMat = new BasicMaterial({
		color: 0xffffff,
		map: buildDataTexture(),
	});
	const rightBox = new Mesh(new BoxGeometry(1.8, 1.8, 1.8), rightMat);
	rightBox.position.set(3, 0, 0);
	scene.add(rightBox);

	const boxes = [leftBox, centerBox, rightBox];

	return {
		controls: [],

		/**
		 * @param {number} dt
		 */
		animate(dt) {
			for (const box of boxes) {
				box.rotation.y += 0.5 * dt;
			}
		},

		/**
		 * @param {Record<string, unknown>} _params
		 */
		update(_params) {
			// no-op: no reactive params
		},

		dispose() {
			for (const box of boxes) {
				box.geometry.dispose?.();
				box.material.dispose?.();
			}
		},
	};
}
