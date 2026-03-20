import { FogCuller } from "../pipeline/FogCuller.js";
import { Framebuffer } from "../pipeline/framebuffer/Framebuffer.js";
import { FramebufferClear } from "../pipeline/framebuffer/FramebufferClear.js";
import { FramebufferUpload } from "../pipeline/framebuffer/FramebufferUpload.js";
import { PainterSort } from "../pipeline/PainterSort.js";
import { Rasterizer } from "../pipeline/rasterizer/Rasterizer.js";
import { SceneTraversal } from "../pipeline/SceneTraversal.js";
import { LightBaker } from "../pipeline/shading/LightBaker.js";

/** Canvas2D software renderer orchestrating the full pipeline. */
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

	/** @type {number} */
	#pixelRatio = 1;

	#clearColor = { r: 0, g: 0, b: 0 };
	#clear;
	#upload;

	/** @type {(x: number, y: number, r: number, g: number, b: number, a: number) => void} */
	#writePixel;

	/**
	 * @param {{ width?: number, height?: number, canvas?: HTMLCanvasElement, pixelRatio?: number }} [options]
	 */
	constructor(options = {}) {
		const {
			width = 300,
			height = 150,
			canvas = undefined,
			pixelRatio = 1,
		} = options;

		this.#width = width;
		this.#height = height;
		this.#pixelRatio = pixelRatio;

		if (canvas) {
			this.#canvas = canvas;
		} else if (typeof document === "undefined") {
			this.#canvas = undefined;
		} else {
			this.#canvas = document.createElement("canvas");
		}

		if (this.#canvas) {
			this.#canvas.width = width;
			this.#canvas.height = height;
			this.#context = this.#canvas.getContext("2d");
			if (this.#context) {
				this.#context.imageSmoothingEnabled = false;
			}
		}

		this.#framebuffer = new Framebuffer(width, height);
		const fb = this.#framebuffer;
		this.#writePixel = (x, y, r, g, b, _a) => fb.setPixel(x, y, r, g, b, 255);

		this.#traversal = new SceneTraversal();
		this.#fogCuller = new FogCuller();
		this.#painterSort = new PainterSort();
		this.#lightBaker = new LightBaker();
		this.#rasterizer = new Rasterizer();
		this.#clear = new FramebufferClear();
		this.#upload = new FramebufferUpload();
	}

	/** @returns {HTMLCanvasElement|undefined} */
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
		// 0. Mark auto-updating CanvasTextures dirty before the pipeline runs
		this.#refreshAutoUpdateTextures(scene);

		// 1. Clear framebuffer + depth buffer (use fog color when present)
		const fog = scene.fog;
		const clearR = fog ? Math.round(fog.color.r * 255) : this.#clearColor.r;
		const clearG = fog ? Math.round(fog.color.g * 255) : this.#clearColor.g;
		const clearB = fog ? Math.round(fog.color.b * 255) : this.#clearColor.b;
		this.#clear.clear(this.#framebuffer, clearR, clearG, clearB);
		this.#framebuffer.depthBuffer.clear();

		// 2. Scene traversal → DrawList
		const drawList = this.#traversal.traverse(
			scene,
			camera,
			this.#width,
			this.#height,
		);

		// 3. Fog culling
		if (scene.fog) {
			this.#fogCuller.cull(drawList, scene.fog, camera.position);
		}

		// 4. Painter's sort
		this.#painterSort.sort(drawList, camera.position);

		// 5. Light baking + 6. Rasterize per draw call
		const lights = drawList.lights;
		const fb = this.#framebuffer;
		const fogColor = fog ? fog.color : undefined;
		for (const drawCall of drawList) {
			this.#lightBaker.bake(/** @type {*} */ (drawCall), lights);
			this.#rasterizer.rasterize(
				/** @type {*} */ (drawCall),
				fb,
				undefined,
				this.#writePixel,
				fogColor,
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

	/**
	 * Walks the scene graph and sets `needsUpdate = true` on any texture whose
	 * `autoUpdate` flag is enabled, so the rasterizer re-uploads it this frame.
	 * @param {{ children: Array<*>, material?: { map?: { autoUpdate?: boolean, needsUpdate: boolean } } }} node
	 * @returns {void}
	 */
	#refreshAutoUpdateTextures(node) {
		if (node.material?.map?.autoUpdate) {
			node.material.map.needsUpdate = true;
		}
		for (const child of node.children) {
			this.#refreshAutoUpdateTextures(child);
		}
	}

	/** @returns {void} */
	dispose() {
		if (this.#canvas && !this.#canvas.isConnected) {
			this.#canvas = undefined;
		}
		this.#context = undefined;
	}
}
