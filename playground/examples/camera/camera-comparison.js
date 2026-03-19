import * as EASEL from "@/index.js";

function createScene() {
	const scene = new EASEL.Scene();

	scene.add(new EASEL.AmbientLight(0xffffff, 0.3));
	const dirLight = new EASEL.DirectionalLight(0xffffff, 0.9);
	dirLight.position.set(4, 6, 5);
	scene.add(dirLight);

	const configs = [
		{ color: 0xe06060, z: 0 },
		{ color: 0x60e060, z: -3 },
		{ color: 0x6060e0, z: -6 },
	];

	/** @type {EASEL.Mesh[]} */
	const meshes = configs.map(({ color, z }) => {
		const mesh = new EASEL.Mesh(
			new EASEL.BoxGeometry(1.5, 1.5, 1.5),
			new EASEL.LambertMaterial({ color }),
		);
		mesh.position.set(0, 0, z);
		scene.add(mesh);
		return mesh;
	});

	return { scene, meshes };
}

export function setup(canvas) {
	const fullWidth = canvas.width;
	const fullHeight = canvas.height;
	const halfWidth = Math.floor(fullWidth / 2);

	const aspect = halfWidth / fullHeight;

	const orthoSize = 3;
	const orthoCamera = new EASEL.OrthographicCamera({
		left: -orthoSize * aspect,
		right: orthoSize * aspect,
		top: orthoSize,
		bottom: -orthoSize,
		near: 0.1,
		far: 100,
	});
	orthoCamera.position.z = 8;

	const perspCamera = new EASEL.PerspectiveCamera({
		fov: Math.PI / 4,
		aspect,
		near: 0.1,
		far: 100,
	});
	perspCamera.position.z = 8;

	const { scene: orthoScene, meshes: orthoMeshes } = createScene();
	const { scene: perspScene, meshes: perspMeshes } = createScene();

	const orthoRenderer = new EASEL.Renderer({
		width: halfWidth,
		height: fullHeight,
	});
	const perspRenderer = new EASEL.Renderer({
		width: halfWidth,
		height: fullHeight,
	});

	const ctx = canvas.getContext("2d");
	ctx.imageSmoothingEnabled = false;

	const clock = new EASEL.Clock();
	let elapsed = 0;
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		elapsed += dt;

		for (const mesh of orthoMeshes) {
			mesh.rotation.y = elapsed * 0.5;
		}
		for (const mesh of perspMeshes) {
			mesh.rotation.y = elapsed * 0.5;
		}

		orthoRenderer.render(orthoScene, orthoCamera);
		perspRenderer.render(perspScene, perspCamera);

		const orthoCanvas = orthoRenderer.domElement;
		const perspCanvas = perspRenderer.domElement;
		if (orthoCanvas && perspCanvas) {
			ctx.drawImage(orthoCanvas, 0, 0);
			ctx.drawImage(perspCanvas, halfWidth, 0);
		}

		ctx.fillStyle = "rgba(0,0,0,0.55)";
		ctx.fillRect(0, 0, 140, 24);
		ctx.fillRect(halfWidth, 0, 140, 24);
		ctx.fillStyle = "#fff";
		ctx.font = "13px monospace";
		ctx.fillText("Orthographic", 8, 16);
		ctx.fillText("Perspective", halfWidth + 8, 16);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
			orthoRenderer.dispose();
			perspRenderer.dispose();
		},
	};
}

export const source = `import {
  EASEL.Scene, EASEL.OrthographicCamera, EASEL.PerspectiveCamera, EASEL.Renderer, EASEL.Clock,
  EASEL.AmbientLight, EASEL.DirectionalLight, EASEL.BoxGeometry, EASEL.LambertMaterial, EASEL.Mesh,
} from "easel";

// Orthographic: parallel projection - depth doesn't shrink objects.
// Perspective: frustum projection - distant boxes appear smaller.
// Both cameras are at z=8, looking at boxes at z=0, -3, -6.

const orthoCamera = new EASEL.OrthographicCamera({ left: -4, right: 4, top: 3, bottom: -3 });
const perspCamera = new EASEL.PerspectiveCamera({ fov: Math.PI / 4, aspect });

// Composite two half-width renderers onto one canvas:
ctx.drawImage(orthoRenderer.domElement, 0, 0);
ctx.drawImage(perspRenderer.domElement, halfWidth, 0);`;
