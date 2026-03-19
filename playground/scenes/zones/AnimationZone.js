import * as EASEL from "@/index.js";

/**
 * Animation Stage zone - bouncing, scaling box driven by the Animator/AnimationClip API.
 *
 * @param {EASEL.Scene} scene
 * @param {EASEL.PerspectiveCamera} camera
 * @param {HTMLCanvasElement} _canvas
 * @returns {{ controls: Array<object>, animate: (dt: number) => void, update: (params: Record<string, unknown>) => void, dispose: () => void }}
 */
export function setup(scene, camera, _canvas) {
	camera.position.set(4, 3, 6);
	camera.lookAt(new EASEL.Vector3(0, 0, 0));

	const ambient = new EASEL.AmbientLight(0xffffff, 0.3);
	scene.add(ambient);

	const sun = new EASEL.DirectionalLight(0xffffff, 0.7);
	sun.position.set(3, 5, 4);
	scene.add(sun);

	const box = new EASEL.Mesh(
		new EASEL.BoxGeometry(1.5, 1.5, 1.5),
		new EASEL.LambertMaterial({ color: 0x4488cc }),
	);
	scene.add(box);

	// Bounce: position.y keyframes [0 → 3 → 0] over 1 second
	const posTrack = new EASEL.VectorTrack(
		"position",
		[0, 0.5, 1],
		[0, 0, 0, 0, 3, 0, 0, 0, 0],
	);

	// Scale pulse: squash on way up, restore on way down
	const scaleTrack = new EASEL.VectorTrack(
		"scale",
		[0, 0.5, 1],
		[1, 1, 1, 1.3, 0.7, 1.3, 1, 1, 1],
	);

	const clip = new EASEL.AnimationClip("bounce", 1, [posTrack, scaleTrack]);
	const animator = new EASEL.Animator(box);
	const action = animator.clipAction(clip);
	action.setLoop(EASEL.LoopRepeat, Number.POSITIVE_INFINITY);
	action.play();

	return {
		controls: [
			{
				type: "slider",
				key: "timeScale",
				label: "Speed",
				min: 0.1,
				max: 3,
				step: 0.1,
				default: 1,
			},
		],

		/**
		 * @param {number} dt
		 */
		animate(dt) {
			animator.update(dt);
		},

		/**
		 * @param {{ timeScale?: number }} params
		 */
		update(params) {
			if (params.timeScale !== undefined) {
				action.timeScale = /** @type {number} */ (params.timeScale);
			}
		},

		dispose() {
			animator.stopAllAction();
			box.geometry.dispose?.();
			box.material.dispose?.();
		},
	};
}
