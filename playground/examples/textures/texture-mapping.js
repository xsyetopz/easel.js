import {
	BasicMaterial,
	BoxGeometry,
	Clock,
	Mesh,
	OrthographicCamera,
	PerspectiveCamera,
	Renderer,
	Scene,
	TextureLoader,
} from "@/index.js";

export function setup(canvas) {
	const width = canvas.width;
	const height = canvas.height;
	const halfWidth = Math.floor(width / 2);
	const ctx = canvas.getContext("2d");

	const orthoCanvas = document.createElement("canvas");
	orthoCanvas.width = halfWidth;
	orthoCanvas.height = height;

	const orthoScene = new Scene();
	const orthoSize = 3;
	const orthoAspect = halfWidth / height;
	const orthoCamera = new OrthographicCamera({
		left: -orthoSize * orthoAspect,
		right: orthoSize * orthoAspect,
		top: orthoSize,
		bottom: -orthoSize,
		near: 0.1,
		far: 100,
	});
	orthoCamera.position.z = 5;

	const orthoRenderer = new Renderer({
		canvas: orthoCanvas,
		width: halfWidth,
		height,
	});

	const orthoMat = new BasicMaterial({ color: 0xffffff });
	const orthoBox = new Mesh(new BoxGeometry(2, 2, 2), orthoMat);
	orthoScene.add(orthoBox);

	const perspCanvas = document.createElement("canvas");
	perspCanvas.width = halfWidth;
	perspCanvas.height = height;

	const perspScene = new Scene();
	const perspCamera = new PerspectiveCamera({
		fov: Math.PI / 4,
		aspect: halfWidth / height,
		near: 0.1,
		far: 100,
	});
	perspCamera.position.z = 5;

	const perspRenderer = new Renderer({
		canvas: perspCanvas,
		width: halfWidth,
		height,
	});

	const perspMat = new BasicMaterial({ color: 0xffffff });
	const perspBox = new Mesh(new BoxGeometry(2, 2, 2), perspMat);
	perspScene.add(perspBox);

	const loader = new TextureLoader();
	loader.load("textures/Brick_01.png", (texture) => {
		orthoMat.map = texture;
		orthoMat.needsUpdate = true;
		perspMat.map = texture;
		perspMat.needsUpdate = true;
	});

	const clock = new Clock();
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;

		orthoBox.rotation.x += 0.3 * dt;
		orthoBox.rotation.y += 0.5 * dt;
		perspBox.rotation.x += 0.3 * dt;
		perspBox.rotation.y += 0.5 * dt;

		orthoRenderer.render(orthoScene, orthoCamera);
		perspRenderer.render(perspScene, perspCamera);

		ctx.drawImage(orthoCanvas, 0, 0);
		ctx.drawImage(perspCanvas, halfWidth, 0);

		ctx.strokeStyle = "#444";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(halfWidth, 0);
		ctx.lineTo(halfWidth, height);
		ctx.stroke();

		ctx.font = "bold 14px monospace";
		ctx.textAlign = "center";
		ctx.fillStyle = "#fff";
		ctx.fillText("Orthographic", halfWidth / 2, 24);
		ctx.fillText("Perspective", halfWidth + halfWidth / 2, 24);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
	};
}

export const source = `import {
  Scene, OrthographicCamera, PerspectiveCamera,
  Renderer, Clock, BoxGeometry, BasicMaterial,
  Mesh, TextureLoader,
} from "easel";

// Ortho: affine UV is exact. Perspective: no W-divide causes warping.
const orthoRenderer = new Renderer({ canvas: leftCanvas, width: half, height });
const perspRenderer = new Renderer({ canvas: rightCanvas, width: half, height });

const loader = new TextureLoader();
loader.load("textures/Brick_01.png", (texture) => {
  orthoMat.map = texture;
  perspMat.map = texture;
});

box.rotation.x += 0.3 * dt;
box.rotation.y += 0.5 * dt;

ctx.drawImage(leftCanvas, 0, 0);
ctx.drawImage(rightCanvas, halfWidth, 0);`;
