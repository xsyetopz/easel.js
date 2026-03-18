import {
	AmbientLight,
	AnimationClip,
	Animator,
	BoxGeometry,
	Clock,
	DirectionalLight,
	LambertMaterial,
	Mesh,
	PerspectiveCamera,
	Renderer,
	Scene,
	VectorTrack,
} from "@/index.js";

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

	const scene = new Scene();
	const camera = new PerspectiveCamera({
		fov: Math.PI / 4,
		aspect: width / height,
		near: 0.1,
		far: 100,
	});
	camera.position.set(0, 2, 8);

	const renderer = new Renderer({ canvas, width, height });

	scene.add(new AmbientLight(0xffffff, 0.4));
	const dirLight = new DirectionalLight(0xffffff, 0.8);
	dirLight.position.set(4, 6, 5);
	scene.add(dirLight);

	const box = new Mesh(
		new BoxGeometry(1.2, 1.2, 1.2),
		new LambertMaterial({ color: 0x5080e0 }),
	);
	scene.add(box);

	const posTrack = new VectorTrack(
		"position",
		[0, 1, 2, 3, 4],
		[0, 0, 0, 2, 1, 0, 0, 2, 0, -2, 1, 0, 0, 0, 0],
		3,
	);

	const scaleTrack = new VectorTrack(
		"scale",
		[0, 2, 4],
		[1, 1, 1, 1.5, 0.5, 1.5, 1, 1, 1],
		3,
	);

	const clip = new AnimationClip("bounce", -1, [posTrack, scaleTrack]);
	const animator = new Animator(box);
	const action = animator.clipAction(clip);
	action.timeScale = params.timeScale ?? 1;
	action.play();

	const clock = new Clock();
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
  Scene, PerspectiveCamera, Renderer, Clock,
  AmbientLight, DirectionalLight,
  BoxGeometry, LambertMaterial, Mesh,
  AnimationClip, Animator, VectorTrack,
} from "easel";

// VectorTrack(property, times[], values[], itemSize)
const posTrack = new VectorTrack(
  "position",
  [0, 1, 2, 3, 4],
  [0,0,0, 2,1,0, 0,2,0, -2,1,0, 0,0,0],
  3,
);
const scaleTrack = new VectorTrack(
  "scale",
  [0, 2, 4],
  [1,1,1, 1.5,0.5,1.5, 1,1,1],
  3,
);

const clip = new AnimationClip("bounce", -1, [posTrack, scaleTrack]);
const animator = new Animator(box);
const action = animator.clipAction(clip);
action.play();

// In animate loop:
animator.update(dt);`;
