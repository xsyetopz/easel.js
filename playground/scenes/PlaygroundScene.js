import {
	Clock,
	OrbitControls,
	PerspectiveCamera,
	Renderer,
	Scene,
	Vector3,
} from "@/index.js";

export class PlaygroundScene {
	/** @type {Renderer} */
	#renderer;
	/** @type {Scene} */
	#scene;
	/** @type {PerspectiveCamera} */
	#camera;
	/** @type {OrbitControls} */
	#controls;
	/** @type {Clock} */
	#clock;
	/** @type {object|null} */
	#activeZone = null;
	/** @type {number|undefined} */
	#animId;
	/** @type {HTMLCanvasElement} */
	#canvas;
	/**
	 * @param {HTMLCanvasElement} canvas
	 * @param {{ onStatsUpdate?: (stats: {fps: number, triangles: number}) => void }} [options]
	 */
	constructor(canvas, { onStatsUpdate: _onStatsUpdate } = {}) {
		this.#canvas = canvas;
		const width = canvas.width;
		const height = canvas.height;

		this.#scene = new Scene();
		this.#camera = new PerspectiveCamera({
			fov: Math.PI / 4,
			aspect: width / height,
			near: 0.1,
			far: 100,
		});
		this.#camera.position.set(5, 3, 8);
		this.#camera.lookAt(new Vector3(0, 0, 0));

		this.#controls = new OrbitControls(this.#camera, canvas);
		this.#controls.enableDamping = true;
		this.#controls.dampingFactor = 0.12;
		this.#controls.rotateSpeed = 0.5;
		this.#controls.zoomSpeed = 0.7;
		this.#controls.panSpeed = 0.5;

		this.#renderer = new Renderer({ canvas, width, height });
		this.#clock = new Clock();
	}

	/** @returns {Scene} */
	get scene() {
		return this.#scene;
	}

	/** @returns {PerspectiveCamera} */
	get camera() {
		return this.#camera;
	}

	/**
	 * Tear down the current zone, clear the scene, and activate a new zone.
	 * Returns the control definitions from the new zone.
	 *
	 * @param {{ setup: (scene: Scene, camera: PerspectiveCamera) => object }} zone
	 * @returns {Array<object>} control definitions
	 */
	switchZone(zone) {
		if (this.#activeZone) {
			this.#activeZone.dispose();
		}

		while (this.#scene.children.length > 0) {
			this.#scene.remove(this.#scene.children[0]);
		}

		this.#activeZone = zone.setup(this.#scene, this.#camera, this.#canvas);
		return this.#activeZone.controls ?? [];
	}

	/**
	 * Forward updated params to the active zone.
	 * @param {Record<string, unknown>} params
	 */
	updateParams(params) {
		this.#activeZone?.update(params);
	}

	/** Start the render loop. */
	start() {
		const animate = () => {
			this.#animId = requestAnimationFrame(animate);
			const dt = this.#clock.delta;
			this.#controls.update();
			this.#activeZone?.animate(dt);
			this.#renderer.render(this.#scene, this.#camera);
		};
		animate();
	}

	/** Stop the render loop without disposing. */
	stop() {
		if (this.#animId !== undefined) {
			cancelAnimationFrame(this.#animId);
			this.#animId = undefined;
		}
	}

	/** Stop the render loop and dispose the active zone. */
	dispose() {
		this.stop();
		this.#controls.dispose();
		this.#activeZone?.dispose();
		this.#activeZone = null;
	}
}
