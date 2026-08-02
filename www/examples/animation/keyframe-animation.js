import * as EASEL from "@/index.js";

export const meta = {
	id: "keyframe-animation",
	name: "Keyframe Animation",
	category: "animation",
	description:
		"AnimationClip with VectorTracks drives position and scale. action.timeScale controls playback speed.",
};

export const controls = [
	{
		type: "slider",
		key: "speed",
		label: "Speed",
		min: 0.1,
		max: 3,
		step: 0.1,
		default: 1,
	},
];

export function setup(canvas, params = {}) {
	const width = canvas.width;
	const height = canvas.height;

	const scene = new EASEL.Scene();
	const camera = new EASEL.PerspectiveCamera({
		fov: 45,
		aspect: width / height,
		near: 0.1,
		far: 100,
	});
	camera.position.set(0, 2, 8);
	camera.lookAt(new EASEL.Vector3(0, 0, 0));

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
		[0, 0.5, 1],
		[0, 0, 0, 0, 3, 0, 0, 0, 0],
		3,
	);
	const scaleTrack = new EASEL.VectorTrack(
		"scale",
		[0, 0.5, 1],
		[1.2, 0.7, 1.2, 0.8, 1.4, 0.8, 1.2, 0.7, 1.2],
		3,
	);

	const clip = new EASEL.AnimationClip("bounce", 1, [posTrack, scaleTrack]);
	const animator = new EASEL.Animator(box);
	const action = animator.clipAction(clip);
	action.setLoop(EASEL.LoopRepeat, Number.POSITIVE_INFINITY);
	action.timeScale = params.speed ?? 1;
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
			if (newParams.speed !== undefined) {
				action.timeScale = newParams.speed;
			}
		},
	};
}

export const easelSource = `import * as EASEL from "easel";

const posTrack = new EASEL.VectorTrack(
  "position",
  [0,   0.5,   1  ],
  [0,0,0,  0,3,0,  0,0,0],
  3,
);

const scaleTrack = new EASEL.VectorTrack(
  "scale",
  [0,     0.5,     1  ],
  [1.2,0.7,1.2,  0.8,1.4,0.8,  1.2,0.7,1.2],
  3,
);

const clip     = new EASEL.AnimationClip("bounce", 1, [posTrack, scaleTrack]);
const animator = new EASEL.Animator(box);
const action   = animator.clipAction(clip);
action.setLoop(EASEL.LoopRepeat, Infinity);
action.timeScale = speed;
action.play();

animator.update(dt);`;

export const threeSource = `import * as THREE from "three";

const posTrack = new THREE.VectorKeyframeTrack(
  ".position",
  [0,   0.5,   1  ],
  [0,0,0,  0,3,0,  0,0,0],
);

const scaleTrack = new THREE.VectorKeyframeTrack(
  ".scale",
  [0,     0.5,     1  ],
  [1.2,0.7,1.2,  0.8,1.4,0.8,  1.2,0.7,1.2],
);

const clip   = new THREE.AnimationClip("bounce", 1, [posTrack, scaleTrack]);
const mixer  = new THREE.AnimationMixer(box);
const action = mixer.clipAction(clip);
action.setLoop(THREE.LoopRepeat, Infinity);
action.timeScale = speed;
action.play();

mixer.update(dt);`;
