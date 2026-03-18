import { FogCuller } from "../pipeline/FogCuller.js";
import { Framebuffer } from "../pipeline/framebuffer/Framebuffer.js";
import { FramebufferClear } from "../pipeline/framebuffer/FramebufferClear.js";
import { FramebufferUpload } from "../pipeline/framebuffer/FramebufferUpload.js";
import { PainterSort } from "../pipeline/PainterSort.js";
import { PixelWriter } from "../pipeline/PixelWriter.js";
import { Rasterizer } from "../pipeline/rasterizer/Rasterizer.js";
import { SceneTraversal } from "../pipeline/SceneTraversal.js";
import { LightBaker } from "../pipeline/shading/LightBaker.js";

export class Renderer {
	#width;
	#height;

	#canvas;
	#context;
	#framebuffer;

	#traversal;
	#fogCuller;
	#painterSort;
	#lightBaker;
	#rasterizer;
	#pixelWriter;

	/** @type {number} */
	#pixelRatio = 1;

	#clearColor = { r: 0, g: 0, b: 0 };
	#clear;
	#upload;

	/**
	 * @param {{ width?: number, height?: number, canvas?: HTMLCanvasElement, pixelRatio?: number }} [options]
	 */
	constructor(options = {}) {
		const {
			width = 300,
			height = 150,
			canvas = null,
			pixelRatio = 1,
		} = options;

		this.#width = width;
		this.#height = height;
		this.#pixelRatio = pixelRatio;

		if (canvas) {
			this.#canvas = canvas;
		} else if (typeof document === "undefined") {
			this.#canvas = null;
		} else {
			this.#canvas = document.createElement("canvas");
		}

		if (this.#canvas) {
			this.#canvas.width = width;
			this.#canvas.height = height;
			this.#context = this.#canvas.getContext("2d");
		}

		this.#framebuffer = new Framebuffer(width, height);

		this.#traversal = new SceneTraversal();
		this.#fogCuller = new FogCuller();
		this.#painterSort = new PainterSort();
		this.#lightBaker = new LightBaker();
		this.#rasterizer = new Rasterizer();
		this.#pixelWriter = new PixelWriter();
		this.#clear = new FramebufferClear();
		this.#upload = new FramebufferUpload();
	}

	/** @returns {HTMLCanvasElement|null} */
	get domElement() {
		return this.#canvas;
	}

	/** @returns {number} */
	get width() {
		return this.#width;
	}

	/** @returns {number} */
	get height() {
		return this.#height;
	}

	/** @returns {number} */
	get pixelRatio() {
		return this.#pixelRatio;
	}

	/**
	 * Renders a scene from a camera's perspective.
	 * @param {{ children: *, visible: boolean, fog?: import('../scenes/Fog.js').Fog, lights?: * }} scene
	 * @param {{ matrixWorldInverse: *, projectionMatrix: *, updateMatrixWorld: () => void, position: { x: number, y: number, z: number } }} camera
	 * @returns {void}
	 */
	render(scene, camera) {
		// 1. Clear framebuffer
		this.#clear.clear(
			this.#framebuffer,
			this.#clearColor.r,
			this.#clearColor.g,
			this.#clearColor.b,
		);

		// 2. Scene traversal → DrawList
		const drawList = this.#traversal.traverse(scene, camera);

		// 3. Fog culling
		if (scene.fog) {
			this.#fogCuller.cull(drawList, scene.fog, camera.position);
		}

		// 4. Painter's sort
		this.#painterSort.sort(drawList, camera.position);

		// 5. Light baking + 6. Rasterize per draw call
		const lights = scene.lights ?? [];
		const fb = this.#framebuffer;
		const pw = this.#pixelWriter;
		/**
		 * @param {number} x
		 * @param {number} y
		 * @param {unknown} r
		 * @param {unknown} g
		 * @param {unknown} b
		 * @param {unknown} a
		 */
		const writePixel = (x, y, r, g, b, a) =>
			pw.write(
				fb,
				x,
				y,
				/** @type {number} */ (r),
				/** @type {number} */ (g),
				/** @type {number} */ (b),
				/** @type {number} */ (a),
			);
		for (const drawCall of drawList) {
			this.#lightBaker.bake(/** @type {*} */ (drawCall), lights);
			this.#rasterizer.rasterize(
				/** @type {*} */ (drawCall),
				fb,
				null,
				writePixel,
			);
		}

		// 7. Upload to canvas
		if (this.#context) {
			this.#upload.upload(this.#framebuffer, this.#context);
		}
	}

	/**
	 * @param {number} width
	 * @param {number} height
	 * @returns {void}
	 */
	setSize(width, height) {
		this.#width = width;
		this.#height = height;
		this.#framebuffer.resize(width, height);
		if (this.#canvas) {
			this.#canvas.width = width;
			this.#canvas.height = height;
		}
	}

	/**
	 * @param {number} ratio
	 * @returns {void}
	 */
	setPixelRatio(ratio) {
		this.#pixelRatio = ratio;
	}

	/**
	 * @param {number} r
	 * @param {number} g
	 * @param {number} b
	 * @returns {void}
	 */
	setClearColor(r, g, b) {
		this.#clearColor.r = r;
		this.#clearColor.g = g;
		this.#clearColor.b = b;
	}

	/** @returns {void} */
	dispose() {
		if (this.#canvas && !this.#canvas.isConnected) {
			this.#canvas = null;
		}
		this.#context = null;
	}
}
