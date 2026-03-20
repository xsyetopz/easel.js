import { Color } from "../math/Color.js";
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
	 * @param {{ children: *, visible: boolean, fog?: *, lights?: *, background?: Color|number|undefined }} scene
	 * @param {{ matrixWorldInverse: *, projectionMatrix: *, updateMatrixWorld: () => void, position: { x: number, y: number, z: number } }} camera
	 * @returns {void}
	 */
	render(scene, camera) {
		// 0. Mark auto-updating CanvasTextures dirty before the pipeline runs
		this.#refreshAutoUpdateTextures(scene);

		// 1. Clear framebuffer + depth buffer
		// Priority: fog color > scene.background > #clearColor
		const fog = scene.fog;
		let clearR;
		let clearG;
		let clearB;
		if (fog) {
			clearR = Math.round(fog.color.r * 255);
			clearG = Math.round(fog.color.g * 255);
			clearB = Math.round(fog.color.b * 255);
		} else if (scene.background === undefined) {
			clearR = this.#clearColor.r;
			clearG = this.#clearColor.g;
			clearB = this.#clearColor.b;
		} else {
			const bg = scene.background;
			if (typeof bg === "object" && bg !== null) {
				// Color instance — channels are in [0, 1]
				clearR = Math.round(bg.r * 255);
				clearG = Math.round(bg.g * 255);
				clearB = Math.round(bg.b * 255);
			} else {
				// Hex number e.g. 0xff8800
				const hex = /** @type {number} */ (bg);
				clearR = (hex >> 16) & 0xff;
				clearG = (hex >> 8) & 0xff;
				clearB = hex & 0xff;
			}
		}
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
	 * Sets the clear color used when no fog or scene.background is present.
	 *
	 * Overloads:
	 * - `setClearColor(color: Color)` — Color instance with .r/.g/.b in [0, 1]
	 * - `setClearColor(hex: number)` — packed hex e.g. `0xff0000`
	 * - `setClearColor(r, g, b)` — three 0–255 integers (legacy)
	 *
	 * @param {Color|number} rOrColor
	 * @param {number} [g]
	 * @param {number} [b]
	 * @returns {void}
	 */
	setClearColor(rOrColor, g, b) {
		if (rOrColor instanceof Color) {
			this.#clearColor.r = Math.round(rOrColor.r * 255);
			this.#clearColor.g = Math.round(rOrColor.g * 255);
			this.#clearColor.b = Math.round(rOrColor.b * 255);
		} else if (g === undefined && b === undefined) {
			// Single number — treat as packed hex
			const hex = rOrColor;
			this.#clearColor.r = (hex >> 16) & 0xff;
			this.#clearColor.g = (hex >> 8) & 0xff;
			this.#clearColor.b = hex & 0xff;
		} else {
			this.#clearColor.r = /** @type {number} */ (rOrColor);
			this.#clearColor.g = /** @type {number} */ (g);
			this.#clearColor.b = /** @type {number} */ (b);
		}
	}

	/**
	 * Walks the scene graph and, for any texture with `autoUpdate` enabled,
	 * calls `map.update()` (so VideoTexture can gate on readyState) or falls
	 * back to setting `needsUpdate = true` directly.
	 * @param {{ children: Array<*>, material?: { map?: { autoUpdate?: boolean, update?: () => void, needsUpdate: boolean } } }} node
	 * @returns {void}
	 */
	#refreshAutoUpdateTextures(node) {
		if (node.material?.map?.autoUpdate) {
			const map = node.material.map;
			if (typeof map.update === "function") {
				map.update();
			} else {
				map.needsUpdate = true;
			}
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
