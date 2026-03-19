import * as EASEL from "@/index.js";

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
	return new EASEL.CanvasTexture(offscreen);
}

/** @param {number} segments */
function createScene(segments) {
	const scene = new EASEL.Scene();
	const texture = createCheckerTexture();
	const mesh = new EASEL.Mesh(
		new EASEL.PlaneGeometry(4, 4, segments, segments),
		new EASEL.BasicMaterial({ map: texture }),
	);
	scene.add(mesh);
	return { scene, mesh };
}

export const controls = [
	{
		key: "segments",
		type: "slider",
		label: "Subdivisions",
		min: 1,
		max: 8,
		step: 1,
		default: 1,
	},
];

export function setup(canvas, params) {
	const fullWidth = canvas.width;
	const fullHeight = canvas.height;
	const halfWidth = Math.floor(fullWidth / 2);

	const segments = params?.segments ?? 1;

	// Left: orthographic
	const orthoSize = 4;
	const orthoAspect = halfWidth / fullHeight;
	const orthoCamera = new EASEL.OrthographicCamera({
		left: -orthoSize * orthoAspect,
		right: orthoSize * orthoAspect,
		top: orthoSize,
		bottom: -orthoSize,
		near: 0.1,
		far: 100,
	});
	orthoCamera.position.z = 5;

	// Right: perspective
	const perspCamera = new EASEL.PerspectiveCamera({
		fov: Math.PI / 3,
		aspect: halfWidth / fullHeight,
		near: 0.1,
		far: 100,
	});
	perspCamera.position.z = 7;

	const orthoRenderer = new EASEL.Renderer({
		width: halfWidth,
		height: fullHeight,
	});
	const perspRenderer = new EASEL.Renderer({
		width: halfWidth,
		height: fullHeight,
	});

	let { scene: orthoScene, mesh: orthoMesh } = createScene(segments);
	let { scene: perspScene, mesh: perspMesh } = createScene(segments);

	const ctx = canvas.getContext("2d");
	ctx.imageSmoothingEnabled = false;

	const clock = new EASEL.Clock();
	let animId;
	let elapsed = 0;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		elapsed += dt;

		const wobbleAngle = 0.4;
		orthoMesh.rotation.x = Math.sin(elapsed * 0.8) * wobbleAngle;
		orthoMesh.rotation.y = Math.sin(elapsed * 0.5) * wobbleAngle;
		perspMesh.rotation.x = orthoMesh.rotation.x;
		perspMesh.rotation.y = orthoMesh.rotation.y;

		orthoRenderer.render(orthoScene, orthoCamera);
		perspRenderer.render(perspScene, perspCamera);

		// Composite both halves onto the main canvas
		const orthoCanvas = orthoRenderer.domElement;
		const perspCanvas = perspRenderer.domElement;
		if (orthoCanvas && perspCanvas) {
			ctx.drawImage(orthoCanvas, 0, 0);
			ctx.drawImage(perspCanvas, halfWidth, 0);
		}

		// Labels
		ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
		ctx.fillRect(0, 0, 120, 24);
		ctx.fillRect(halfWidth, 0, 120, 24);
		ctx.fillStyle = "#fff";
		ctx.font = "13px monospace";
		ctx.fillText("Orthographic", 8, 16);
		ctx.fillText("Perspective", halfWidth + 8, 16);
	}
	animate();

	return {
		update(newParams) {
			const seg = newParams.segments ?? 1;
			const result1 = createScene(seg);
			orthoScene = result1.scene;
			orthoMesh = result1.mesh;
			const result2 = createScene(seg);
			perspScene = result2.scene;
			perspMesh = result2.mesh;
		},
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
			orthoRenderer.dispose();
			perspRenderer.dispose();
		},
	};
}

export const source = `import {
  EASEL.Scene, EASEL.OrthographicCamera, EASEL.PerspectiveCamera, EASEL.Renderer, EASEL.Clock,
  EASEL.PlaneGeometry, EASEL.BasicMaterial, EASEL.Mesh, EASEL.CanvasTexture,
} from "easel";

// Split-view: orthographic (left) vs perspective (right).
// Orthographic produces exact UV mapping - no distortion.
// Perspective shows affine warping: the diagonal seam and texture
// swim from linear interpolation without W correction.
// Increase subdivisions to reduce the artifact.

const orthoCamera = new EASEL.OrthographicCamera({ ... });
const perspCamera = new EASEL.PerspectiveCamera({ fov: Math.PI / 3, aspect, ... });

const mesh = new EASEL.Mesh(
  new EASEL.PlaneGeometry(4, 4, segments, segments),
  new EASEL.BasicMaterial({ map: checkerTexture }),
);`;
