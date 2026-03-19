import * as EASEL from "@/index.js";

export const controls = [
	{
		type: "slider",
		key: "timeScale",
		label: "Time Scale",
		min: 0.1,
		max: 3,
		step: 0.05,
		default: 1,
	},
];

export function setup(canvas, params = {}) {
	const width = canvas.width;
	const height = canvas.height;

	const scene = new EASEL.Scene();
	const camera = new EASEL.PerspectiveCamera({
		fov: Math.PI / 4,
		aspect: width / height,
		near: 0.1,
		far: 100,
	});
	camera.position.set(0, 2, 8);

	const renderer = new EASEL.Renderer({ canvas, width, height });

	scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
	const dirLight = new EASEL.DirectionalLight(0xffffff, 0.8);
	dirLight.position.set(4, 6, 5);
	scene.add(dirLight);

	const box = new EASEL.Mesh(
		new EASEL.BoxGeometry(1.2, 1.2, 1.2),
		new EASEL.LambertMaterial({ color: 0x5080e0 }),
	);
	scene.add(box);

	const posTrack = new EASEL.VectorTrack(
		"position",
		[0, 1, 2, 3, 4],
		[0, 0, 0, 2, 1, 0, 0, 2, 0, -2, 1, 0, 0, 0, 0],
		3,
	);

	const scaleTrack = new EASEL.VectorTrack(
		"scale",
		[0, 2, 4],
		[1, 1, 1, 1.5, 0.5, 1.5, 1, 1, 1],
		3,
	);

	const clip = new EASEL.AnimationClip("bounce", -1, [posTrack, scaleTrack]);
	const animator = new EASEL.Animator(box);
	const action = animator.clipAction(clip);
	action.timeScale = params.timeScale ?? 1;
	action.play();

	const clock = new EASEL.Clock();
	let animId;

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		animator.update(dt);
		renderer.render(scene, camera);
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			if (newParams.timeScale !== undefined) {
				action.timeScale = newParams.timeScale;
			}
		},
	};
}

export const source = `import {
  EASEL.Scene, EASEL.PerspectiveCamera, EASEL.Renderer, EASEL.Clock,
  EASEL.AmbientLight, EASEL.DirectionalLight,
  EASEL.BoxGeometry, EASEL.LambertMaterial, EASEL.Mesh,
  EASEL.AnimationClip, EASEL.Animator, EASEL.VectorTrack,
} from "easel";

// EASEL.VectorTrack(property, times[], values[], itemSize)
const posTrack = new EASEL.VectorTrack(
  "position",
  [0, 1, 2, 3, 4],
  [0,0,0, 2,1,0, 0,2,0, -2,1,0, 0,0,0],
  3,
);
const scaleTrack = new EASEL.VectorTrack(
  "scale",
  [0, 2, 4],
  [1,1,1, 1.5,0.5,1.5, 1,1,1],
  3,
);

const clip = new EASEL.AnimationClip("bounce", -1, [posTrack, scaleTrack]);
const animator = new EASEL.Animator(box);
const action = animator.clipAction(clip);
action.play();

// In animate loop:
animator.update(dt);`;
