import {
	AmbientLight,
	BasicMaterial,
	BoxGeometry,
	DirectionalLight,
	Mesh,
} from "@/index.js";

/**
 * Rotating box used while real zone implementations are pending.
 *
 * @param {import("@/index.js").Scene} scene
 * @param {import("@/index.js").PerspectiveCamera} camera
 * @returns {{ controls: Array<object>, animate: (dt: number) => void, update: (params: Record<string, unknown>) => void, dispose: () => void }}
 */
export function setup(scene, camera, _canvas) {
	camera.position.set(3, 2, 5);

	const ambient = new AmbientLight(0xffffff, 0.3);
	scene.add(ambient);

	const light = new DirectionalLight(0xffffff, 0.8);
	light.position.set(3, 5, 4);
	scene.add(light);

	const box = new Mesh(
		new BoxGeometry(1.5, 1.5, 1.5),
		new BasicMaterial({ color: 0x4488cc }),
	);
	scene.add(box);

	return {
		controls: [],
		animate(dt) {
			box.rotation.x += 0.5 * dt;
			box.rotation.y += 0.8 * dt;
		},
		update(_params) {
			// no-op: placeholder has no reactive params
		},
		dispose() {
			// no-op: placeholder allocates no external resources
		},
	};
}
