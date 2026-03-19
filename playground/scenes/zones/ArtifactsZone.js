import * as EASEL from "@/index.js";

/**
 * Artifacts Museum zone - affine warping, vertex wobble, 9-step opacity, painter's sort.
 *
 * @param {EASEL.Scene} scene
 * @param {EASEL.PerspectiveCamera} camera
 * @param {HTMLCanvasElement} _canvas
 * @returns {{ controls: Array<object>, animate: (dt: number) => void, update: (params: Record<string, unknown>) => void, dispose: () => void }}
 */
export function setup(scene, camera, _canvas) {
	camera.position.set(0, 3, 14);
	camera.lookAt(new EASEL.Vector3(0, 0, 0));

	const ambient = new EASEL.AmbientLight(0xffffff, 0.4);
	scene.add(ambient);

	const sun = new EASEL.DirectionalLight(0xffffff, 0.7);
	sun.position.set(4, 6, 5);
	scene.add(sun);

	const affineMat1 = new EASEL.BasicMaterial({ color: 0xcccccc });
	const affineBox1 = new EASEL.Mesh(
		new EASEL.BoxGeometry(1.2, 1.2, 1.2),
		affineMat1,
	);
	affineBox1.position.set(-6.8, 0, 0);
	scene.add(affineBox1);

	const affineMat2 = new EASEL.BasicMaterial({ color: 0xcccccc });
	const affineBox2 = new EASEL.Mesh(
		new EASEL.BoxGeometry(1.2, 1.2, 1.2),
		affineMat2,
	);
	affineBox2.position.set(-5.2, 0, 0);
	affineBox2.rotation.y = Math.PI / 5;
	scene.add(affineBox2);

	const loader = new EASEL.TextureLoader();
	loader.load("textures/Brick_01.png", (tex) => {
		affineMat1.map = tex;
		affineMat1.color = 0xffffff;
		affineMat2.map = tex;
		affineMat2.color = 0xffffff;
	});

	const affineBoxes = [affineBox1, affineBox2];

	const wobbleMat = new EASEL.BasicMaterial({ color: 0x44aaff });
	const wobbleSphere = new EASEL.Mesh(
		new EASEL.SphereGeometry(0.7, 8, 6),
		wobbleMat,
	);
	wobbleSphere.position.set(-2, 0, 0);
	scene.add(wobbleSphere);

	const bgMat = new EASEL.BasicMaterial({
		color: 0xff8800,
		side: EASEL.Side.Double,
	});
	const bgPlane = new EASEL.Mesh(new EASEL.PlaneGeometry(3.6, 1.4), bgMat);
	bgPlane.position.set(2, 0, -0.05);
	scene.add(bgPlane);

	/** @type {EASEL.Mesh[]} */
	const opacityBoxes = [];
	for (let step = 0; step <= 8; step++) {
		const mat = new EASEL.BasicMaterial({ color: 0x2255dd, opacity: step });
		const box = new EASEL.Mesh(new EASEL.BoxGeometry(0.3, 0.7, 0.1), mat);
		box.position.set(2 + (step - 4) * 0.4, 0, 0);
		scene.add(box);
		opacityBoxes.push(box);
	}

	const planeMatA = new EASEL.BasicMaterial({
		color: 0xee4444,
		side: EASEL.Side.Double,
	});
	const planeA = new EASEL.Mesh(new EASEL.PlaneGeometry(1.4, 1.8), planeMatA);
	planeA.position.set(6, 0, 0);
	planeA.rotation.y = Math.PI / 4;
	scene.add(planeA);

	const planeMatB = new EASEL.BasicMaterial({
		color: 0x44ee44,
		side: EASEL.Side.Double,
	});
	const planeB = new EASEL.Mesh(new EASEL.PlaneGeometry(1.4, 1.8), planeMatB);
	planeB.position.set(6, 0, 0);
	planeB.rotation.y = -Math.PI / 4;
	scene.add(planeB);

	let time = 0;

	return {
		controls: [],

		/**
		 * @param {number} dt
		 */
		animate(dt) {
			time += dt;

			for (const box of affineBoxes) {
				box.rotation.y += 0.4 * dt;
			}

			// Fixed slow oscillation to demonstrate integer vertex snapping artifact.
			wobbleSphere.position.x = -2 + Math.sin(time * 0.3) * 0.02;
		},

		update() {
			// No dynamic updates in this scene, all animation is time-based.
		},

		dispose() {
			affineMat1.dispose?.();
			affineMat2.dispose?.();
			wobbleMat.dispose?.();
			bgMat.dispose?.();
			planeMatA.dispose?.();
			planeMatB.dispose?.();
			for (const box of [
				...affineBoxes,
				wobbleSphere,
				bgPlane,
				...opacityBoxes,
				planeA,
				planeB,
			]) {
				box.geometry.dispose?.();
				box.material.dispose?.();
			}
		},
	};
}
