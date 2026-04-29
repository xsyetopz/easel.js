import { Color } from "../math/Color.ts";
import { FogCuller } from "../pipeline/FogCuller.ts";
import { Framebuffer } from "../pipeline/framebuffer/Framebuffer.ts";
import { FramebufferClear } from "../pipeline/framebuffer/FramebufferClear.ts";
import { FramebufferUpload } from "../pipeline/framebuffer/FramebufferUpload.ts";
import { PainterSort } from "../pipeline/PainterSort.ts";
import { Rasterizer } from "../pipeline/rasterizer/Rasterizer.ts";
import { SceneTraversal } from "../pipeline/SceneTraversal.ts";
import { LightBaker } from "../pipeline/shading/LightBaker.ts";

interface RendererOptions {
	width?: number;
	height?: number;
	canvas?: HTMLCanvasElement;
	pixelRatio?: number;
	sortObjects?: boolean;
}

interface FogLike {
	near: number;
	far: number;
	color: { r: number; g: number; b: number };
}

interface SceneLike {
	children: SceneNodeLike[];
	visible: boolean;
	fog?: FogLike | undefined;
	lights?: unknown;
	background?: Color | number | undefined;
	autoUpdate?: boolean;
}

interface SceneNodeLike {
	children: SceneNodeLike[];
	material?: {
		map?: {
			autoUpdate?: boolean;
			update?: () => void;
			needsUpdate: boolean;
		};
	};
}

interface CameraLike {
	matrixWorldInverse: { elements: Float32Array };
	projectionMatrix: { elements: Float32Array };
	updateMatrixWorld: () => void;
	position: { x: number; y: number; z: number };
}

export interface RenderTimings {
	clearMs?: number;
	traversalMs?: number;
	fogCullMs?: number;
	sortMs?: number;
	shadeRasterMs?: number;
	uploadMs?: number;
	totalMs?: number;
	// Optional detailed traversal breakdown (enabled by setting timings.profileTraversal = true).
	profileTraversal?: boolean;
	travUpdateWorldMs?: number;
	travWalkMs?: number;
	travProjectMs?: number;
	travAssembleMs?: number;
	travDrawCalls?: number;
}

/** Canvas2D software renderer orchestrating the full pipeline. */
export class Renderer {
	#width: number;
	#height: number;

	#canvas: HTMLCanvasElement | undefined;
	#context: CanvasRenderingContext2D | undefined;
	#framebuffer: Framebuffer;

	#traversal: SceneTraversal;
	#fogCuller: FogCuller;
	#painterSort: PainterSort;
	#lightBaker: LightBaker;
	#rasterizer: Rasterizer;

	#pixelRatio = 1;
	sortObjects = true;

	#clearColor = { r: 0, g: 0, b: 0 };
	#clear: FramebufferClear;
	#upload: FramebufferUpload;

	constructor(options: RendererOptions = {}) {
		const {
			width = 300,
			height = 150,
			canvas = undefined,
			pixelRatio = 1,
			sortObjects = true,
		} = options;

		this.#width = width;
		this.#height = height;
		this.#pixelRatio = pixelRatio;
		this.sortObjects = sortObjects;

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
			this.#context = this.#canvas.getContext("2d") ?? undefined;
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

	get domElement(): HTMLCanvasElement | undefined {
		return this.#canvas;
	}

	get width(): number {
		return this.#width;
	}

	get height(): number {
		return this.#height;
	}

	get pixelRatio(): number {
		return this.#pixelRatio;
	}

	/** Renders a scene from a camera's perspective. */
	render(scene: SceneLike, camera: CameraLike, timings?: RenderTimings): void {
		if (timings) {
			const perf = globalThis.performance;
			const now =
				typeof perf?.now === "function" ? perf.now.bind(perf) : Date.now;
			const t0 = now();

			// 0. Mark auto-updating CanvasTextures dirty before the pipeline runs
			this.#refreshAutoUpdateTextures(scene as unknown as SceneNodeLike);

			const tTex = now();

			// 1. Clear framebuffer + depth buffer
			const fog = scene.fog;
			let clearR: number;
			let clearG: number;
			let clearB: number;
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
					clearR = Math.round(bg.r * 255);
					clearG = Math.round(bg.g * 255);
					clearB = Math.round(bg.b * 255);
				} else {
					const hex = bg as number;
					clearR = (hex >> 16) & 0xff;
					clearG = (hex >> 8) & 0xff;
					clearB = hex & 0xff;
				}
			}
			this.#clear.clear(this.#framebuffer, clearR, clearG, clearB);
			this.#framebuffer.depthBuffer.clear();

			const tClear = now();

			// 2. Scene traversal -> DrawList
			const drawList = this.#traversal.traverse(
				scene as never,
				camera as never,
				this.#width,
				this.#height,
				timings,
			);

			const tTrav = now();

			// 3. Fog culling
			if (scene.fog) {
				this.#fogCuller.cull(
					drawList,
					scene.fog as never,
					camera.position as never,
				);
			}

			const tFogCull = now();

			// 4. Painter's sort
			this.#painterSort.sort(drawList, camera.position, this.sortObjects);

			const tSort = now();

			// 5. Light baking + 6. Rasterize per draw call
			const lights = drawList.lights;
			const fb = this.#framebuffer;
			const fogColor = fog ? fog.color : undefined;
			for (const drawCall of drawList) {
				this.#lightBaker.bake(drawCall as never, lights);
				this.#rasterizer.rasterize(
					drawCall as never,
					fb as never,
					undefined,
					fogColor,
				);
			}

			const tShadeRaster = now();

			// 7. Upload to canvas
			if (this.#context) {
				this.#upload.upload(this.#framebuffer, this.#context);
			}

			const tUpload = now();

			timings.clearMs = tClear - tTex;
			timings.traversalMs = tTrav - tClear;
			timings.fogCullMs = tFogCull - tTrav;
			timings.sortMs = tSort - tFogCull;
			timings.shadeRasterMs = tShadeRaster - tSort;
			timings.uploadMs = tUpload - tShadeRaster;
			timings.totalMs = tUpload - t0;
			return;
		}

		// 0. Mark auto-updating CanvasTextures dirty before the pipeline runs
		this.#refreshAutoUpdateTextures(scene as unknown as SceneNodeLike);

		// 1. Clear framebuffer + depth buffer
		const fog = scene.fog;
		let clearR: number;
		let clearG: number;
		let clearB: number;
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
				clearR = Math.round(bg.r * 255);
				clearG = Math.round(bg.g * 255);
				clearB = Math.round(bg.b * 255);
			} else {
				const hex = bg as number;
				clearR = (hex >> 16) & 0xff;
				clearG = (hex >> 8) & 0xff;
				clearB = hex & 0xff;
			}
		}
		this.#clear.clear(this.#framebuffer, clearR, clearG, clearB);
		this.#framebuffer.depthBuffer.clear();

		// 2. Scene traversal -> DrawList
		const drawList = this.#traversal.traverse(
			scene as never,
			camera as never,
			this.#width,
			this.#height,
		);

		// 3. Fog culling
		if (scene.fog) {
			this.#fogCuller.cull(
				drawList,
				scene.fog as never,
				camera.position as never,
			);
		}

		// 4. Painter's sort
		this.#painterSort.sort(drawList, camera.position, this.sortObjects);

		// 5. Light baking + 6. Rasterize per draw call
		const lights = drawList.lights;
		const fb = this.#framebuffer;
		const fogColor = fog ? fog.color : undefined;
		for (const drawCall of drawList) {
			this.#lightBaker.bake(drawCall as never, lights);
			this.#rasterizer.rasterize(
				drawCall as never,
				fb as never,
				undefined,
				fogColor,
			);
		}

		// 7. Upload to canvas
		if (this.#context) {
			this.#upload.upload(this.#framebuffer, this.#context);
		}
	}

	setSize(width: number, height: number): void {
		this.#width = width;
		this.#height = height;
		this.#framebuffer.resize(width, height);
		if (this.#canvas) {
			this.#canvas.width = width;
			this.#canvas.height = height;
		}
	}

	setPixelRatio(ratio: number): void {
		this.#pixelRatio = ratio;
	}

	/**
	 * Sets the clear color used when no fog or scene.background is present.
	 *
	 * Overloads:
	 * - `setClearColor(color: Color)` -- Color instance with .r/.g/.b in [0, 1]
	 * - `setClearColor(hex: number)` -- packed hex e.g. `0xff0000`
	 * - `setClearColor(r, g, b)` -- three 0-255 integers (legacy)
	 */
	setClearColor(rOrColor: Color | number, g?: number, b?: number): void {
		if (rOrColor instanceof Color) {
			this.#clearColor.r = Math.round(rOrColor.r * 255);
			this.#clearColor.g = Math.round(rOrColor.g * 255);
			this.#clearColor.b = Math.round(rOrColor.b * 255);
		} else if (g === undefined && b === undefined) {
			const hex = rOrColor;
			this.#clearColor.r = (hex >> 16) & 0xff;
			this.#clearColor.g = (hex >> 8) & 0xff;
			this.#clearColor.b = hex & 0xff;
		} else {
			this.#clearColor.r = rOrColor;
			this.#clearColor.g = g as number;
			this.#clearColor.b = b as number;
		}
	}

	/**
	 * Walks the scene graph and, for texture with `autoUpdate` enabled,
	 * calls `map.update()` or sets `needsUpdate = true`.
	 */
	#refreshAutoUpdateTextures(node: SceneNodeLike): void {
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

	dispose(): void {
		if (this.#canvas && !this.#canvas.isConnected) {
			this.#canvas = undefined;
		}
		this.#context = undefined;
	}
}
